package com.retail.dw.service;

import com.retail.dw.model.AppUser;
import com.retail.dw.repository.AppUserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long SESSION_TTL_HOURS = 24;

    private final AppUserRepository userRepository;

    @Value("${admin.username:admin}")
    private String defaultAdminUsername;

    @Value("${admin.password:Admin@123}")
    private String defaultAdminPassword;

    // In-memory token -> UserSession cache
    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();

    public AuthService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public static class UserSession {
        private final Long userId;
        private final String username;
        private final String role;
        private final String fullName;
        private final String customerId;
        private final LocalDateTime expiresAt;

        public UserSession(Long userId, String username, String role, String fullName, String customerId, LocalDateTime expiresAt) {
            this.userId = userId;
            this.username = username;
            this.role = role;
            this.fullName = fullName;
            this.customerId = customerId;
            this.expiresAt = expiresAt;
        }

        public Long getUserId() { return userId; }
        public String getUsername() { return username; }
        public String getRole() { return role; }
        public String getFullName() { return fullName; }
        public String getCustomerId() { return customerId; }
        public LocalDateTime getExpiresAt() { return expiresAt; }

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }

    @PostConstruct
    public void initDefaultAccounts() {
        try {
            // 1. Ensure at least one ADMIN account exists
            if (userRepository.countByRole("ADMIN") == 0) {
                String adminUser = (defaultAdminUsername != null && !defaultAdminUsername.isBlank()) ? defaultAdminUsername : "admin";
                String adminPass = (defaultAdminPassword != null && !defaultAdminPassword.isBlank()) ? defaultAdminPassword : "Admin@123";

                AppUser admin = new AppUser(
                        adminUser,
                        PasswordUtil.hashPassword(adminPass),
                        "ADMIN",
                        "System Administrator",
                        null
                );
                userRepository.save(admin);
                log.info("Initialized default administrator account: username='{}'", adminUser);
            }

            // 2. Ensure a demo customer account exists for testing
            if (userRepository.countByRole("CUSTOMER") == 0) {
                AppUser customer = new AppUser(
                        "customer1",
                        PasswordUtil.hashPassword("Customer@123"),
                        "CUSTOMER",
                        "Sample Retail Customer",
                        "17850" // matches sample retail customer ID
                );
                userRepository.save(customer);
                log.info("Initialized default demo customer account: username='customer1' (CustomerID: 17850)");
            }
        } catch (Exception e) {
            log.warn("Could not check/initialize default accounts (tables may not be created yet): {}", e.getMessage());
        }
    }

    public Map<String, Object> login(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password are required.");
        }

        AppUser user = userRepository.findByUsername(username.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password."));

        if (!PasswordUtil.verifyPassword(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password.");
        }

        String token = generateToken();
        UserSession session = new UserSession(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getFullName(),
                user.getCustomerId(),
                LocalDateTime.now().plusHours(SESSION_TTL_HOURS)
        );
        activeSessions.put(token, session);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "role", user.getRole(),
                "fullName", user.getFullName() != null ? user.getFullName() : user.getUsername(),
                "customerId", user.getCustomerId() != null ? user.getCustomerId() : ""
        ));
        return result;
    }

    public Map<String, Object> registerCustomer(String username, String password, String fullName, String customerId) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("Username and password are required.");
        }
        String cleanUsername = username.trim().toLowerCase();
        if (userRepository.existsByUsername(cleanUsername)) {
            throw new IllegalArgumentException("Username is already taken.");
        }
        if (password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long.");
        }

        String assignedCustId = (customerId != null && !customerId.isBlank()) ? customerId.trim() : "CUST-" + (10000 + RANDOM.nextInt(90000));
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : cleanUsername;

        AppUser user = new AppUser(
                cleanUsername,
                PasswordUtil.hashPassword(password),
                "CUSTOMER",
                cleanFullName,
                assignedCustId
        );
        userRepository.save(user);

        return login(cleanUsername, password);
    }

    public UserSession getSession(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        UserSession session = activeSessions.get(token);
        if (session != null && session.isExpired()) {
            activeSessions.remove(token);
            return null;
        }
        return session;
    }

    public void logout(String token) {
        if (token != null) {
            activeSessions.remove(token);
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
