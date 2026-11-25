package com.biometric.backend.service;

import com.biometric.backend.model.ContactType;
import com.biometric.backend.util.Identifiers;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Delivers 6-digit codes.
 * EMAIL: a real email through SMTP when MAIL_USERNAME / MAIL_PASSWORD are configured.
 * Otherwise (and always for PHONE, since real SMS needs a paid, DLT-registered gateway)
 * the code is printed to the console and returned to the UI as a clearly labelled demo delivery.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    public enum Channel { EMAIL, DEMO }

    public record Delivery(Channel channel, String demoCode) {}

    private final ObjectProvider<JavaMailSender> mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    public Delivery sendCode(ContactType type, String identifier, String code, String firstName) {
        if (type == ContactType.EMAIL && isEmailConfigured()) {
            try {
                sendEmail(identifier, code, firstName);
                log.info("Sent 6-digit code by email to {}", Identifiers.mask(identifier));
                return new Delivery(Channel.EMAIL, null);
            } catch (Exception e) {
                log.warn("Email delivery failed ({}), falling back to demo delivery", e.getMessage());
            }
        }
        log.info("\n==================================================\n"
                        + "  DEMO DELIVERY ({} not configured)\n"
                        + "  To:   {}\n"
                        + "  Code: {}\n"
                        + "==================================================",
                type == ContactType.EMAIL ? "SMTP" : "SMS gateway", identifier, code);
        return new Delivery(Channel.DEMO, code);
    }

    public boolean isEmailConfigured() {
        return mailFrom != null && !mailFrom.isBlank() && mailSender.getIfAvailable() != null;
    }

    private void sendEmail(String to, String code, String firstName) throws Exception {
        JavaMailSender sender = mailSender.getObject();
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(mailFrom, "SecureID");
        helper.setTo(to);
        helper.setSubject(code + " is your SecureID code");
        String name = firstName == null ? "there" : escape(firstName);
        String plain = "Hi " + name + ",\n\nYour SecureID code is " + code
                + ". It expires in 5 minutes.\n\nIf you did not request this, you can ignore this email.";
        String html = """
                <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:16px">
                  <h2 style="margin:0 0 8px;color:#1e1b4b">SecureID</h2>
                  <p style="color:#374151">Hi %s, here is your sign-in code:</p>
                  <p style="font-size:34px;letter-spacing:10px;font-weight:700;color:#4f46e5;margin:24px 0">%s</p>
                  <p style="color:#6b7280;font-size:14px">It expires in 5 minutes. If you did not request this, you can ignore this email.</p>
                </div>
                """.formatted(name, code);
        helper.setText(plain, html);
        sender.send(message);
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
