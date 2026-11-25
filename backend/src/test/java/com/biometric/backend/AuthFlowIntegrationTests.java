package com.biometric.backend;

import com.fasterxml.jackson.dataformat.cbor.CBORFactory;
import com.fasterxml.jackson.dataformat.cbor.CBORGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end tests over real HTTP against the running app:
 * sign-up (email + phone), 6-digit code rules, biometric (WebAuthn) registration and login
 * using a software authenticator, and the one-active-device rule.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:authflow;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.mail.username=",
        "app.otp.resend-cooldown-seconds=0"
})
class AuthFlowIntegrationTests {

    private static final String ORIGIN = "http://localhost:5173";

    @LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = JsonMapper.builder().build();

    // ------------------------------------------------------------------ tests

    @Test
    void emailSignupCodeLoginBiometricLoginAndOneActiveDevice() throws Exception {
        String email = "user" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";

        // 1. Sign up with email, surname and DOB -> a 6-digit code is issued
        Res signup = post("/api/auth/signup", null, """
                {"firstName":"Karma","surname":"Patel","dateOfBirth":"2001-04-12","contactType":"EMAIL","contact":"%s"}
                """.formatted(email));
        assertThat(signup.status).isEqualTo(201);
        String code = signup.body.get("demoCode").asString();
        assertThat(code).matches("\\d{6}");

        // 2. Verify the code on device A
        Res loginA = post("/api/auth/otp/verify", null, """
                {"contactType":"EMAIL","contact":"%s","code":"%s","deviceId":"device-A","deviceName":"Chrome on Windows"}
                """.formatted(email, code));
        assertThat(loginA.status).isEqualTo(200);
        String tokenA = loginA.body.get("token").asString();
        assertThat(get("/api/me", tokenA).body.at("/user/surname").asString()).isEqualTo("Patel");

        // 3. Enable biometrics on device A (software authenticator stands in for Face ID / fingerprint)
        SoftwareAuthenticator authenticator = new SoftwareAuthenticator();
        Res regStart = post("/api/passkeys/register/start", tokenA, "");
        assertThat(regStart.status).isEqualTo(200);
        JsonNode regOptions = regStart.body.get("options");
        assertThat(regOptions.at("/authenticatorSelection/userVerification").asString()).isEqualTo("required");
        String regCredential = authenticator.register(regOptions);
        Res regFinish = post("/api/passkeys/register/finish", tokenA, """
                {"requestId":"%s","credential":%s,"deviceName":"Chrome on Windows"}
                """.formatted(regStart.body.get("requestId").asString(), regCredential));
        assertThat(regFinish.status).isEqualTo(200);
        assertThat(get("/api/me", tokenA).body.get("passkeys").size()).isEqualTo(1);

        // 4. Biometric login (no email typed - discoverable passkey) on device B
        Res authStart = post("/api/auth/passkey/login/start", null, "{}");
        assertThat(authStart.status).isEqualTo(200);
        String assertion = authenticator.authenticate(authStart.body.get("options"));
        Res loginB = post("/api/auth/passkey/login/finish", null, """
                {"requestId":"%s","credential":%s,"deviceId":"device-B","deviceName":"Safari on iPhone"}
                """.formatted(authStart.body.get("requestId").asString(), assertion));
        assertThat(loginB.status).isEqualTo(200);
        assertThat(loginB.body.at("/session/loginMethod").asString()).isEqualTo("BIOMETRIC");
        assertThat(loginB.body.get("replacedOtherDevice").asBoolean()).isTrue();
        String tokenB = loginB.body.get("token").asString();

        // 5. One active device: A is now signed out, B works
        Res heartbeatA = get("/api/session/heartbeat", tokenA);
        assertThat(heartbeatA.status).isEqualTo(401);
        assertThat(heartbeatA.body.get("code").asString()).isEqualTo("SESSION_REVOKED");
        assertThat(heartbeatA.body.get("message").asString()).contains("Safari on iPhone");
        assertThat(get("/api/session/heartbeat", tokenB).status).isEqualTo(200);

        // 6. A replayed assertion is rejected (challenge is single-use)
        Res replay = post("/api/auth/passkey/login/finish", null, """
                {"requestId":"%s","credential":%s,"deviceId":"device-C"}
                """.formatted(authStart.body.get("requestId").asString(), assertion));
        assertThat(replay.status).isEqualTo(400);

        // 7. Logout ends the session
        assertThat(post("/api/session/logout", tokenB, "").status).isEqualTo(204);
        assertThat(get("/api/me", tokenB).status).isEqualTo(401);
    }

