package com.biometric.backend.service;

import com.biometric.backend.dto.Dtos.*;
import com.biometric.backend.model.OtpCode;
import com.biometric.backend.model.User;
import com.biometric.backend.repository.PasskeyCredentialRepository;
import com.biometric.backend.repository.UserRepository;
import com.biometric.backend.util.Crypto;
import com.biometric.backend.util.Identifiers;
import com.biometric.backend.web.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;

/** Sign-up and 6-digit-code login. */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MIN_AGE = 13;

    private final UserRepository users;
    private final PasskeyCredentialRepository passkeys;
    private final OtpService otpService;
    private final SessionService sessionService;
    private final AccountLinkService accountLinks;

    /** Creates (or refreshes an unfinished) account and sends a 6-digit code to verify the email / phone. */
    @Transactional
    public OtpSentResponse signup(SignupRequest req) {
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        validateDateOfBirth(req.dateOfBirth());

        User user = users.findByIdentifier(identifier).orElse(null);
        if (user != null && user.isVerified()) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_EXISTS",
                    "An account with this " + Identifiers.describe(identifier) + " already exists. Please sign in.");
        }
        if (user == null) {
            user = new User();
            user.setWebauthnUserHandle(Crypto.randomToken(32));
            user.setIdentifier(identifier);
        }
        user.setFirstName(req.firstName().trim());
        user.setSurname(req.surname().trim());
        user.setDateOfBirth(req.dateOfBirth());
        users.save(user);

        return sendCode(user, identifier, OtpCode.Purpose.SIGNUP);
    }

    /** Sends a login code. Unfinished sign-ups get a sign-up code instead, so they can finish verifying. */
    @Transactional
    public OtpSentResponse requestLoginCode(OtpRequest req) {
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        User user = users.findByIdentifier(identifier)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND",
                        "No account found with this " + Identifiers.describe(identifier) + ". Please sign up first."));
        return sendCode(user, identifier, purposeFor(user));
    }

    /** Checks the code and starts a session on this device (signing out any other device). */
    @Transactional
    public LoginResponse verifyCode(VerifyOtpRequest req) {
        String identifier = Identifiers.normalize(req.contactType(), req.contact());
        User user = users.findByIdentifier(identifier)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", "No account found. Please sign up first."));

        boolean firstVerification = !user.isVerified();
        otpService.verify(identifier, purposeFor(user), req.code());

        user.setVerified(true);
        boolean hasPasskey = !passkeys.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty();
        // Right after sign-up, tell the client if this looks like someone who already has an account,
        // so the UI can offer to link the two ("Is this you?").
        boolean possibleDuplicate = firstVerification && accountLinks.findMatch(user).isPresent();
        return sessionService.startSession(user, req.deviceId(), req.deviceName(), "CODE")
                .toLoginResponse(user, hasPasskey)
                .withPossibleDuplicate(possibleDuplicate);
    }

    /**
     * Sends the code to the email / phone the user TYPED. An account can have both,
     * so this must not fall back to the account's main contact.
     */
    private OtpSentResponse sendCode(User user, String identifier, OtpCode.Purpose purpose) {
        return otpService.send(identifier, user.getFirstName(), purpose, null);
    }

    private static OtpCode.Purpose purposeFor(User user) {
        return user.isVerified() ? OtpCode.Purpose.LOGIN : OtpCode.Purpose.SIGNUP;
    }

    private static void validateDateOfBirth(LocalDate dob) {
        LocalDate today = LocalDate.now();
        if (dob.isAfter(today)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOB", "Date of birth cannot be in the future.");
        }
        int age = Period.between(dob, today).getYears();
        if (age < MIN_AGE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOB", "You must be at least " + MIN_AGE + " years old to sign up.");
        }
        if (age > 120) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DOB", "Please enter a valid date of birth.");
        }
    }
}
