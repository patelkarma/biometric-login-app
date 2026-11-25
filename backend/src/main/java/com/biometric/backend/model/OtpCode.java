package com.biometric.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A 6-digit one-time code. Only a SHA-256 hash of the code is stored. */
@Entity
@Table(name = "otp_codes", indexes = @Index(columnList = "identifier"))
@Getter
@Setter
@NoArgsConstructor
public class OtpCode {

    /**
     * SIGNUP / LOGIN: proving you own the email or phone you sign in with.
     * CONTACT: a signed-in user adding a second email or phone to their account.
     * LINK: proving you own an existing account, to join a new sign-up into it.
     */
    public enum Purpose { SIGNUP, LOGIN, CONTACT, LINK }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 254)
    private String identifier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Purpose purpose;

    @Column(nullable = false, length = 64)
    private String codeHash;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    /**
     * For CONTACT and LINK codes: the signed-in user who asked for the code.
     * Only that user can redeem it, even though it was sent to a different email / phone.
     */
    private Long ownerUserId;

    /** Set when the code is used successfully, exhausted, or superseded by a newer code. */
    private Instant consumedAt;

    /**
     * Optimistic lock: if two requests verify (or mis-guess) the same code at the same moment,
     * only the first update commits; the other fails instead of reusing the code or losing an attempt.
     */
    @Version
    @Column(nullable = false, columnDefinition = "bigint default 0")
    private long version;
}
