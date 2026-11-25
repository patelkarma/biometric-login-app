package com.biometric.backend.repository;

import com.biometric.backend.model.PasskeyCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasskeyCredentialRepository extends JpaRepository<PasskeyCredential, Long> {
    List<PasskeyCredential> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<PasskeyCredential> findByCredentialId(String credentialId);

    void deleteByUserId(Long userId);
}
