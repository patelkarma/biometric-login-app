package com.biometric.backend.repository;

import com.biometric.backend.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByWebauthnUserHandle(String handle);

    /** Row lock so two simultaneous logins cannot both end up with an active session. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(@Param("id") Long id);

    /** Normalised identifiers: phone numbers always start with '+', emails never do. */
    default Optional<User> findByIdentifier(String identifier) {
        return identifier.startsWith("+") ? findByPhone(identifier) : findByEmail(identifier);
    }
}