    @Test
    void phoneSignupWorksAndDuplicateIsRejected() throws Exception {
        String phone = "+9198" + (10_000_000 + (int) (Math.random() * 89_999_999));
        Res signup = post("/api/auth/signup", null, """
                {"firstName":"Asha","surname":"Rao","dateOfBirth":"1999-06-15","contactType":"PHONE","contact":"%s"}
                """.formatted(phone));
        assertThat(signup.status).isEqualTo(201);
        assertThat(signup.body.get("maskedContact").asString()).startsWith("+91 ******");

        Res verify = post("/api/auth/otp/verify", null, """
                {"contactType":"PHONE","contact":"%s","code":"%s","deviceId":"d1"}
                """.formatted(phone, signup.body.get("demoCode").asString()));
        assertThat(verify.status).isEqualTo(200);
        assertThat(verify.body.at("/user/phone").asString()).isEqualTo(phone);

        Res again = post("/api/auth/signup", null, """
                {"firstName":"Asha","surname":"Rao","dateOfBirth":"1999-06-15","contactType":"PHONE","contact":"%s"}
                """.formatted(phone));
        assertThat(again.status).isEqualTo(409);
    }

    @Test
    void signupValidation() throws Exception {
        Res noSurname = post("/api/auth/signup", null, """
                {"firstName":"A","surname":"","dateOfBirth":"2000-01-01","contactType":"EMAIL","contact":"v1@example.com"}""");
        assertThat(noSurname.status).isEqualTo(400);
        assertThat(noSurname.body.get("message").asString()).isEqualTo("Surname is required.");

        Res noDob = post("/api/auth/signup", null, """
                {"firstName":"A","surname":"B","contactType":"EMAIL","contact":"v2@example.com"}""");
        assertThat(noDob.status).isEqualTo(400);

        Res underage = post("/api/auth/signup", null, """
                {"firstName":"A","surname":"B","dateOfBirth":"2022-01-01","contactType":"EMAIL","contact":"v3@example.com"}""");
        assertThat(underage.body.get("code").asString()).isEqualTo("INVALID_DOB");

        Res badEmail = post("/api/auth/signup", null, """
                {"firstName":"A","surname":"B","dateOfBirth":"2000-01-01","contactType":"EMAIL","contact":"not-an-email"}""");
        assertThat(badEmail.body.get("code").asString()).isEqualTo("INVALID_CONTACT");
    }

    @Test
    void wrongCodesLockAfterFiveAttempts() throws Exception {
        String email = "lock" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        Res signup = post("/api/auth/signup", null, """
                {"firstName":"L","surname":"K","dateOfBirth":"1990-01-01","contactType":"EMAIL","contact":"%s"}""".formatted(email));
        String real = signup.body.get("demoCode").asString();
        String wrong = real.equals("000000") ? "111111" : "000000";
        String body = """
                {"contactType":"EMAIL","contact":"%s","code":"%s","deviceId":"d"}""";

        for (int i = 1; i <= 4; i++) {
            assertThat(post("/api/auth/otp/verify", null, body.formatted(email, wrong)).body.get("code").asString())
                    .isEqualTo("CODE_INCORRECT");
        }
        assertThat(post("/api/auth/otp/verify", null, body.formatted(email, wrong)).body.get("code").asString())
                .isEqualTo("CODE_LOCKED");
        // even the right code no longer works
        assertThat(post("/api/auth/otp/verify", null, body.formatted(email, real)).status).isEqualTo(400);
    }

    // ------------------------------------------------------------------ http helpers

    record Res(int status, JsonNode body) {}

