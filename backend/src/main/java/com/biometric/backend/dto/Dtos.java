package com.biometric.backend.dto;

import com.biometric.backend.model.ContactType;
import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.model.PasskeyCredential;
import com.biometric.backend.model.User;
import jakarta.validation.constraints.*;
import tools.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Request / response bodies of the REST API. */
public final class Dtos {

    private Dtos() {}

    private static final String NAME_REGEX = "^$|^[\\p{L}][\\p{L} .'\\-]*$";

    // ---------- requests ----------

    public record SignupRequest(
            @NotBlank(message = "First name is required.")
            @Size(max = 60, message = "First name is too long.")
            @Pattern(regexp = NAME_REGEX, message = "First name can only contain letters, spaces, apostrophes and hyphens.")
            String firstName,

            @NotBlank(message = "Surname is required.")
            @Size(max = 60, message = "Surname is too long.")
            @Pattern(regexp = NAME_REGEX, message = "Surname can only contain letters, spaces, apostrophes and hyphens.")
            String surname,

            @NotNull(message = "Date of birth is required.")
            @Past(message = "Date of birth must be in the past.")
            LocalDate dateOfBirth,

            @NotNull(message = "Choose email or phone.")
            ContactType contactType,

            @NotBlank(message = "Email or phone number is required.")
            String contact
    ) {}

    public record OtpRequest(
            @NotNull(message = "Choose email or phone.") ContactType contactType,
            @NotBlank(message = "Email or phone number is required.") String contact
    ) {}

    public record VerifyOtpRequest(
            @NotNull ContactType contactType,
            @NotBlank String contact,
            @NotBlank(message = "Enter the 6-digit code.")
            @Pattern(regexp = "^\\d{6}$", message = "The code must be exactly 6 digits.")
            String code,
            @NotBlank String deviceId,
            String deviceName
    ) {}

    /** A second email or phone a signed-in user wants to add. */
    public record ContactRequest(
            @NotNull(message = "Choose email or phone.") ContactType contactType,
            @NotBlank(message = "Email or phone number is required.") String contact
    ) {}

    public record ContactVerifyRequest(
            @NotNull ContactType contactType,
            @NotBlank String contact,
            @NotBlank(message = "Enter the 6-digit code.")
            @Pattern(regexp = "^\\d{6}$", message = "The code must be exactly 6 digits.")
            String code
    ) {}

    /** Code sent to the existing account, proving the user owns both accounts. */
    public record LinkVerifyRequest(
            @NotBlank(message = "Enter the 6-digit code.")
            @Pattern(regexp = "^\\d{6}$", message = "The code must be exactly 6 digits.")
            String code,
            @NotBlank String deviceId,
            String deviceName
    ) {}

    /** Both fields optional: without them the browser offers any passkey saved for this site. */
    public record PasskeyLoginStartRequest(ContactType contactType, String contact) {}

    public record PasskeyFinishRequest(
            @NotBlank String requestId,
            @NotNull JsonNode credential,
            String deviceId,
            String deviceName
    ) {}

    // ---------- responses ----------

    public record OtpSentResponse(
            ContactType contactType,
            String contact,
            String maskedContact,
            /** EMAIL, or CONSOLE when the code was printed in the backend log. */
            String deliveryChannel,
            long expiresInSeconds,
            long resendInSeconds
    ) {}

    public record UserDto(
            Long id,
            String firstName,
            String surname,
            LocalDate dateOfBirth,
            ContactType contactType,
            String email,
            String phone,
            Instant createdAt
    ) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getFirstName(), u.getSurname(), u.getDateOfBirth(),
                    u.getContactType(), u.getEmail(), u.getPhone(), u.getCreatedAt());
        }
    }

    public record SessionDto(
            Long id,
            String deviceName,
            String loginMethod,
            Instant signedInAt,
            Instant lastSeenAt,
            Instant expiresAt
    ) {
        public static SessionDto of(DeviceSession s) {
            return new SessionDto(s.getId(), s.getDeviceName(), s.getLoginMethod(),
                    s.getCreatedAt(), s.getLastSeenAt(), s.getExpiresAt());
        }
    }

    public record PasskeyDto(Long id, String deviceName, Instant createdAt, Instant lastUsedAt) {
        public static PasskeyDto of(PasskeyCredential p) {
            return new PasskeyDto(p.getId(), p.getDeviceName(), p.getCreatedAt(), p.getLastUsedAt());
        }
    }

    public record LoginResponse(
            String token,
            UserDto user,
            SessionDto session,
            boolean hasPasskey,
            boolean replacedOtherDevice,
            /** True right after sign-up when another account has the same name and date of birth. */
            boolean possibleDuplicate
    ) {
        public LoginResponse withPossibleDuplicate(boolean value) {
            return new LoginResponse(token, user, session, hasPasskey, replacedOtherDevice, value);
        }
    }

    /**
     * The existing account that may belong to the same person. Only the masked contact is shown,
     * and only to someone who has just verified their own new email / phone.
     */
    public record LinkMatchResponse(
            String firstName,
            String surname,
            LocalDate dateOfBirth,
            ContactType contactType,
            String maskedContact,
            Instant createdAt
    ) {}

    public record MeResponse(UserDto user, SessionDto session, List<PasskeyDto> passkeys) {}

    public record PasskeyOptionsResponse(String requestId, JsonNode options) {}

    public record ErrorResponse(String code, String message) {}
}
