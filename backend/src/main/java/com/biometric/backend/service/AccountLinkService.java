package com.biometric.backend.service;

import com.biometric.backend.dto.Dtos.LinkMatchResponse;
import com.biometric.backend.dto.Dtos.LinkVerifyRequest;
import com.biometric.backend.dto.Dtos.LoginResponse;
import com.biometric.backend.dto.Dtos.OtpSentResponse;
import com.biometric.backend.model.ContactType;
import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.model.OtpCode;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.util.Identifiers;
import com.biometric.backend.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Optional;

/**
 * "Is this you?" - joins a brand-new account into an existing one owned by the same person.
 *
 * Matching name + date of birth is only a HINT, never proof: different people can share them,
 * and anyone could type them. So linking requires a code sent to the EXISTING account's
 * email / phone. Only someone who controls both contacts can join the accounts.
 */
@Service
@RequiredArgsConstructor
public class AccountLinkService {

    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;
    private final AccountService accounts;
    private final OtpService otpService;
    private final SessionService sessionService;

    /**
     * Another verified account with the same first name, surname and date of birth that does not
     * have this user's kind of contact yet (so the two can be combined). The oldest one wins.
     */
    @Transactional(readOnly = true)
    public Optional<User> findMatch(User user) {
        boolean hasOneContact = user.getEmail() == null || user.getPhone() == null;
        if (!hasOneContact) return Optional.empty();
        ContactType newType = user.getContactType();
        return users.findByVerifiedTrueAndDateOfBirthAndFirstNameIgnoreCaseAndSurnameIgnoreCase(
                        user.getDateOfBirth(), user.getFirstName(), user.getSurname()).stream()
                .filter(other -> !other.getId().equals(user.getId()))
                .filter(other -> newType == ContactType.PHONE ? other.getPhone() == null : other.getEmail() == null)
                .min(Comparator.comparing(User::getCreatedAt));
    }

    /** What the "Is this you?" screen shows (masked contact only). */
    @Transactional(readOnly = true)
    public LinkMatchResponse match(Long userId) {
        User target = requireMatch(accounts.currentUser(userId));
        return new LinkMatchResponse(target.getFirstName(), target.getSurname(), target.getDateOfBirth(),
                target.getContactType(), Identifiers.mask(target.getIdentifier()), target.getCreatedAt());
    }

    /** "Yes, it's me": sends a code to the existing account's email / phone. */
    @Transactional
    public OtpSentResponse start(Long userId) {
        User user = accounts.currentUser(userId);
        User target = requireMatch(user);
        return otpService.send(target.getIdentifier(), target.getFirstName(), OtpCode.Purpose.LINK, user.getId());
    }

    /**
     * Checks the code, moves the new contact into the existing account, deletes the new account
     * and signs this device in to the existing account.
     */
    @Transactional
    public LoginResponse verify(Long userId, LinkVerifyRequest req) {
        User newUser = accounts.currentUser(userId);
        User target = requireMatch(newUser);

        otpService.verify(target.getIdentifier(), OtpCode.Purpose.LINK, req.code(), newUser.getId());

        String movedContact = newUser.getIdentifier();
        // The new account goes away: end its sessions and remove its biometric logins
        // (a passkey is tied to the account it was created for, so it cannot be moved).
        sessionService.revokeAll(newUser.getId(), DeviceSession.RevokeReason.LOGOUT);
        passkeys.deleteByUserId(newUser.getId());
        users.delete(newUser);
        users.flush(); // frees the unique email / phone before the existing account takes it

        target.setIdentifier(movedContact);
        boolean hasPasskey = !passkeys.findByUserIdOrderByCreatedAtDesc(target.getId()).isEmpty();
        return sessionService.startSession(target, req.deviceId(), req.deviceName(), "CODE")
                .toLoginResponse(target, hasPasskey);
    }

    private User requireMatch(User user) {
        return findMatch(user).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NO_MATCH",
                "There is no matching account to link."));
    }
}
