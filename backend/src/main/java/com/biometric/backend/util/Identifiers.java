package com.biometric.backend.util;

import com.biometric.backend.model.ContactType;
import com.biometric.backend.web.ApiException;
import org.springframework.http.HttpStatus;

import java.util.Locale;
import java.util.regex.Pattern;

/** Validates and normalises the email / phone a user signs up or logs in with. */
public final class Identifiers {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{7,14}$");
    private static final Pattern INDIA_MOBILE = Pattern.compile("^\\+91[6-9]\\d{9}$");

    private Identifiers() {}

    public static String normalize(ContactType type, String raw) {
        if (type == null) {
            throw invalid("Please choose email or phone.");
        }
        if (raw == null || raw.isBlank()) {
            throw invalid(type == ContactType.EMAIL ? "Please enter your email address." : "Please enter your phone number.");
        }
        return type == ContactType.EMAIL ? normalizeEmail(raw) : normalizePhone(raw);
    }

    private static String normalizeEmail(String raw) {
        String email = raw.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw invalid("Please enter a valid email address.");
        }
        return email;
    }

    private static String normalizePhone(String raw) {
        String phone = raw.replaceAll("[\\s()\\-.]", "");
        if (phone.startsWith("00")) phone = "+" + phone.substring(2);
        if (!E164.matcher(phone).matches()) {
            throw invalid("Please enter a valid phone number with country code, e.g. +91 98765 43210.");
        }
        if (phone.startsWith("+91") && !INDIA_MOBILE.matcher(phone).matches()) {
            throw invalid("Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.");
        }
        return phone;
    }

    /** Normalised phone numbers always start with '+', emails never do. */
    public static boolean isPhone(String identifier) {
        return identifier.startsWith("+");
    }

    /** "phone number" or "email", for user-facing messages. */
    public static String describe(String identifier) {
        return isPhone(identifier) ? "phone number" : "email";
    }

    /** Masks an identifier for display: "jo***@gmail.com" or "+91 ******3210". */
    public static String mask(String identifier) {
        if (isPhone(identifier)) {
            String last4 = identifier.substring(identifier.length() - 4);
            String cc = identifier.startsWith("+91") ? "+91 " : "";
            return cc + "******" + last4;
        }
        int at = identifier.indexOf('@');
        String local = identifier.substring(0, at);
        String visible = local.substring(0, local.length() <= 2 ? 1 : 2);
        return visible + "***" + identifier.substring(at);
    }

    private static ApiException invalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CONTACT", message);
    }
}
