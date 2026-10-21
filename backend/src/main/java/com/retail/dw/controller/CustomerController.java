package com.retail.dw.controller;

import com.retail.dw.repository.DimProductRepository;
import com.retail.dw.service.AuthService;
import com.retail.dw.service.PythonServiceBridge;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/customer")
@CrossOrigin(originPatterns = "*")
public class CustomerController {

    private final AuthService authService;
    private final JdbcTemplate jdbcTemplate;
    private final DimProductRepository productRepository;
    private final PythonServiceBridge pythonServiceBridge;

    public CustomerController(AuthService authService,
                              JdbcTemplate jdbcTemplate,
                              DimProductRepository productRepository,
                              PythonServiceBridge pythonServiceBridge) {
        this.authService = authService;
        this.jdbcTemplate = jdbcTemplate;
        this.productRepository = productRepository;
        this.pythonServiceBridge = pythonServiceBridge;
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getCustomerOrders(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        AuthService.UserSession session = getSession(authHeader);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        String customerId = session.getCustomerId();
        if (customerId == null || customerId.isBlank()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        String sql = "SELECT f.sale_id, f.date_id, d.day, d.month, d.year, " +
                "p.stock_code, p.description, f.quantity, f.unit_price, f.total_amount " +
                "FROM fact_sales f " +
                "JOIN dim_product p ON f.product_id = p.product_id " +
                "JOIN dim_date d ON f.date_id = d.date_id " +
                "WHERE f.customer_id = ? " +
                "ORDER BY f.date_id DESC, f.sale_id DESC LIMIT 100";

        List<Map<String, Object>> orders = jdbcTemplate.queryForList(sql, customerId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/catalog")
    public ResponseEntity<?> getProductCatalog(@RequestParam(value = "search", required = false) String search,
                                              @RequestParam(value = "limit", defaultValue = "50") int limit) {
        String sql;
        List<Map<String, Object>> products;
        if (search != null && !search.isBlank()) {
            sql = "SELECT product_id, stock_code, description, COALESCE(unit_price, 2.99) as unit_price FROM dim_product " +
                    "WHERE description LIKE ? OR stock_code LIKE ? LIMIT ?";
            String pattern = "%" + search.trim() + "%";
            products = jdbcTemplate.queryForList(sql, pattern, pattern, limit);
        } else {
            sql = "SELECT product_id, stock_code, description, COALESCE(unit_price, 2.99) as unit_price FROM dim_product ORDER BY description ASC LIMIT ?";
            products = jdbcTemplate.queryForList(sql, limit);
        }
        return ResponseEntity.ok(products);
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<?> getProductDetails(@PathVariable("id") Integer id) {
        String sql = "SELECT product_id, stock_code, description, COALESCE(unit_price, 2.99) as unit_price FROM dim_product WHERE product_id = ? LIMIT 1";
        List<Map<String, Object>> list = jdbcTemplate.queryForList(sql, id);
        if (list.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Product not found"));
        }
        return ResponseEntity.ok(list.get(0));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<?> getCustomerRecommendations(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "stock_code", required = false) String stockCode,
            @RequestParam(value = "productId", required = false) String productId) {

        AuthService.UserSession session = getSession(authHeader);
        String targetCode = (stockCode != null && !stockCode.isBlank()) ? stockCode : productId;

        boolean isExplicitStockCode = (targetCode != null && !targetCode.isBlank());
        boolean hasPurchaseHistory = false;
        String recommendationSource = "default";
        String basisProductDescription = "";

        if (isExplicitStockCode) {
            targetCode = targetCode.trim();
            recommendationSource = "product_view";
            try {
                // If targetCode matches product_id (numeric), resolve to actual stock_code
                List<Map<String, Object>> resolved = jdbcTemplate.queryForList(
                        "SELECT stock_code, description FROM dim_product WHERE stock_code = ? OR product_id = ? LIMIT 1",
                        targetCode, targetCode);
                if (!resolved.isEmpty()) {
                    targetCode = String.valueOf(resolved.get(0).get("stock_code"));
                    basisProductDescription = String.valueOf(resolved.get(0).get("description"));
                }
            } catch (Exception ignored) {}
        } else if (session != null && session.getCustomerId() != null && !session.getCustomerId().isBlank()) {
            // Customer is viewing their personalized recommendations tab: check real purchase history
            try {
                String lastProductSql = "SELECT p.stock_code, p.description, COUNT(*) as cnt " +
                        "FROM fact_sales f " +
                        "JOIN dim_product p ON f.product_id = p.product_id " +
                        "WHERE f.customer_id = ? " +
                        "GROUP BY p.stock_code, p.description " +
                        "ORDER BY cnt DESC, MAX(f.date_id) DESC LIMIT 1";
                List<Map<String, Object>> topPurchased = jdbcTemplate.queryForList(lastProductSql, session.getCustomerId());
                if (!topPurchased.isEmpty()) {
                    targetCode = String.valueOf(topPurchased.get(0).get("stock_code"));
                    basisProductDescription = String.valueOf(topPurchased.get(0).get("description"));
                    hasPurchaseHistory = true;
                    recommendationSource = "customer_purchase_history";
                }
            } catch (Exception ignored) {}
        }

        if (targetCode == null || targetCode.isBlank()) {
            // New customer without purchase history
            List<Map<String, Object>> bestsellers = Collections.emptyList();
            try {
                String bestsellerSql = "SELECT p.product_id, p.stock_code, p.description, COALESCE(p.unit_price, 2.99) as unit_price, SUM(f.quantity) as total_sold " +
                        "FROM fact_sales f JOIN dim_product p ON f.product_id = p.product_id " +
                        "GROUP BY p.product_id, p.stock_code, p.description, p.unit_price ORDER BY total_sold DESC LIMIT 6";
                bestsellers = jdbcTemplate.queryForList(bestsellerSql);
            } catch (Exception ignored) {}

            Map<String, Object> newCustomerResponse = new HashMap<>();
            newCustomerResponse.put("success", true);
            Map<String, Object> data = new HashMap<>();
            data.put("has_purchase_history", false);
            data.put("is_new_customer", true);
            data.put("recommendation_mode", "new_customer_welcome");
            data.put("message", "Welcome! Since your account does not have previous orders, explore our store catalog or top bestsellers below to view real-time association recommendations.");
            data.put("bestsellers", bestsellers);
            data.put("recommendations", Collections.emptyList());
            newCustomerResponse.put("data", data);
            return ResponseEntity.ok(newCustomerResponse);
        }

        Map<String, Object> recResult = pythonServiceBridge.runRecommendation(targetCode, 6);
        if (recResult != null && recResult.containsKey("data") && recResult.get("data") instanceof Map) {
            Map<String, Object> dataMap = (Map<String, Object>) recResult.get("data");
            dataMap.put("has_purchase_history", hasPurchaseHistory);
            dataMap.put("is_new_customer", !isExplicitStockCode && !hasPurchaseHistory);
            dataMap.put("recommendation_source", recommendationSource);
            if (!basisProductDescription.isBlank()) {
                dataMap.put("query_product_name", basisProductDescription);
            }
            if (hasPurchaseHistory) {
                dataMap.put("personalized_reason", "Recommended based on your past purchase: " + basisProductDescription + " (SKU: " + targetCode + ")");
            } else if (isExplicitStockCode) {
                dataMap.put("personalized_reason", "Frequently purchased together with: " + (basisProductDescription.isBlank() ? targetCode : basisProductDescription));
            }

            // Enrich recommendations with product_id and unit_price
            if (dataMap.containsKey("recommendations") && dataMap.get("recommendations") instanceof List) {
                List<Map<String, Object>> recList = (List<Map<String, Object>>) dataMap.get("recommendations");
                for (Map<String, Object> item : recList) {
                    if (item.containsKey("stock_code")) {
                        String sc = String.valueOf(item.get("stock_code"));
                        try {
                            List<Map<String, Object>> pInfo = jdbcTemplate.queryForList(
                                    "SELECT product_id, COALESCE(unit_price, 2.99) as unit_price FROM dim_product WHERE stock_code = ? LIMIT 1", sc);
                            if (!pInfo.isEmpty()) {
                                item.put("product_id", pInfo.get(0).get("product_id"));
                                item.put("unit_price", pInfo.get(0).get("unit_price"));
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }
        }
        return ResponseEntity.ok(recResult);
    }

    private AuthService.UserSession getSession(String authHeader) {
        if (authHeader == null) return null;
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader.trim();
        return authService.getSession(token);
    }
}
