package com.biometric.backend.repository;

import com.biometric.backend.model.DeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceSessionRepository extends JpaRepository<DeviceSession, Long> {
    Optional<DeviceSession> findByTokenHash(String tokenHash);
    List<DeviceSession> findByUserIdAndRevokedAtIsNull(Long userId);
}
