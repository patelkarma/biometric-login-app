package com.biometric.backend.service;

import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.DeviceSessionRepository;
import com.biometric.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Enforces "one active device per user".
 *
 * Every successful login (6-digit code OR biometrics) goes through {@link #startSession}, which,
 * inside one transaction holding a lock on the user row, revokes every other active session
 * and then creates the new one. The old device's next request (or its 10-second heartbeat)
 * is answered with 401 SESSION_REVOKED and the UI tells the user they were signed in elsewhere.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    public record NewSession(String token, DeviceSession session, boolean replacedOtherDevice) {}

    private final DeviceSessionRepository sessions;
    private final UserRepository users;

    @Value("${app.session.ttl-days}")
    private long ttlDays;

    @Transactional
    public NewSession startSession(User user, String deviceId, String deviceName, String loginMethod) {
        users.lockById(user.getId());

        String safeDeviceName = sanitizeDeviceName(deviceName);
        boolean replacedOther = false;
        for (DeviceSession old : sessions.findByUserIdAndRevokedAtIsNull(user.getId())) {
            boolean sameDevice = old.getDeviceId().equals(deviceId);
            old.setRevokedAt(Instant.now());
            old.setRevokeReason(sameDevice ? DeviceSession.RevokeReason.LOGOUT : DeviceSession.RevokeReason.NEW_DEVICE_LOGIN);
            old.setReplacedByDevice(safeDeviceName);
            if (!sameDevice) {
                replacedOther = true;
                log.info("User {} signed in on '{}' - revoking session on '{}'", user.getId(), safeDeviceName, old.getDeviceName());
            }
        }

        String token = Crypto.randomToken(32);
        DeviceSession session = new DeviceSession();
        session.setUserId(user.getId());
        session.setTokenHash(Crypto.sha256(token));
        session.setDeviceId(deviceId == null || deviceId.isBlank() ? "unknown" : deviceId.substring(0, Math.min(64, deviceId.length())));
        session.setDeviceName(safeDeviceName);
        session.setLoginMethod(loginMethod);
        session.setExpiresAt(Instant.now().plus(Duration.ofDays(ttlDays)));
        sessions.save(session);
        return new NewSession(token, session, replacedOther);
    }

    @Transactional(readOnly = true)
    public Optional<DeviceSession> findByToken(String token) {
        return sessions.findByTokenHash(Crypto.sha256(token));
    }

    /** Updates "last seen", at most once a minute to avoid a DB write on every request. */
    @Transactional
    public void touch(Long sessionId) {
        sessions.findById(sessionId).ifPresent(s -> {
            if (Duration.between(s.getLastSeenAt(), Instant.now()).toSeconds() >= 60) {
                s.setLastSeenAt(Instant.now());
            }
        });
    }

    @Transactional
    public void revoke(Long sessionId, DeviceSession.RevokeReason reason) {
        sessions.findById(sessionId).ifPresent(s -> {
            if (s.getRevokedAt() == null) {
                s.setRevokedAt(Instant.now());
                s.setRevokeReason(reason);
            }
        });
    }

    @Transactional(readOnly = true)
    public DeviceSession get(Long sessionId) {
        return sessions.findById(sessionId).orElseThrow();
    }

    private static String sanitizeDeviceName(String name) {
        if (name == null || name.isBlank()) return "Unknown device";
        String clean = name.replaceAll("[\\p{Cntrl}<>]", "").trim();
        return clean.length() > 120 ? clean.substring(0, 120) : clean;
    }
}
