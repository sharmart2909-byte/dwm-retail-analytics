package com.retail.dw.service;

import com.retail.dw.model.*;
import com.retail.dw.repository.CartItemRepository;
import com.retail.dw.repository.CartRepository;
import com.retail.dw.repository.DimProductRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CartService {

    private static final Logger log = LoggerFactory.getLogger(CartService.class);
    private static final BigDecimal DEFAULT_PRICE = BigDecimal.valueOf(2.99);

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final DimProductRepository productRepository;
    private final JdbcTemplate jdbcTemplate;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       DimProductRepository productRepository,
                       JdbcTemplate jdbcTemplate) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initDatabaseAndPrices() {
        try {
            // 1. Ensure cart and cart_item tables exist safely
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS cart (" +
                    "cart_id BIGINT AUTO_INCREMENT NOT NULL, " +
                    "user_id BIGINT NOT NULL, " +
                    "customer_id VARCHAR(50), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
                    "PRIMARY KEY (cart_id), " +
                    "UNIQUE KEY uq_cart_user (user_id), " +
                    "KEY idx_cart_customer (customer_id)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS cart_item (" +
                    "cart_item_id BIGINT AUTO_INCREMENT NOT NULL, " +
                    "cart_id BIGINT NOT NULL, " +
                    "product_id INT NOT NULL, " +
                    "quantity INT NOT NULL DEFAULT 1, " +
                    "unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
                    "PRIMARY KEY (cart_item_id), " +
                    "UNIQUE KEY uq_cart_product (cart_id, product_id), " +
                    "KEY idx_cart_item_cart (cart_id), " +
                    "KEY idx_cart_item_product (product_id)" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // 2. Ensure unit_price column exists on dim_product
            try {
                jdbcTemplate.execute("ALTER TABLE dim_product ADD COLUMN unit_price DECIMAL(10,2) DEFAULT 2.99");
                log.info("Added unit_price column to dim_product.");
            } catch (Exception e) {
                // Column likely already exists
            }

            // 3. Populate product unit prices from fact_sales where NULL
            try {
                int updated = jdbcTemplate.update(
                        "UPDATE dim_product p " +
                        "JOIN (" +
                        "   SELECT product_id, ROUND(AVG(unit_price), 2) as avg_price " +
                        "   FROM fact_sales " +
                        "   WHERE unit_price > 0 " +
                        "   GROUP BY product_id" +
                        ") fs ON p.product_id = fs.product_id " +
                        "SET p.unit_price = fs.avg_price " +
                        "WHERE p.unit_price IS NULL OR p.unit_price <= 0"
                );
                log.info("Initialized {} product prices from historical fact_sales transactions.", updated);

                jdbcTemplate.update("UPDATE dim_product SET unit_price = 2.99 WHERE unit_price IS NULL OR unit_price <= 0");
            } catch (Exception e) {
                log.warn("Price backfill notice: {}", e.getMessage());
            }

        } catch (Exception e) {
            log.warn("Cart table check/init notice: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public CartDto getCartForUser(Long userId, String customerId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }
        Cart cart = getOrCreateCart(userId, customerId);
        return convertToDto(cart);
    }

    @Transactional
    public CartDto addItemToCart(Long userId, String customerId, Integer productId, int quantity) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }
        if (productId == null) {
            throw new IllegalArgumentException("Product ID is required.");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1.");
        }
        if (quantity > 999) {
            throw new IllegalArgumentException("Quantity exceeds maximum limit of 999.");
        }

        // Validate product exists in database catalog
        DimProduct product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product with ID " + productId + " does not exist in catalog."));

        // Determine authoritative price from database
        BigDecimal authoritativePrice = product.getUnitPrice();
        if (authoritativePrice == null || authoritativePrice.compareTo(BigDecimal.ZERO) <= 0) {
            authoritativePrice = DEFAULT_PRICE;
        }

        Cart cart = getOrCreateCart(userId, customerId);

        // Check if product is already in the cart
        Optional<CartItem> existingItemOpt = cartItemRepository.findByCartCartIdAndProductProductId(cart.getCartId(), productId);

        if (existingItemOpt.isPresent()) {
            CartItem existingItem = existingItemOpt.get();
            int updatedQty = Math.min(existingItem.getQuantity() + quantity, 999);
            existingItem.setQuantity(updatedQty);
            // Refresh price in case product price was updated in database
            existingItem.setUnitPrice(authoritativePrice);
            existingItem.setUpdatedAt(LocalDateTime.now());
            cartItemRepository.save(existingItem);
        } else {
            CartItem newItem = new CartItem(cart, product, quantity, authoritativePrice);
            cartItemRepository.save(newItem);
            cart.getItems().add(newItem);
        }

        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        return convertToDto(cart);
    }

    @Transactional
    public CartDto updateItemQuantity(Long userId, Long cartItemId, int newQuantity) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }
        if (cartItemId == null) {
            throw new IllegalArgumentException("Cart Item ID is required.");
        }
        if (newQuantity <= 0) {
            throw new IllegalArgumentException("Quantity must be at least 1. Use remove to delete item.");
        }
        if (newQuantity > 999) {
            throw new IllegalArgumentException("Quantity exceeds maximum limit of 999.");
        }

        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Cart item with ID " + cartItemId + " not found."));

        // Security check: isolate cart by customer
        if (!cartItem.getCart().getUserId().equals(userId)) {
            log.warn("Unauthorized attempt by user {} to modify cart item {} belonging to user {}",
                    userId, cartItemId, cartItem.getCart().getUserId());
            throw new SecurityException("Access denied: You cannot modify cart items belonging to another customer.");
        }

        cartItem.setQuantity(newQuantity);
        cartItem.setUpdatedAt(LocalDateTime.now());
        cartItemRepository.save(cartItem);

        Cart cart = cartItem.getCart();
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        return convertToDto(cart);
    }

    @Transactional
    public CartDto removeItemFromCart(Long userId, Long cartItemId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }
        if (cartItemId == null) {
            throw new IllegalArgumentException("Cart Item ID is required.");
        }

        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Cart item with ID " + cartItemId + " not found."));

        // Security check: isolate cart by customer
        if (!cartItem.getCart().getUserId().equals(userId)) {
            log.warn("Unauthorized attempt by user {} to remove cart item {} belonging to user {}",
                    userId, cartItemId, cartItem.getCart().getUserId());
            throw new SecurityException("Access denied: You cannot modify cart items belonging to another customer.");
        }

        Cart cart = cartItem.getCart();
        cartItemRepository.delete(cartItem);
        cart.getItems().remove(cartItem);

        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        return convertToDto(cart);
    }

    @Transactional
    public CartDto clearCart(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }

        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isPresent()) {
            Cart cart = cartOpt.get();
            cartItemRepository.deleteByCartCartId(cart.getCartId());
            cart.getItems().clear();
            cart.setUpdatedAt(LocalDateTime.now());
            cartRepository.save(cart);
            return convertToDto(cart);
        }

        Cart newCart = new Cart(userId, null);
        return convertToDto(newCart);
    }

    private Cart getOrCreateCart(Long userId, String customerId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart c = new Cart(userId, customerId);
            return cartRepository.save(c);
        });
    }

    public CartDto convertToDto(Cart cart) {
        CartDto dto = new CartDto();
        dto.setCartId(cart.getCartId());
        dto.setUserId(cart.getUserId());
        dto.setCustomerId(cart.getCustomerId());
        dto.setUpdatedAt(cart.getUpdatedAt());

        List<CartItem> items = (cart.getCartId() != null)
                ? cartItemRepository.findByCartCartId(cart.getCartId())
                : Collections.emptyList();

        List<CartDto.CartItemDto> itemDtos = new ArrayList<>();
        int totalQty = 0;
        BigDecimal totalAmt = BigDecimal.ZERO;

        for (CartItem item : items) {
            BigDecimal price = item.getUnitPrice() != null ? item.getUnitPrice() : DEFAULT_PRICE;
            int qty = (item.getQuantity() != null && item.getQuantity() > 0) ? item.getQuantity() : 1;
            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);

            DimProduct prod = item.getProduct();
            String stockCode = prod != null ? prod.getStockCode() : "N/A";
            String description = prod != null ? prod.getDescription() : "Product";
            Integer prodId = prod != null ? prod.getProductId() : null;

            itemDtos.add(new CartDto.CartItemDto(
                    item.getCartItemId(),
                    prodId,
                    stockCode,
                    description,
                    qty,
                    price,
                    subtotal
            ));

            totalQty += qty;
            totalAmt = totalAmt.add(subtotal);
        }

        dto.setItems(itemDtos);
        dto.setItemCount(itemDtos.size());
        dto.setTotalQuantity(totalQty);
        dto.setTotalAmount(totalAmt.setScale(2, RoundingMode.HALF_UP));

        return dto;
    }
}
