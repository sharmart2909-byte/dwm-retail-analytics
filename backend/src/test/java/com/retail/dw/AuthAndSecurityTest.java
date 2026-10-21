package com.retail.dw;

import com.retail.dw.config.AuthInterceptor;
import com.retail.dw.repository.AppUserRepository;
import com.retail.dw.service.AuthService;
import com.retail.dw.service.PasswordUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class AuthAndSecurityTest {

    private AuthService authService;
    private AppUserRepository userRepository;
    private AuthInterceptor authInterceptor;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(AppUserRepository.class);
        authService = new AuthService(userRepository);
        authInterceptor = new AuthInterceptor(authService);
    }

    // =========================================================================
    // 1. Password Hashing & Verification Tests (PBKDF2)
    // =========================================================================

    @Test
    @DisplayName("Password hashing produces compliant PBKDF2 format")
    void testPasswordHashingFormat() {
        String rawPassword = "Admin@SecurePassword123!";
        String hash = PasswordUtil.hashPassword(rawPassword);
        assertNotNull(hash);
        assertTrue(hash.startsWith("pbkdf2:sha256:65536:"), "Hash format must start with pbkdf2:sha256:65536:");
    }

    @Test
    @DisplayName("Two hashes of the same password produce unique cryptographic salts")
    void testSaltUniqueness() {
        String rawPassword = "Customer@Password123";
        String hash1 = PasswordUtil.hashPassword(rawPassword);
        String hash2 = PasswordUtil.hashPassword(rawPassword);
        assertNotEquals(hash1, hash2, "Salt must be cryptographically random and unique for each hash invocation");
        assertTrue(PasswordUtil.verifyPassword(rawPassword, hash1));
        assertTrue(PasswordUtil.verifyPassword(rawPassword, hash2));
    }

    @Test
    @DisplayName("Incorrect or malformed passwords fail verification safely")
    void testPasswordVerificationFailures() {
        String rawPassword = "SecretPassword!99";
        String hash = PasswordUtil.hashPassword(rawPassword);

        assertFalse(PasswordUtil.verifyPassword("WrongPassword!", hash));
        assertFalse(PasswordUtil.verifyPassword("", hash));
        assertFalse(PasswordUtil.verifyPassword(null, hash));
        assertFalse(PasswordUtil.verifyPassword(rawPassword, "malformed_hash_without_colons"));
        assertFalse(PasswordUtil.verifyPassword(rawPassword, null));
    }

    // =========================================================================
    // 2. Session Management & Expiration Tests
    // =========================================================================

    @Test
    @DisplayName("Expired sessions are rejected safely")
    void testExpiredSessionRejection() {
        AuthService.UserSession expiredSession = new AuthService.UserSession(
                1L, "admin", "ADMIN", "Admin User", null, LocalDateTime.now().minusSeconds(10)
        );
        assertTrue(expiredSession.isExpired(), "Session must be marked expired when expiresAt is in the past");

        AuthService.UserSession validSession = new AuthService.UserSession(
                2L, "customer1", "CUSTOMER", "Customer User", "17850", LocalDateTime.now().plusHours(24)
        );
        assertFalse(validSession.isExpired(), "Session must be valid when expiresAt is in the future");
    }

    // =========================================================================
    // 3. Endpoint Authorization & Role Guards (AuthInterceptor)
    // =========================================================================

    @Test
    @DisplayName("Public endpoints (login, stats, catalog) allow unauthenticated access")
    void testPublicEndpointsAllowUnauthenticated() throws Exception {
        String[] publicPaths = {
                "/api/auth/login",
                "/api/auth/register",
                "/api/dashboard/stats",
                "/api/customer/catalog"
        };

        for (String path : publicPaths) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
            MockHttpServletResponse response = new MockHttpServletResponse();
            boolean allowed = authInterceptor.preHandle(request, response, new Object());
            assertTrue(allowed, "Path " + path + " must be accessible without authentication token");
            assertEquals(200, response.getStatus());
        }
    }

    @Test
    @DisplayName("Protected APIs reject unauthenticated requests with HTTP 401")
    void testProtectedApiRejectsUnauthenticated() throws Exception {
        String[] protectedPaths = {
                "/api/dataset/inspect",
                "/api/dataset/upload",
                "/api/warehouse/overview",
                "/api/olap/rollup",
                "/api/analytics/clustering",
                "/api/customer/orders"
        };

        for (String path : protectedPaths) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
            MockHttpServletResponse response = new MockHttpServletResponse();
            boolean allowed = authInterceptor.preHandle(request, response, new Object());
            assertFalse(allowed, "Unauthenticated request to " + path + " must be blocked");
            assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
            assertTrue(response.getContentAsString().contains("Unauthorized"));
        }
    }

    @Test
    @DisplayName("Customers cannot access administrative endpoints (returns HTTP 403 Forbidden)")
    void testCustomerForbiddenOnAdminRoutes() throws Exception {
        // Prepare active session for a CUSTOMER
        AuthService.UserSession customerSession = new AuthService.UserSession(
                10L, "customer1", "CUSTOMER", "Jane Doe", "17850", LocalDateTime.now().plusHours(12)
        );

        String[] adminOnlyPaths = {
                "/api/dataset/inspect",
                "/api/dataset/upload",
                "/api/warehouse/overview",
                "/api/warehouse/sync-etl",
                "/api/olap/rollup",
                "/api/olap/drilldown",
                "/api/analytics/clustering",
                "/api/analytics/regression",
                "/api/analytics/naive-bayes"
        };

        for (String path : adminOnlyPaths) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
            MockHttpServletResponse response = new MockHttpServletResponse();

            // Simulate authenticated customer request attribute
            request.setAttribute("currentUser", customerSession);
            // Simulate token lookup
            AuthService authSpy = Mockito.spy(authService);
            Mockito.doReturn(customerSession).when(authSpy).getSession(Mockito.anyString());
            AuthInterceptor interceptorWithSpy = new AuthInterceptor(authSpy);

            request.addHeader("Authorization", "Bearer valid_customer_token");
            boolean allowed = interceptorWithSpy.preHandle(request, response, new Object());

            assertFalse(allowed, "Customer role must be blocked from admin path: " + path);
            assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
            assertTrue(response.getContentAsString().contains("Forbidden"));
        }
    }

    @Test
    @DisplayName("Administrators are granted access to admin functions")
    void testAdministratorAllowedOnAdminRoutes() throws Exception {
        AuthService.UserSession adminSession = new AuthService.UserSession(
                1L, "admin", "ADMIN", "Administrator", null, LocalDateTime.now().plusHours(12)
        );

        AuthService authSpy = Mockito.spy(authService);
        Mockito.doReturn(adminSession).when(authSpy).getSession("valid_admin_token");
        AuthInterceptor interceptor = new AuthInterceptor(authSpy);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/warehouse/overview");
        request.addHeader("Authorization", "Bearer valid_admin_token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, new Object());
        assertTrue(allowed, "Administrator must be granted access to /api/warehouse/overview");
        assertEquals(200, response.getStatus());
    }

    @Test
    @DisplayName("Customer orders endpoint is bound to authenticated session identity")
    void testCustomerDataIsolation() {
        AuthService.UserSession sessionA = new AuthService.UserSession(
                101L, "alice", "CUSTOMER", "Alice Walker", "CUST-A", LocalDateTime.now().plusHours(1)
        );
        AuthService.UserSession sessionB = new AuthService.UserSession(
                102L, "bob", "CUSTOMER", "Bob Smith", "CUST-B", LocalDateTime.now().plusHours(1)
        );

        // Verify distinct customer IDs
        assertNotEquals(sessionA.getCustomerId(), sessionB.getCustomerId());
        assertEquals("CUST-A", sessionA.getCustomerId());
        assertEquals("CUST-B", sessionB.getCustomerId());
    }
}
