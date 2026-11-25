package com.biometric.backend.service;

import com.biometric.backend.dto.Dtos.*;
import com.biometric.backend.model.OtpCode;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.util.Crypto;
import com.biometric.backend.util.Identifiers;
import com.biometric.backend.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;

/** Sign-up and 6-digit-code login. */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MIN_AGE = 13;

    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;
    private final OtpService otpService;
    private final NotificationService notifications;
    private final SessionService sessionService;

    /** Creates (or refreshes an unfinished) account and sends a 6-digit code to verify the email / phone. */
    @Transactional
    public OtpSentResponse signup(SignupRequest req) {
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        validateDateOfBirth(req.dateOfBirth());

        User user = users.findByIdentifier(identifier).orElse(null);
        if (user != null && user.isVerified()) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_EXISTS",
                    "An account with this " + Identifiers.describe(identifier) + " already exists. Please sign in.");
        }
        if (user == null) {
            user = new User();
            user.setWebauthnUserHandle(Crypto.randomToken(32));
            user.setIdentifier(identifier);
        }
        user.setFirstName(req.firstName().trim());
        user.setSurname(req.surname().trim());
        user.setDateOfBirth(req.dateOfBirth());
        users.save(user);

        return sendCode(user, OtpCode.Purpose.SIGNUP);
    }

    /** Sends a login code. Unfinished sign-ups get a sign-up code instead, so they can finish verifying. */
    @Transactional
    public OtpSentResponse requestLoginCode(OtpRequest req) {
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        User user = users.findByIdentifier(identifier)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND",
                        "No account found with this " + Identifiers.describe(identifier) + ". Please sign up first."));
        return sendCode(user, purposeFor(user));
    }

    /** Checks the code and starts a session on this device (signing out any other device). */
    @Transactional
    public LoginResponse verifyCode(VerifyOtpRequest req) {
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        User user = users.findByIdentifier(identifier)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", "No account found. Please sign up first."));

        otpService.verify(identifier, purposeFor(user), req.code());

        user.setVerified(true);
        boolean hasPasskey = !passkeys.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty();
        return sessionService.startSession(user, req.deviceId(), req.deviceName(), "CODE")
                .toLoginResponse(user, hasPasskey);
    }

    private OtpSentResponse sendCode(User user, OtpCode.Purpose purpose) {
        String code = otpService.issue(user.getIdentifier(), purpose);
        NotificationService.Delivery delivery =
                notifications.sendCode(user.getContactType(), user.getIdentifier(), code, user.getFirstName());
        return new OtpSentResponse(
                user.getContactType(),
                user.getIdentifier(),
                Identifiers.mask(user.getIdentifier()),
                delivery.channel().name(),
                delivery.demoCode(),
                otpService.ttlSeconds(),
                otpService.resendCooldownSeconds());
    }

    private static OtpCode.Purpose purposeFor(User user) {
        return user.isVerified() ? OtpCode.Purpose.LOGIN : OtpCode.Purpose.SIGNUP;
    }

    private static void validateDateOfBirth(LocalDate dob) {
        LocalDate today = LocalDate.now();
        if (dob.isAfter(today)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOB", "Date of birth cannot be in the future.");
        }
        int age = Period.between(dob, today).getYears();
        if (age < MIN_AGE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOB", "You must be at least " + MIN_AGE + " years old to sign up.");
        }
        if (age > 120) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOB", "Please enter a valid date of birth.");
        }
    }
}
