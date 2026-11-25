package com.biometric.backend.security;

import com.biometric.backend.dto.Dtos.ErrorResponse;
import com.biometric.backend.model.DeviceSession;
import com.biometric.backend.service.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates "Authorization: Bearer <token>" against the device_sessions table.
 * A token whose session was revoked because the user signed in on another device is
 * rejected with 401 SESSION_REVOKED - this is what signs the old device out.
 */
public class TokenAuthFilter extends OncePerRequestFilter {

    private final SessionService sessionService;
    private final ObjectMapper objectMapper;

    public TokenAuthFilter(SessionService sessionService, ObjectMapper objectMapper) {
        this.sessionService = sessionService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        Optional<DeviceSession> found = sessionService.findByToken(header.substring(7).trim());
        if (found.isEmpty()) {
            reject(response, "SESSION_INVALID", "Your session is not valid. Please sign in again.");
            return;
        }

        DeviceSession session = found.get();
        if (session.getRevokedAt() != null) {
            if (session.getRevokeReason() == DeviceSession.RevokeReason.NEW_DEVICE_LOGIN) {
                reject(response, "SESSION_REVOKED", "Your account was signed in on another device ("
                        + session.getReplacedByDevice() + "). Only one device can be active at a time.");
            } else {
                reject(response, "SESSION_ENDED", "You have been signed out. Please sign in again.");
            }
            return;
        }
        if (session.getExpiresAt().isBefore(Instant.now())) {
            sessionService.revoke(session.getId(), DeviceSession.RevokeReason.EXPIRED);
            reject(response, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
            return;
        }

        sessionService.touch(session.getId());
        AuthUser principal = new AuthUser(session.getUserId(), session.getId());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, String code, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(code, message));
    }
}
