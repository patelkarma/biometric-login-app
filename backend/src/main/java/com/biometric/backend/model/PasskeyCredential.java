package com.biometric.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * A WebAuthn credential (passkey) created by Face ID, Touch ID, a fingerprint reader
 * or Windows Hello. Only the PUBLIC key is stored; biometric data never leaves the device.
 */
@Entity
@Table(name = "passkey_credentials", indexes = @Index(columnList = "userId"))
@Getter
@Setter
@NoArgsConstructor
public class PasskeyCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    /** base64url credential id */
    @Column(nullable = false, unique = true, length = 1024)
    private String credentialId;

    /** base64url COSE-encoded public key */
    @Column(nullable = false, length = 2048)
    private String publicKeyCose;

    @Column(nullable = false)
    private long signatureCount;

    @Column(nullable = false, length = 120)
    private String deviceName;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant lastUsedAt;
}
