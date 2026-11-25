package com.biometric.backend.service;

import com.biometric.backend.config.AppProperties;
import com.biometric.backend.dto.Dtos.LoginResponse;
import com.biometric.backend.dto.Dtos.SessionDto;
import com.biometric.backend.dto.Dtos.UserDto;
import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.DeviceSessionRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.util.Crypto;
import com.biometric.backend.util.DeviceNames;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * and then creates the new one. The old device's next request (or its 5-second heartbeat)
 * is answered with 401 SESSION_REVOKED and the UI tells the user they were signed in elsewhere.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    /** Result of a login. The raw token exists only here; the database keeps its hash. */
    public record NewSession(String token, DeviceSession session, boolean replacedOtherDevice) {

        /** The response body shared by code login and biometric login. */
        public LoginResponse toLoginResponse(User user, boolean hasPasskey) {
            return new LoginResponse(token, UserDto.of(user), SessionDto.of(session), hasPasskey, replacedOtherDevice, false);
        }
    }

    private final DeviceSessionRepository sessions;
    private final UserRepository users;
    private final AppProperties properties;

    @Transactional
    public NewSession startSession(User user, String deviceId, String deviceName, String loginMethod) {
        users.lockById(user.getId());

        String safeDeviceName = DeviceNames.clean(deviceName, "Unknown device");
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
        session.setExpiresAt(Instant.now().plus(Duration.ofDays(properties.session().ttlDays())));
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

    /** Ends every active session of a user (used when an account is merged into another). */
    @Transactional
    public void revokeAll(Long userId, DeviceSession.RevokeReason reason) {
        sessions.findByUserIdAndRevokedAtIsNull(userId).forEach(s -> {
            s.setRevokedAt(Instant.now());
            s.setRevokeReason(reason);
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
}
