package com.retail.dw.controller;

import com.retail.dw.model.CartDto;
import com.retail.dw.service.AuthService;
import com.retail.dw.service.CartService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/customer/cart")
@CrossOrigin(originPatterns = "*")
public class CartController {

    private final CartService cartService;
    private final AuthService authService;

    public CartController(CartService cartService, AuthService authService) {
        this.cartService = cartService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<?> getCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        AuthService.UserSession session = resolveSession(authHeader, request);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to access cart."));
        }

        try {
            CartDto cart = cartService.getCartForUser(session.getUserId(), session.getCustomerId());
            return ResponseEntity.ok(cart);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve cart: " + e.getMessage()));
        }
    }

    @PostMapping("/items")
    public ResponseEntity<?> addItem(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        AuthService.UserSession session = resolveSession(authHeader, request);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to modify cart."));
        }

        try {
            if (!payload.containsKey("productId")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "productId is required."));
            }

            Integer productId = ((Number) payload.get("productId")).intValue();
            int quantity = payload.containsKey("quantity") ? ((Number) payload.get("quantity")).intValue() : 1;

            CartDto updatedCart = cartService.addItemToCart(session.getUserId(), session.getCustomerId(), productId, quantity);
            return ResponseEntity.ok(updatedCart);
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", iae.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to add item to cart: " + e.getMessage()));
        }
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateItemQuantity(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("itemId") Long itemId,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {
        AuthService.UserSession session = resolveSession(authHeader, request);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to update cart."));
        }

        try {
            if (!payload.containsKey("quantity")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "quantity is required."));
            }

            int quantity = ((Number) payload.get("quantity")).intValue();
            CartDto updatedCart = cartService.updateItemQuantity(session.getUserId(), itemId, quantity);
            return ResponseEntity.ok(updatedCart);
        } catch (SecurityException se) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", se.getMessage()));
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", iae.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update item quantity: " + e.getMessage()));
        }
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeItem(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable("itemId") Long itemId,
            HttpServletRequest request) {
        AuthService.UserSession session = resolveSession(authHeader, request);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to remove items from cart."));
        }

        try {
            CartDto updatedCart = cartService.removeItemFromCart(session.getUserId(), itemId);
            return ResponseEntity.ok(updatedCart);
        } catch (SecurityException se) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", se.getMessage()));
        } catch (IllegalArgumentException iae) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", iae.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to remove item from cart: " + e.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> clearCart(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        AuthService.UserSession session = resolveSession(authHeader, request);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to clear cart."));
        }

        try {
            CartDto clearedCart = cartService.clearCart(session.getUserId());
            return ResponseEntity.ok(clearedCart);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to clear cart: " + e.getMessage()));
        }
    }

    private AuthService.UserSession resolveSession(String authHeader, HttpServletRequest request) {
        if (request != null) {
            Object userAttr = request.getAttribute("currentUser");
            if (userAttr instanceof AuthService.UserSession) {
                return (AuthService.UserSession) userAttr;
            }
        }
        if (authHeader == null) return null;
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader.trim();
        return authService.getSession(token);
    }
}
