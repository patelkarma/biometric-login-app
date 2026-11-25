package com.biometric.backend.webauthn;

import com.biometric.backend.dto.Dtos.LoginResponse;
import com.biometric.backend.dto.Dtos.PasskeyDto;
import com.biometric.backend.dto.Dtos.PasskeyOptionsResponse;
import com.biometric.backend.model.PasskeyCredential;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.service.SessionService;
import com.biometric.backend.util.Crypto;
import com.biometric.backend.util.DeviceNames;
import com.biometric.backend.web.ApiException;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Face ID / Touch ID / fingerprint / Windows Hello login via WebAuthn passkeys.
 *
 * How it works: the device's secure hardware creates a key pair that is unlocked only by the
 * user's biometric. We store the PUBLIC key. To log in, the server sends a random challenge,
 * the device asks for Face ID / fingerprint, signs the challenge, and we verify the signature.
 * Biometric data never leaves the device and is never seen by this server.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebAuthnService {

    private static final long CHALLENGE_TTL_SECONDS = 300;

    private record Pending<T>(T request, Long userId, Instant expiresAt) {}

    private final RelyingParty relyingParty;
    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;
    private final SessionService sessionService;
    private final ObjectMapper objectMapper;

    private final Map<String, Pending<PublicKeyCredentialCreationOptions>> pendingRegistrations = new ConcurrentHashMap<>();
    private final Map<String, Pending<AssertionRequest>> pendingAssertions = new ConcurrentHashMap<>();

    // ------------------------------------------------------------------ registration

    public PasskeyOptionsResponse startRegistration(User user) {
        cleanup();
        PublicKeyCredentialCreationOptions options = relyingParty.startRegistration(
                StartRegistrationOptions.builder()
                        .user(UserIdentity.builder()
                                .name(user.getIdentifier())
                                .displayName(user.getFirstName() + " " + user.getSurname())
                                .id(JpaCredentialRepository.toByteArray(user.getWebauthnUserHandle()))
                                .build())
                        .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                                // discoverable credential -> "Sign in with Face ID" works without typing an email
                                .residentKey(ResidentKeyRequirement.REQUIRED)
                                // forces the biometric / device PIN check, not just "touch"
                                .userVerification(UserVerificationRequirement.REQUIRED)
                                .build())
                        .timeout(120_000L)
                        .build());

        String requestId = Crypto.randomToken(16);
        pendingRegistrations.put(requestId, new Pending<>(options, user.getId(), expiry()));
        return new PasskeyOptionsResponse(requestId, publicKeyPart(json(options::toCredentialsCreateJson)));
    }

    @Transactional
    public PasskeyDto finishRegistration(User user, String requestId, JsonNode credential, String deviceName) {
        Pending<PublicKeyCredentialCreationOptions> pending = pendingRegistrations.remove(requestId);
        if (pending == null || pending.expiresAt().isBefore(Instant.now()) || !pending.userId().equals(user.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BIOMETRIC_EXPIRED", "Biometric setup timed out. Please try again.");
        }
        try {
            var response = PublicKeyCredential.parseRegistrationResponseJson(cleanRegistration(credential));
            RegistrationResult result = relyingParty.finishRegistration(FinishRegistrationOptions.builder()
                    .request(pending.request())
                    .response(response)
                    .build());

            PasskeyCredential passkey = new PasskeyCredential();
            passkey.setUserId(user.getId());
            passkey.setCredentialId(result.getKeyId().getId().getBase64Url());
            passkey.setPublicKeyCose(result.getPublicKeyCose().getBase64Url());
            passkey.setSignatureCount(result.getSignatureCount());
            passkey.setDeviceName(DeviceNames.clean(deviceName, "This device"));
            passkeys.save(passkey);
            log.info("User {} enabled biometric login on '{}'", user.getId(), passkey.getDeviceName());
            return PasskeyDto.of(passkey);
        } catch (RegistrationFailedException | java.io.IOException e) {
            log.warn("Passkey registration failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_REQUEST, "BIOMETRIC_FAILED", "Could not verify the biometric setup. Please try again.");
        }
    }

    // ------------------------------------------------------------------ login

    public PasskeyOptionsResponse startLogin(Optional<String> identifier) {
        cleanup();
        identifier.ifPresent(id -> {
            User user = users.findByIdentifier(id).filter(User::isVerified)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND",
                            "No account found. Please sign up first."));
            if (passkeys.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "NO_BIOMETRIC",
                        "Biometric login is not set up for this account yet. Sign in with a 6-digit code first, then enable Face ID / fingerprint.");
            }
        });

        AssertionRequest request = relyingParty.startAssertion(StartAssertionOptions.builder()
                .username(identifier)
                .userVerification(UserVerificationRequirement.REQUIRED)
                .timeout(120_000L)
                .build());

        String requestId = Crypto.randomToken(16);
        pendingAssertions.put(requestId, new Pending<>(request, null, expiry()));
        return new PasskeyOptionsResponse(requestId, publicKeyPart(json(request::toCredentialsGetJson)));
    }

    @Transactional
    public LoginResponse finishLogin(String requestId, JsonNode credential, String deviceId, String deviceName) {
        Pending<AssertionRequest> pending = pendingAssertions.remove(requestId);
        if (pending == null || pending.expiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BIOMETRIC_EXPIRED", "Biometric sign-in timed out. Please try again.");
        }
        AssertionResult result;
        try {
            var response = PublicKeyCredential.parseAssertionResponseJson(cleanAssertion(credential));
            result = relyingParty.finishAssertion(FinishAssertionOptions.builder()
                    .request(pending.request())
                    .response(response)
                    .build());
        } catch (AssertionFailedException | java.io.IOException e) {
            log.warn("Passkey assertion failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "BIOMETRIC_FAILED",
                    "This biometric login is not recognised. It may have been removed - sign in with a 6-digit code instead.");
        }
        if (!result.isSuccess()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "BIOMETRIC_FAILED", "Biometric verification failed.");
        }

        User user = users.findByWebauthnUserHandle(result.getCredential().getUserHandle().getBase64Url())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "BIOMETRIC_FAILED", "Account not found."));

        passkeys.findByCredentialId(result.getCredential().getCredentialId().getBase64Url()).ifPresent(p -> {
            p.setSignatureCount(result.getSignatureCount());
            p.setLastUsedAt(Instant.now());
        });

        return sessionService.startSession(user, deviceId, deviceName, "BIOMETRIC")
                .toLoginResponse(user, true);
    }

    // ------------------------------------------------------------------ helpers

    private interface JsonSupplier {
        String get() throws com.fasterxml.jackson.core.JsonProcessingException;
    }

    private JsonNode json(JsonSupplier supplier) {
        try {
            return objectMapper.readTree(supplier.get());
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Yubico wraps options as {"publicKey": {...}}; the browser library wants the inner object. */
    private static JsonNode publicKeyPart(JsonNode wrapped) {
        ObjectNode pk = (ObjectNode) wrapped.get("publicKey");
        // Yubico emits "extensions": {} etc. Drop nulls so the browser does not choke on them.
        java.util.List<String> nulls = pk.properties().stream()
                .filter(e -> e.getValue().isNull()).map(Map.Entry::getKey).toList();
        nulls.forEach(pk::remove);
        return pk;
    }

    /**
     * Browsers / @simplewebauthn add convenience fields (publicKey, authenticatorData, ...)
     * that are not part of the WebAuthn JSON the Yubico parser expects; keep only standard fields.
     */
    private String cleanRegistration(JsonNode c) {
        ObjectNode out = base(c);
        ObjectNode r = out.putObject("response");
        r.set("clientDataJSON", c.path("response").path("clientDataJSON"));
        r.set("attestationObject", c.path("response").path("attestationObject"));
        if (c.path("response").has("transports")) r.set("transports", c.path("response").path("transports"));
        return out.toString();
    }

    private String cleanAssertion(JsonNode c) {
        ObjectNode out = base(c);
        ObjectNode r = out.putObject("response");
        JsonNode src = c.path("response");
        r.set("clientDataJSON", src.path("clientDataJSON"));
        r.set("authenticatorData", src.path("authenticatorData"));
        r.set("signature", src.path("signature"));
        if (src.hasNonNull("userHandle")) r.set("userHandle", src.path("userHandle"));
        return out.toString();
    }

    private ObjectNode base(JsonNode c) {
        ObjectNode out = objectMapper.createObjectNode();
        out.set("id", c.path("id"));
        out.set("rawId", c.has("rawId") ? c.path("rawId") : c.path("id"));
        out.put("type", "public-key");
        ObjectNode ext = out.putObject("clientExtensionResults");
        if (c.path("clientExtensionResults").has("credProps")) {
            ext.set("credProps", c.path("clientExtensionResults").path("credProps"));
        }
        return out;
    }

    private static Instant expiry() {
        return Instant.now().plusSeconds(CHALLENGE_TTL_SECONDS);
    }

    private void cleanup() {
        Instant now = Instant.now();
        pendingRegistrations.values().removeIf(p -> p.expiresAt().isBefore(now));
        pendingAssertions.values().removeIf(p -> p.expiresAt().isBefore(now));
    }
}
