package com.biometric.backend.service;

import com.biometric.backend.dto.Dtos.MeResponse;
import com.biometric.backend.dto.Dtos.PasskeyDto;
import com.biometric.backend.dto.Dtos.SessionDto;
import com.biometric.backend.dto.Dtos.UserDto;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Everything a signed-in user can see or change about their own account. */
@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;
    private final SessionService sessionService;

    /** The signed-in user. Fails with 401 if the account no longer exists. */
    @Transactional(readOnly = true)
    public User currentUser(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Please sign in."));
    }

    /** Profile, this device's session and the user's biometric logins (the dashboard data). */
    @Transactional(readOnly = true)
    public MeResponse overview(Long userId, Long sessionId) {
        User user = currentUser(userId);
        return new MeResponse(
                UserDto.of(user),
                SessionDto.of(sessionService.get(sessionId)),
                passkeys.findByUserIdOrderByCreatedAtDesc(userId).stream().map(PasskeyDto::of).toList());
    }

    /** Removes one of the user's own biometric logins; another user's id is treated as "not found". */
    @Transactional
    public void deletePasskey(Long userId, Long passkeyId) {
        passkeys.findById(passkeyId)
                .filter(p -> p.getUserId().equals(userId))
                .ifPresentOrElse(passkeys::delete, () -> {
                    throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Biometric login not found.");
                });
    }
}
