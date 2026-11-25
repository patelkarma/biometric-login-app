package com.biometric.backend.web;

import com.biometric.backend.dto.Dtos.*;
import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.security.AuthUser;
import com.biometric.backend.service.AccountLinkService;
import com.biometric.backend.service.AccountService;
import com.biometric.backend.service.ContactService;
import com.biometric.backend.service.SessionService;
import com.biometric.backend.webauthn.WebAuthnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Endpoints for a signed-in user (require a valid, non-revoked device session). */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final ContactService contactService;
    private final AccountLinkService accountLinkService;
    private final SessionService sessionService;
    private final WebAuthnService webAuthnService;

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AuthUser auth) {
        return accountService.overview(auth.userId(), auth.sessionId());
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
        return webAuthnService.startRegistration(accountService.currentUser(auth.userId()));
    }

    @PostMapping("/passkeys/register/finish")
    public PasskeyDto registerFinish(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody PasskeyFinishRequest req) {
        return webAuthnService.finishRegistration(
                accountService.currentUser(auth.userId()), req.requestId(), req.credential(), req.deviceName());
    }

    @DeleteMapping("/passkeys/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePasskey(@AuthenticationPrincipal AuthUser auth, @PathVariable Long id) {
        accountService.deletePasskey(auth.userId(), id);
    }

    // ---------- Add a second email / phone ----------

    @PostMapping("/contacts/start")
    public OtpSentResponse addContactStart(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody ContactRequest req) {
        return contactService.start(auth.userId(), req);
    }

    @PostMapping("/contacts/verify")
    public UserDto addContactVerify(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody ContactVerifyRequest req) {
        return contactService.verify(auth.userId(), req);
    }

    // ---------- "Is this you?" account linking ----------

    @GetMapping("/link/match")
    public LinkMatchResponse linkMatch(@AuthenticationPrincipal AuthUser auth) {
        return accountLinkService.match(auth.userId());
    }

    @PostMapping("/link/start")
    public OtpSentResponse linkStart(@AuthenticationPrincipal AuthUser auth) {
        return accountLinkService.start(auth.userId());
    }

    @PostMapping("/link/verify")
    public LoginResponse linkVerify(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody LinkVerifyRequest req) {
        return accountLinkService.verify(auth.userId(), req);
    }
}
