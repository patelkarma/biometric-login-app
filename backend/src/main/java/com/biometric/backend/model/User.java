package com.biometric.backend.model;

import com.biometric.backend.util.Identifiers;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

/**
 * An account. A user signs up with EITHER an email address OR a phone number;
 * whichever they choose becomes their login identifier.
 */
@Entity
@Table(name = "app_users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String firstName;

    @Column(nullable = false, length = 60)
    private String surname;

    @Column(nullable = false)
    private LocalDate dateOfBirth;

    /** Lower-cased email, or null when the user signed up with a phone number. */
    @Column(unique = true, length = 254)
    private String email;

    /** E.164 phone number (e.g. +919876543210), or null when the user signed up with email. */
    @Column(unique = true, length = 20)
    private String phone;

    /** True once the user has proved ownership of the email/phone with a 6-digit code. */
    @Column(nullable = false)
    private boolean verified;

    /** Random, opaque WebAuthn user handle (never the DB id or email). */
    @Column(nullable = false, unique = true, length = 64)
    private String webauthnUserHandle;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public String getIdentifier() {
        return email != null ? email : phone;
    }

    /** Stores a normalised identifier in the email or phone column, whichever it is. */
    public void setIdentifier(String identifier) {
        if (Identifiers.isPhone(identifier)) {
            this.phone = identifier;
        } else {
            this.email = identifier;
        }
    }

    public ContactType getContactType() {
        return email != null ? ContactType.EMAIL : ContactType.PHONE;
    }
}
