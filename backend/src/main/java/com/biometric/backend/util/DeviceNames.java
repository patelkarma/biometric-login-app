package com.biometric.backend.util;

/** Cleans the device name the browser sends (e.g. "Chrome on Windows") before it is stored or shown. */
public final class DeviceNames {

    private static final int MAX_LENGTH = 120;

    private DeviceNames() {}

    /**
     * Removes control characters and angle brackets, trims, and limits the length.
     *
     * @param name     what the client sent (may be null)
     * @param fallback used when nothing usable was sent
     */
    public static String clean(String name, String fallback) {
        if (name == null || name.isBlank()) return fallback;
        String clean = name.replaceAll("[\\p{Cntrl}<>]", "").trim();
        if (clean.isEmpty()) return fallback;
        return clean.length() > MAX_LENGTH ? clean.substring(0, MAX_LENGTH) : clean;
    }
}
