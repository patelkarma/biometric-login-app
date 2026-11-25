package com.biometric.backend.web;

import com.biometric.backend.dto.Dtos.*;
import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.security.AuthUser;
import com.biometric.backend.service.SessionService;
import com.biometric.backend.service.WebAuthnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Endpoints for a signed-in user (require a valid, non-revoked device session). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AccountController {

    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;
    private final SessionService sessionService;
    private final WebAuthnService webAuthnService;

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AuthUser auth) {
        User user = user(auth);
        return new MeResponse(
                UserDto.of(user),
                SessionDto.of(sessionService.get(auth.sessionId())),
                passkeys.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(PasskeyDto::of).toList());
    }

    /** Polled by the browser every few seconds; the filter answers 401 SESSION_REVOKED once another device signs in. */
    @GetMapping("/session/heartbeat")
    public Map<String, Object> heartbeat() {
        return Map.of("active", true);
    }

    @PostMapping("/session/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal AuthUser auth) {
        sessionService.revoke(auth.sessionId(), DeviceSession.RevokeReason.LOGOUT);
    }

    @PostMapping("/passkeys/register/start")
    public PasskeyOptionsResponse registerStart(@AuthenticationPrincipal AuthUser auth) {
        return webAuthnService.startRegistration(user(auth));
    }

    @PostMapping("/passkeys/register/finish")
    public PasskeyDto registerFinish(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody PasskeyFinishRequest req) {
        return webAuthnService.finishRegistration(user(auth), req.requestId(), req.credential(), req.deviceName());
    }

    @DeleteMapping("/passkeys/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deletePasskey(@AuthenticationPrincipal AuthUser auth, @PathVariable Long id) {
        passkeys.findById(id)
                .filter(p -> p.getUserId().equals(auth.userId()))
                .ifPresentOrElse(passkeys::delete, () -> {
                    throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Biometric login not found.");
                });
    }

    private User user(AuthUser auth) {
        return users.findById(auth.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Please sign in."));
    }
}
