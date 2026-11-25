package com.biometric.backend.repository;

import com.biometric.backend.model.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {
    Optional<OtpCode> findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(String identifier, OtpCode.Purpose purpose);
    List<OtpCode> findByIdentifierAndConsumedAtIsNull(String identifier);
}
