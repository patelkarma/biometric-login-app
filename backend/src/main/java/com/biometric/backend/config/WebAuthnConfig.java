package com.biometric.backend.config;

import com.biometric.backend.service.JpaCredentialRepository;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/** WebAuthn "relying party" = this app. The browser only releases passkeys to matching origins. */
@Configuration
public class WebAuthnConfig {

    @Bean
    public RelyingParty relyingParty(JpaCredentialRepository credentialRepository,
                                     @Value("${app.webauthn.rp-id}") String rpId,
                                     @Value("${app.webauthn.rp-name}") String rpName,
                                     @Value("${app.webauthn.origins}") String origins) {
        Set<String> allowedOrigins = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        return RelyingParty.builder()
                .identity(RelyingPartyIdentity.builder().id(rpId).name(rpName).build())
                .credentialRepository(credentialRepository)
                .origins(allowedOrigins)
                .build();
    }
}
