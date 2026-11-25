package com.biometric.backend.config;

import com.biometric.backend.webauthn.JpaCredentialRepository;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

/** WebAuthn "relying party" = this app. The browser only releases passkeys to matching origins. */
@Configuration
public class WebAuthnConfig {

    @Bean
    RelyingParty relyingParty(JpaCredentialRepository credentialRepository, AppProperties properties) {
        AppProperties.WebAuthn webauthn = properties.webauthn();
        return RelyingParty.builder()
                .identity(RelyingPartyIdentity.builder().id(webauthn.rpId()).name(webauthn.rpName()).build())
                .credentialRepository(credentialRepository)
                .origins(Set.copyOf(webauthn.origins()))
                .build();
    }
}