    private Res post(String path, String token, String body) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (token != null) b.header("Authorization", "Bearer " + token);
        return send(b.build());
    }

    private Res get(String path, String token) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET();
        if (token != null) b.header("Authorization", "Bearer " + token);
        return send(b.build());
    }

    private Res send(HttpRequest req) throws Exception {
        HttpResponse<String> r = http.send(req, HttpResponse.BodyHandlers.ofString());
        JsonNode body = r.body() == null || r.body().isBlank() ? json.createObjectNode() : json.readTree(r.body());
        return new Res(r.statusCode(), body);
    }

    // ------------------------------------------------------------------ software authenticator

    /**
     * Minimal WebAuthn platform authenticator (ES256, "none" attestation, user verified),
     * standing in for Face ID / Touch ID / Windows Hello in automated tests.
     */
    private final class SoftwareAuthenticator {
        private final KeyPair keyPair;
        private final byte[] credentialId = new byte[32];
        private byte[] userHandle;
        private int signCount = 0;

        SoftwareAuthenticator() throws Exception {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("EC");
            gen.initialize(new ECGenParameterSpec("secp256r1"));
            keyPair = gen.generateKeyPair();
            new SecureRandom().nextBytes(credentialId);
        }

        String register(JsonNode options) throws Exception {
            userHandle = b64d(options.at("/user/id").asString());
            byte[] clientData = clientData("webauthn.create", options.get("challenge").asString());

            ByteArrayOutputStream authData = new ByteArrayOutputStream();
            authData.write(sha256(options.at("/rp/id").asString().getBytes(StandardCharsets.UTF_8)));
            authData.write(0x45); // UP | UV | AT
            authData.write(ByteBuffer.allocate(4).putInt(signCount).array());
            authData.write(new byte[16]); // AAGUID
            authData.write(ByteBuffer.allocate(2).putShort((short) credentialId.length).array());
            authData.write(credentialId);
            authData.write(coseKey());

            ByteArrayOutputStream att = new ByteArrayOutputStream();
            try (CBORGenerator g = new CBORFactory().createGenerator(att)) {
                g.writeStartObject();
                g.writeStringField("fmt", "none");
                g.writeFieldName("attStmt");
                g.writeStartObject();
                g.writeEndObject();
                g.writeFieldName("authData");
                g.writeBinary(authData.toByteArray());
                g.writeEndObject();
            }

            return """
                    {"id":"%1$s","rawId":"%1$s","type":"public-key","authenticatorAttachment":"platform",
                     "response":{"clientDataJSON":"%2$s","attestationObject":"%3$s","transports":["internal"]},
                     "clientExtensionResults":{"credProps":{"rk":true}}}
                    """.formatted(b64(credentialId), b64(clientData), b64(att.toByteArray()));
        }

        String authenticate(JsonNode options) throws Exception {
            byte[] clientData = clientData("webauthn.get", options.get("challenge").asString());
            signCount++;
            ByteArrayOutputStream authData = new ByteArrayOutputStream();
            authData.write(sha256(options.get("rpId").asString().getBytes(StandardCharsets.UTF_8)));
            authData.write(0x05); // UP | UV
            authData.write(ByteBuffer.allocate(4).putInt(signCount).array());

            Signature sig = Signature.getInstance("SHA256withECDSA");
            sig.initSign(keyPair.getPrivate());
            sig.update(authData.toByteArray());
            sig.update(sha256(clientData));

            return """
                    {"id":"%1$s","rawId":"%1$s","type":"public-key","authenticatorAttachment":"platform",
                     "response":{"clientDataJSON":"%2$s","authenticatorData":"%3$s","signature":"%4$s","userHandle":"%5$s"},
                     "clientExtensionResults":{}}
                    """.formatted(b64(credentialId), b64(clientData), b64(authData.toByteArray()),
                    b64(sig.sign()), b64(userHandle));
        }

        private byte[] clientData(String type, String challenge) {
            return ("{\"type\":\"" + type + "\",\"challenge\":\"" + challenge
                    + "\",\"origin\":\"" + ORIGIN + "\",\"crossOrigin\":false}").getBytes(StandardCharsets.UTF_8);
        }

        private byte[] coseKey() throws Exception {
            ECPublicKey pub = (ECPublicKey) keyPair.getPublic();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (CBORGenerator g = new CBORFactory().createGenerator(out)) {
                g.writeStartObject();
                g.writeFieldId(1);  g.writeNumber(2);   // kty: EC2
                g.writeFieldId(3);  g.writeNumber(-7);  // alg: ES256
                g.writeFieldId(-1); g.writeNumber(1);   // crv: P-256
                g.writeFieldId(-2); g.writeBinary(unsigned32(pub.getW().getAffineX()));
                g.writeFieldId(-3); g.writeBinary(unsigned32(pub.getW().getAffineY()));
                g.writeEndObject();
            }
            return out.toByteArray();
        }
    }

    private static byte[] unsigned32(BigInteger v) {
        byte[] raw = v.toByteArray();
        byte[] out = new byte[32];
        int copy = Math.min(raw.length, 32);
        System.arraycopy(raw, raw.length - copy, out, 32 - copy, copy);
        return out;
    }

    private static byte[] sha256(byte[] data) throws NoSuchAlgorithmException {
        return MessageDigest.getInstance("SHA-256").digest(data);
    }

    private static String b64(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static byte[] b64d(String s) {
        return Base64.getUrlDecoder().decode(s);
    }
}
