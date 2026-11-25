package com.biometric.backend.web;

import com.biometric.backend.dto.Dtos.*;
import com.biometric.backend.model.ContactType;
import com.biometric.backend.service.AuthService;
import com.biometric.backend.util.Identifiers;
import com.biometric.backend.webauthn.WebAuthnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/** Public endpoints: sign-up, 6-digit code login and biometric (passkey) login. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final WebAuthnService webAuthnService;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public OtpSentResponse signup(@Valid @RequestBody SignupRequest req) {
        return authService.signup(req);
    }

    @PostMapping("/otp/request")
    public OtpSentResponse requestCode(@Valid @RequestBody OtpRequest req) {
        return authService.requestLoginCode(req);
    }

    @PostMapping("/otp/verify")
    public LoginResponse verifyCode(@Valid @RequestBody VerifyOtpRequest req) {
        return authService.verifyCode(req);
    }

    @PostMapping("/passkey/login/start")
    public PasskeyOptionsResponse passkeyLoginStart(@RequestBody(required = false) PasskeyLoginStartRequest req) {
        Optional<String> identifier = Optional.empty();
        if (req != null && req.contact() != null && !req.contact().isBlank()) {
            ContactType type = req.contactType() == null ? ContactType.EMAIL : req.contactType();
            identifier = Optional.of(Identifiers.normalize(type, req.contact()));
        }
        return webAuthnService.startLogin(identifier);
    }

    @PostMapping("/passkey/login/finish")
    public LoginResponse passkeyLoginFinish(@Valid @RequestBody PasskeyFinishRequest req) {
        return webAuthnService.finishLogin(req.requestId(), req.credential(), req.deviceId(), req.deviceName());
    }
}
