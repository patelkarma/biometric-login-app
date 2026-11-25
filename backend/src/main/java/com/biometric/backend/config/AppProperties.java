package com.biometric.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * All of this app's own settings ("app.*" in application.properties) in one typed place,
 * instead of @Value strings scattered across classes. Spring fails at start-up if one is missing.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Otp otp, Session session, WebAuthn webauthn, Cors cors) {

    /** 6-digit code rules. */
    public record Otp(long ttlSeconds, int maxAttempts, long resendCooldownSeconds) {}

    /** How long a device stays signed in. */
    public record Session(long ttlDays) {}

    /** WebAuthn relying party: rpId must equal the host name shown in the browser. */
    public record WebAuthn(String rpId, String rpName, List<String> origins) {}

    /** Origins allowed to call the API cross-origin (the Vite dev server). */
    public record Cors(List<String> origins) {}
}
