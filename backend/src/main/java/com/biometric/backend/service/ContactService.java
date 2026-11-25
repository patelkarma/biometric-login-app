package com.biometric.backend.service;

import com.biometric.backend.dto.Dtos.ContactRequest;
import com.biometric.backend.dto.Dtos.ContactVerifyRequest;
import com.biometric.backend.dto.Dtos.OtpSentResponse;
import com.biometric.backend.dto.Dtos.UserDto;
import com.biometric.backend.model.ContactType;
import com.biometric.backend.model.OtpCode;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.util.Identifiers;
import com.biometric.backend.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lets a signed-in user add their other contact (a phone to an email account, or the reverse),
 * after proving they own it with a 6-digit code. Afterwards they can sign in with either.
 */
@Service
@RequiredArgsConstructor
public class ContactService {

    private final UserRepository users;
    private final AccountService accounts;
    private final OtpService otpService;

    /** Step 1: checks the contact can be added and sends a code to it. */
    @Transactional
    public OtpSentResponse start(Long userId, ContactRequest req) {
        User user = accounts.currentUser(userId);
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        ensureCanAdd(user, req.contactType(), identifier);
        return otpService.send(identifier, user.getFirstName(), OtpCode.Purpose.CONTACT, user.getId());
    }

    /** Step 2: checks the code and adds the contact to the account. */
    @Transactional
    public UserDto verify(Long userId, ContactVerifyRequest req) {
        User user = accounts.currentUser(userId);
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        ensureCanAdd(user, req.contactType(), identifier);

        otpService.verify(identifier, OtpCode.Purpose.CONTACT, req.code(), user.getId());

        // An unfinished sign-up (never verified) does not own the contact: remove it to free it up.
        users.findByIdentifier(identifier).ifPresent(abandoned -> {
            users.delete(abandoned);
            users.flush();
        });
        user.setIdentifier(identifier);
        return UserDto.of(user);
    }

    /** One email and one phone per account; each email / phone belongs to only one verified account. */
    private void ensureCanAdd(User user, ContactType type, String identifier) {
        boolean alreadyHasOne = type == ContactType.PHONE ? user.getPhone() != null : user.getEmail() != null;
        if (alreadyHasOne) {
            throw new ApiException(HttpStatus.CONFLICT, "CONTACT_EXISTS",
                    "Your account already has a " + Identifiers.describe(identifier) + ".");
        }
        users.findByIdentifier(identifier).filter(User::isVerified).ifPresent(other -> {
            throw new ApiException(HttpStatus.CONFLICT, "CONTACT_IN_USE",
                    "This " + Identifiers.describe(identifier) + " is already used by another account.");
        });
    }
}
