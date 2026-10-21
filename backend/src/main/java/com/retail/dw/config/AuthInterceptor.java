package com.retail.dw.config;

import com.retail.dw.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Allow CORS pre-flight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();

        // Publicly accessible paths
        if (path.startsWith("/api/auth/") ||
            path.equals("/api/dashboard/stats") ||
            path.startsWith("/api/customer/catalog") ||
            path.equals("/error") ||
            !path.startsWith("/api/")) {
            return true;
        }

        // Extract token
        String authHeader = request.getHeader("Authorization");
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7).trim();
        } else if (authHeader != null) {
            token = authHeader.trim();
        }

        AuthService.UserSession session = authService.getSession(token);

        // Check if unauthenticated
        if (session == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Unauthorized: Valid authentication token is required.\"}");
            return false;
        }

        // Attach session to request attributes for controllers
        request.setAttribute("currentUser", session);

        // Admin-only endpoints protection
        boolean isAdminRoute = path.startsWith("/api/dataset/") ||
                               path.startsWith("/api/warehouse/") ||
                               path.startsWith("/api/olap/") ||
                               (path.startsWith("/api/analytics/") && !path.equals("/api/analytics/recommend"));

        if (isAdminRoute && !"ADMIN".equalsIgnoreCase(session.getRole())) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Forbidden: Administrative privileges required.\"}");
            return false;
        }

        return true;
    }
}
