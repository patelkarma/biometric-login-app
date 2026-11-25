package com.biometric.backend.service;

import com.biometric.backend.model.OtpCode;
import com.biometric.backend.repository.OtpCodeRepository;
import com.biometric.backend.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Issues and checks 6-digit one-time codes.
 * - generated with SecureRandom, stored only as a salted SHA-256 hash
 * - expire after 5 minutes, max 5 wrong attempts, resend cooldown
 * - requesting a new code invalidates the previous one
 */
@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpCodeRepository repository;

    @Value("${app.otp.ttl-seconds}")
    private long ttlSeconds;
    @Value("${app.otp.max-attempts}")
    private int maxAttempts;
    @Value("${app.otp.resend-cooldown-seconds}")
    private long resendCooldownSeconds;

    @Transactional
    public String issue(String identifier, OtpCode.Purpose purpose) {
        repository.findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(identifier, purpose).ifPresent(last -> {
            long elapsed = Duration.between(last.getCreatedAt(), Instant.now()).getSeconds();
            if (elapsed < resendCooldownSeconds) {
                long wait = resendCooldownSeconds - elapsed;
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RESEND_TOO_SOON",
                        "Please wait " + wait + " seconds before requesting a new code.");
            }
        });

        // Only the newest code is valid.
        repository.findByIdentifierAndConsumedAtIsNull(identifier).forEach(old -> old.setConsumedAt(Instant.now()));

        String code = String.format("%06d", Crypto.RANDOM.nextInt(1_000_000));
        OtpCode otp = new OtpCode();
        otp.setIdentifier(identifier);
        otp.setPurpose(purpose);
        otp.setCodeHash(hash(identifier, code));
        otp.setExpiresAt(Instant.now().plusSeconds(ttlSeconds));
        repository.save(otp);
        return code;
    }

    /**
     * Runs in its own transaction and does not roll back on ApiException,
     * so a wrong guess is counted even though the caller's request fails.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ApiException.class)
    public void verify(String identifier, OtpCode.Purpose purpose, String code) {
        OtpCode otp = repository.findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(identifier, purpose)
                .filter(o -> o.getConsumedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID",
                        "This code is no longer valid. Please request a new one."));

        if (otp.getExpiresAt().isBefore(Instant.now())) {
            otp.setConsumedAt(Instant.now());
            throw new ApiException(HttpStatus.BAD_REQUEST, "CODE_EXPIRED",
                    "This code has expired. Please request a new one.");
        }

        if (!Crypto.constantTimeEquals(otp.getCodeHash(), hash(identifier, code))) {
            otp.setAttempts(otp.getAttempts() + 1);
            int left = maxAttempts - otp.getAttempts();
            if (left <= 0) {
                otp.setConsumedAt(Instant.now());
                throw new ApiException(HttpStatus.BAD_REQUEST, "CODE_LOCKED",
                        "Too many incorrect attempts. Please request a new code.");
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "CODE_INCORRECT",
                    "Incorrect code. " + left + (left == 1 ? " attempt" : " attempts") + " left.");
        }

        otp.setConsumedAt(Instant.now());
    }

    public long ttlSeconds() {
        return ttlSeconds;
    }

    public long resendCooldownSeconds() {
        return resendCooldownSeconds;
    }

    private static String hash(String identifier, String code) {
        return Crypto.sha256(identifier + ":" + code);
    }
}
