package com.biometric.backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A logged-in device. The app guarantees at most ONE non-revoked session per user:
 * creating a new session revokes every other one (see SessionService).
 */
@Entity
@Table(name = "device_sessions", indexes = {
        @Index(columnList = "tokenHash", unique = true),
        @Index(columnList = "userId")
})
@Getter
@Setter
@NoArgsConstructor
public class DeviceSession {

    public enum RevokeReason { NEW_DEVICE_LOGIN, LOGOUT, EXPIRED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    /** SHA-256 of the bearer token. The raw token only ever lives on the device. */
    @Column(nullable = false, length = 64)
    private String tokenHash;

    /** Random id the browser generates once and keeps in localStorage. */
    @Column(nullable = false, length = 64)
    private String deviceId;

    @Column(nullable = false, length = 120)
    private String deviceName;

    @Column(nullable = false, length = 20)
    private String loginMethod;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant lastSeenAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant revokedAt;

    // Stored as plain text (VARCHAR), not a database ENUM type: adding a new value then needs
    // no database change. (A native ENUM column rejected new values in existing databases.)
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 20)
    private RevokeReason revokeReason;

    /** Device name of the session that replaced this one (shown to the kicked-out device). */
    @Column(length = 120)
    private String replacedByDevice;

    public boolean isActive() {
        return revokedAt == null && expiresAt.isAfter(Instant.now());
    }
}
