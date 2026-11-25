package com.biometric.backend.repository;

import com.biometric.backend.model.User;
import com.biometric.backend.util.Identifiers;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByWebauthnUserHandle(String handle);

    /** Verified accounts with this exact name and date of birth (case-insensitive names). */
    List<User> findByVerifiedTrueAndDateOfBirthAndFirstNameIgnoreCaseAndSurnameIgnoreCase(
            LocalDate dateOfBirth, String firstName, String surname);

    /** Row lock so two simultaneous logins cannot both end up with an active session. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(@Param("id") Long id);

    /** Finds a user by a normalised email or phone number (see {@link Identifiers#normalize}). */
    default Optional<User> findByIdentifier(String identifier) {
        return Identifiers.isPhone(identifier) ? findByPhone(identifier) : findByEmail(identifier);
    }
}
