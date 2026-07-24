package com.eventpulse.auth;

import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.eventpulse.common.exception.BadRequestException;

/**
 * Password strength policy applied at registration and password change:
 * classic complexity (upper, lower, digit, symbol, min 8) combined with a
 * blocklist of the most common passwords and a check that the password does
 * not contain the user's own email or name.
 */
@Component
public class PasswordPolicy {

    /** Top of every breached-password list; checked case-insensitively. */
    private static final Set<String> COMMON = Set.of(
            "password", "password1", "password123", "passw0rd", "p@ssw0rd",
            "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
            "iloveyou", "sunshine", "admin123", "welcome1", "welcome123",
            "letmein1", "football", "baseball", "dragon123", "monkey123",
            "abc12345", "1q2w3e4r", "qazwsxedc", "asdfghjkl", "zxcvbnm123",
            "india123", "chennai123", "mumbai123", "eventpulse");

    public void validate(String password, String email, String name) {
        if (password.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }
        if (!password.chars().anyMatch(Character::isUpperCase)) {
            throw new BadRequestException("Password must contain an uppercase letter");
        }
        if (!password.chars().anyMatch(Character::isLowerCase)) {
            throw new BadRequestException("Password must contain a lowercase letter");
        }
        if (!password.chars().anyMatch(Character::isDigit)) {
            throw new BadRequestException("Password must contain a number");
        }
        if (password.chars().allMatch(Character::isLetterOrDigit)) {
            throw new BadRequestException("Password must contain a symbol (e.g. ! @ # $)");
        }

        String lower = password.toLowerCase(Locale.ROOT);
        if (COMMON.contains(lower) || COMMON.contains(lower.replaceAll("[^a-z0-9]", ""))) {
            throw new BadRequestException("That password is too common — pick something less guessable");
        }

        if (email != null && !email.isBlank()) {
            String localPart = email.toLowerCase(Locale.ROOT).split("@")[0];
            if (localPart.length() >= 4 && lower.contains(localPart)) {
                throw new BadRequestException("Password must not contain your email address");
            }
        }
        if (name != null && name.trim().length() >= 4
                && lower.contains(name.trim().toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Password must not contain your name");
        }
    }
}
