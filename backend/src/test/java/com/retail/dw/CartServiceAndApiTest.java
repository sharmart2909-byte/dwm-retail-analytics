package com.retail.dw;

import com.retail.dw.config.AuthInterceptor;
import com.retail.dw.controller.CartController;
import com.retail.dw.model.*;
import com.retail.dw.repository.CartItemRepository;
import com.retail.dw.repository.CartRepository;
import com.retail.dw.repository.DimProductRepository;
import com.retail.dw.service.AuthService;
import com.retail.dw.service.CartService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class CartServiceAndApiTest {

    private CartRepository cartRepository;
    private CartItemRepository cartItemRepository;
    private DimProductRepository productRepository;
    private JdbcTemplate jdbcTemplate;
    private CartService cartService;
    private AuthService authService;
    private AuthInterceptor authInterceptor;
    private CartController cartController;

    @BeforeEach
    void setUp() {
        cartRepository = mock(CartRepository.class);
        cartItemRepository = mock(CartItemRepository.class);
        productRepository = mock(DimProductRepository.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        authService = mock(AuthService.class);

        cartService = new CartService(cartRepository, cartItemRepository, productRepository, jdbcTemplate);
        authInterceptor = new AuthInterceptor(authService);
        cartController = new CartController(cartService, authService);
    }

    // =========================================================================
    // 1. Unauthenticated Security & Interceptor Guard Tests
    // =========================================================================

    @Test
    @DisplayName("Unauthenticated requests to cart endpoints are rejected with HTTP 401")
    void testUnauthenticatedCartAccessRejected() throws Exception {
        String[] cartEndpoints = {
                "/api/customer/cart",
                "/api/customer/cart/items",
                "/api/customer/cart/items/1"
        };

        when(authService.getSession(any())).thenReturn(null);

        for (String endpoint : cartEndpoints) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", endpoint);
            MockHttpServletResponse response = new MockHttpServletResponse();
            boolean allowed = authInterceptor.preHandle(request, response, new Object());
            assertFalse(allowed, "Unauthenticated access to " + endpoint + " must be rejected");
            assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        }
    }

    // =========================================================================
    // 2. Add To Cart & Server-Side Price Calculation Tests
    // =========================================================================

    @Test
    @DisplayName("Adding product to cart calculates subtotal and totals using database prices")
    void testAddProductCalculatesTotalsUsingDbPrice() {
        Long userId = 101L;
        String customerId = "17850";
        Integer productId = 1;
        BigDecimal dbPrice = new BigDecimal("4.50");

        DimProduct product = new DimProduct(productId, "85123A", "WHITE HANGING HEART T-LIGHT HOLDER", dbPrice);
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));

        Cart existingCart = new Cart(userId, customerId);
        existingCart.setCartId(10L);
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(existingCart));
        when(cartItemRepository.findByCartCartIdAndProductProductId(10L, productId)).thenReturn(Optional.empty());

        CartItem createdItem = new CartItem(existingCart, product, 3, dbPrice);
        createdItem.setCartItemId(50L);
        when(cartItemRepository.save(any(CartItem.class))).thenReturn(createdItem);
        when(cartItemRepository.findByCartCartId(10L)).thenReturn(List.of(createdItem));

        CartDto result = cartService.addItemToCart(userId, customerId, productId, 3);

        assertNotNull(result);
        assertEquals(1, result.getItemCount());
        assertEquals(3, result.getTotalQuantity());
        // 3 * 4.50 = 13.50
        assertEquals(new BigDecimal("13.50"), result.getTotalAmount());
        assertEquals(1, result.getItems().size());
        assertEquals(new BigDecimal("4.50"), result.getItems().get(0).getUnitPrice());
        assertEquals(new BigDecimal("13.50"), result.getItems().get(0).getSubtotal());
    }

    @Test
    @DisplayName("Adding same product again increments quantity rather than creating duplicate lines")
    void testAddSameProductIncrementsQuantity() {
        Long userId = 101L;
        String customerId = "17850";
        Integer productId = 2;
        BigDecimal dbPrice = new BigDecimal("2.00");

        DimProduct product = new DimProduct(productId, "71053", "WHITE METAL LANTERN", dbPrice);
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));

        Cart existingCart = new Cart(userId, customerId);
        existingCart.setCartId(10L);
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(existingCart));

        CartItem existingItem = new CartItem(existingCart, product, 2, dbPrice);
        existingItem.setCartItemId(51L);
        when(cartItemRepository.findByCartCartIdAndProductProductId(10L, productId)).thenReturn(Optional.of(existingItem));

        when(cartItemRepository.findByCartCartId(10L)).thenAnswer(inv -> {
            return List.of(existingItem);
        });

        CartDto result = cartService.addItemToCart(userId, customerId, productId, 3);

        // Original 2 + newly added 3 = 5
        assertEquals(5, existingItem.getQuantity());
        assertEquals(5, result.getTotalQuantity());
        // 5 * 2.00 = 10.00
        assertEquals(new BigDecimal("10.00"), result.getTotalAmount());
    }

    // =========================================================================
    // 3. Validation Tests (Quantity, Non-existent Product)
    // =========================================================================

    @Test
    @DisplayName("Adding non-existent product ID throws IllegalArgumentException")
    void testAddNonExistentProductThrows() {
        when(productRepository.findById(9999)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> {
            cartService.addItemToCart(101L, "17850", 9999, 1);
        });
    }

    @Test
    @DisplayName("Invalid quantities (<= 0 or > 999) throw IllegalArgumentException")
    void testInvalidQuantityThrows() {
        assertThrows(IllegalArgumentException.class, () -> cartService.addItemToCart(101L, "17850", 1, 0));
        assertThrows(IllegalArgumentException.class, () -> cartService.addItemToCart(101L, "17850", 1, -5));
        assertThrows(IllegalArgumentException.class, () -> cartService.addItemToCart(101L, "17850", 1, 1000));
    }

    // =========================================================================
    // 4. Update Quantity & Remove Items Tests
    // =========================================================================

    @Test
    @DisplayName("Updating quantity recalculates item subtotal and cart total")
    void testUpdateQuantityRecalculatesTotals() {
        Long userId = 101L;
        Long cartItemId = 55L;

        Cart cart = new Cart(userId, "17850");
        cart.setCartId(12L);
        DimProduct product = new DimProduct(3, "84406B", "CREAM CUPID HEARTS COAT HANGER", new BigDecimal("3.00"));
        CartItem item = new CartItem(cart, product, 1, new BigDecimal("3.00"));
        item.setCartItemId(cartItemId);

        when(cartItemRepository.findById(cartItemId)).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartCartId(12L)).thenReturn(List.of(item));

        CartDto result = cartService.updateItemQuantity(userId, cartItemId, 4);

        assertEquals(4, item.getQuantity());
        assertEquals(4, result.getTotalQuantity());
        assertEquals(new BigDecimal("12.00"), result.getTotalAmount());
    }

    @Test
    @DisplayName("Removing item from cart deletes the record and updates cart")
    void testRemoveItemFromCart() {
        Long userId = 101L;
        Long cartItemId = 55L;

        Cart cart = new Cart(userId, "17850");
        cart.setCartId(12L);
        DimProduct product = new DimProduct(3, "84406B", "CREAM CUPID HEARTS COAT HANGER", new BigDecimal("3.00"));
        CartItem item = new CartItem(cart, product, 1, new BigDecimal("3.00"));
        item.setCartItemId(cartItemId);
        cart.getItems().add(item);

        when(cartItemRepository.findById(cartItemId)).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartCartId(12L)).thenReturn(Collections.emptyList());

        CartDto result = cartService.removeItemFromCart(userId, cartItemId);

        verify(cartItemRepository, times(1)).delete(item);
        assertEquals(0, result.getItemCount());
        assertEquals(0, result.getTotalQuantity());
        assertEquals(new BigDecimal("0.00"), result.getTotalAmount());
    }

    // =========================================================================
    // 5. Customer Cart Isolation & Security Guard Tests
    // =========================================================================

    @Test
    @DisplayName("Customer cannot modify or remove another customer's cart items")
    void testCustomerCannotModifyOtherCustomersCart() {
        Long userAliceId = 100L;
        Long userBobId = 200L;
        Long aliceCartItemId = 77L;

        Cart aliceCart = new Cart(userAliceId, "ALICE_CUST");
        aliceCart.setCartId(1L);

        DimProduct product = new DimProduct(1, "85123A", "WHITE HANGING HEART", new BigDecimal("2.50"));
        CartItem aliceItem = new CartItem(aliceCart, product, 2, new BigDecimal("2.50"));
        aliceItem.setCartItemId(aliceCartItemId);

        when(cartItemRepository.findById(aliceCartItemId)).thenReturn(Optional.of(aliceItem));

        // Bob attempts to modify Alice's cart item -> must be blocked
        assertThrows(SecurityException.class, () -> {
            cartService.updateItemQuantity(userBobId, aliceCartItemId, 5);
        });

        // Bob attempts to delete Alice's cart item -> must be blocked
        assertThrows(SecurityException.class, () -> {
            cartService.removeItemFromCart(userBobId, aliceCartItemId);
        });
    }

    @Test
    @DisplayName("Different customers receive distinct and isolated carts")
    void testDistinctCustomersHaveSeparateCarts() {
        Long userAliceId = 100L;
        Long userBobId = 200L;

        Cart aliceCart = new Cart(userAliceId, "ALICE");
        aliceCart.setCartId(1L);
        Cart bobCart = new Cart(userBobId, "BOB");
        bobCart.setCartId(2L);

        when(cartRepository.findByUserId(userAliceId)).thenReturn(Optional.of(aliceCart));
        when(cartRepository.findByUserId(userBobId)).thenReturn(Optional.of(bobCart));

        CartDto aliceDto = cartService.getCartForUser(userAliceId, "ALICE");
        CartDto bobDto = cartService.getCartForUser(userBobId, "BOB");

        assertNotEquals(aliceDto.getCartId(), bobDto.getCartId());
        assertEquals(userAliceId, aliceDto.getUserId());
        assertEquals(userBobId, bobDto.getUserId());
    }

    // =========================================================================
    // 6. Controller HTTP Layer Tests
    // =========================================================================

    @Test
    @DisplayName("CartController handles requests with authenticated session")
    void testCartControllerWithAuthenticatedSession() {
        AuthService.UserSession session = new AuthService.UserSession(
                101L, "customer1", "CUSTOMER", "Customer One", "17850", LocalDateTime.now().plusHours(1)
        );

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("currentUser", session);

        Cart cart = new Cart(101L, "17850");
        cart.setCartId(10L);
        when(cartRepository.findByUserId(101L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartCartId(10L)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = cartController.getCart(null, request);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof CartDto);
    }
}
