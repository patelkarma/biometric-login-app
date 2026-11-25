package com.biometric.backend.webauthn;

import com.biometric.backend.model.PasskeyCredential;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Bridges the Yubico WebAuthn library to our JPA tables.
 * "username" in WebAuthn terms = the user's normalised email or phone number.
 */
@Component
@RequiredArgsConstructor
public class JpaCredentialRepository implements CredentialRepository {

    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        return users.findByIdentifier(username)
                .map(u -> passkeys.findByUserIdOrderByCreatedAtDesc(u.getId()).stream()
                        .map(p -> PublicKeyCredentialDescriptor.builder().id(toByteArray(p.getCredentialId())).build())
                        .collect(Collectors.toSet()))
                .orElse(Set.of());
    }

    @Override
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        return users.findByIdentifier(username).map(u -> toByteArray(u.getWebauthnUserHandle()));
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        return users.findByWebauthnUserHandle(userHandle.getBase64Url()).map(User::getIdentifier);
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        return passkeys.findByCredentialId(credentialId.getBase64Url())
                .flatMap(p -> users.findById(p.getUserId())
                        .filter(u -> u.getWebauthnUserHandle().equals(userHandle.getBase64Url()))
                        .map(u -> toRegistered(p, u)));
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        return passkeys.findByCredentialId(credentialId.getBase64Url())
                .flatMap(p -> users.findById(p.getUserId()).map(u -> toRegistered(p, u)))
                .map(Set::of)
                .orElse(Set.of());
    }

    private static RegisteredCredential toRegistered(PasskeyCredential p, User u) {
        return RegisteredCredential.builder()
                .credentialId(toByteArray(p.getCredentialId()))
                .userHandle(toByteArray(u.getWebauthnUserHandle()))
                .publicKeyCose(toByteArray(p.getPublicKeyCose()))
                .signatureCount(p.getSignatureCount())
                .build();
    }

    /**
     * We store WebAuthn binary values (ids, keys, user handles) as base64url text;
     * this turns them back into Yubico's ByteArray. Shared with WebAuthnService.
     */
    static ByteArray toByteArray(String base64Url) {
        try {
            return ByteArray.fromBase64Url(base64Url);
        } catch (Exception e) {
            throw new IllegalStateException("Corrupt base64url value", e);
        }
    }
}
