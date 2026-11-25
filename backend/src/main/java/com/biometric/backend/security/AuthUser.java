package com.biometric.backend.security;

/** The authenticated principal: which user, on which device session. */
public record AuthUser(Long userId, Long sessionId) {}
