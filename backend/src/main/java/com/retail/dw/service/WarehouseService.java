package com.retail.dw.service;

import com.retail.dw.model.*;
import com.retail.dw.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class WarehouseService {

    private static final Logger log = LoggerFactory.getLogger(WarehouseService.class);

    private final DimCustomerRepository customerRepository;
    private final DimProductRepository productRepository;
    private final DimDateRepository dateRepository;
    private final FactSalesRepository salesRepository;
    private final JdbcTemplate jdbcTemplate;

    public WarehouseService(DimCustomerRepository customerRepository,
                            DimProductRepository productRepository,
                            DimDateRepository dateRepository,
                            FactSalesRepository salesRepository,
                            JdbcTemplate jdbcTemplate) {
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.dateRepository = dateRepository;
        this.salesRepository = salesRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public Map<String, Object> getWarehouseOverview() {
        Map<String, Object> overview = new HashMap<>();
        overview.put("customer_count", customerRepository.count());
        overview.put("product_count", productRepository.count());
        overview.put("date_count", dateRepository.count());
        overview.put("sales_count", salesRepository.countSales());
        overview.put("total_revenue", salesRepository.sumTotalRevenue());
        overview.put("total_quantity", salesRepository.sumTotalQuantity());
        overview.put("avg_sale_amount", salesRepository.avgSaleAmount());
        overview.put("schema_name", "retail_dw");
        overview.put("schema_model", "Star Schema");
        return overview;
    }

    public Map<String, Object> getTableData(String tableName, int limit) {
        Map<String, Object> result = new HashMap<>();
        result.put("table_name", tableName);
        int safeLimit = Math.min(Math.max(limit, 10), 100);

        switch (tableName.toLowerCase()) {
            case "dim_customer":
                result.put("columns", List.of("customer_id", "country"));
                result.put("records", customerRepository.findAll(PageRequest.of(0, safeLimit)).getContent());
                result.put("total_count", customerRepository.count());
                break;
            case "dim_product":
                result.put("columns", List.of("product_id", "stock_code", "description"));
                result.put("records", productRepository.findAll(PageRequest.of(0, safeLimit)).getContent());
                result.put("total_count", productRepository.count());
                break;
            case "dim_date":
                result.put("columns", List.of("date_id", "day", "month", "quarter", "year"));
                result.put("records", dateRepository.findAll(PageRequest.of(0, safeLimit)).getContent());
                result.put("total_count", dateRepository.count());
                break;
            case "fact_sales":
            default:
                result.put("columns", List.of("sale_id", "customer_id", "product_id", "date_id", "quantity", "unit_price", "total_amount"));
                List<Map<String, Object>> factList = jdbcTemplate.queryForList(
                        "SELECT sale_id, customer_id, product_id, date_id, quantity, unit_price, total_amount FROM fact_sales ORDER BY sale_id DESC LIMIT ?", safeLimit);
                result.put("records", factList);
                result.put("total_count", salesRepository.countSales());
                break;
        }

        return result;
    }

    public Map<String, Object> populateFromStarSchemaData(Map<String, Object> starSchemaPayload) {
        return populateFromStarSchemaData(starSchemaPayload, "replace");
    }

    private int parseSafeInt(Object obj, int defaultValue) {
        if (obj == null) return defaultValue;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try {
            return (int) Double.parseDouble(String.valueOf(obj).trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private double parseSafeDouble(Object obj, double defaultValue) {
        if (obj == null) return defaultValue;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try {
            return Double.parseDouble(String.valueOf(obj).trim());
        } catch (Exception e) {
            return defaultValue;
        }
    }

    @Transactional
    public Map<String, Object> populateFromStarSchemaData(Map<String, Object> starSchemaPayload, String mode) {
        log.info("Starting robust warehouse ETL ingestion from star schema payload (mode={})...", mode);
        Map<String, Object> data = (Map<String, Object>) starSchemaPayload.get("data");
        if (data == null) {
            data = starSchemaPayload;
        }

        // 1. Batch Ingest dim_customer
        List<Map<String, Object>> customersList = (List<Map<String, Object>>) data.get("dim_customer");
        int custSaved = 0;
        if (customersList != null && !customersList.isEmpty()) {
            String custSql = "INSERT INTO dim_customer (customer_id, country) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE country = VALUES(country)";
            jdbcTemplate.batchUpdate(custSql, customersList, 500, (ps, c) -> {
                String id = String.valueOf(c.get("customer_id")).trim();
                id = id.length() > 50 ? id.substring(0, 50) : id;
                String country = String.valueOf(c.get("country")).trim();
                country = country.length() > 100 ? country.substring(0, 100) : country;
                ps.setString(1, id.isEmpty() ? "GUEST" : id);
                ps.setString(2, country.isEmpty() ? "Global" : country);
            });
            custSaved = customersList.size();
            log.info("Ingested {} customers into dim_customer.", custSaved);
        }

        // 2. Batch Ingest dim_product
        List<Map<String, Object>> productsList = (List<Map<String, Object>>) data.get("dim_product");
        int prodSaved = 0;
        if (productsList != null && !productsList.isEmpty()) {
            String prodSql = "INSERT INTO dim_product (stock_code, description) VALUES (?, ?) " +
                    "ON DUPLICATE KEY UPDATE description = VALUES(description)";
            jdbcTemplate.batchUpdate(prodSql, productsList, 500, (ps, p) -> {
                String code = String.valueOf(p.get("stock_code")).trim();
                code = code.length() > 50 ? code.substring(0, 50) : code;
                String desc = String.valueOf(p.get("description")).trim();
                desc = desc.length() > 255 ? desc.substring(0, 255) : desc;
                ps.setString(1, code.isEmpty() ? "ITEM" : code);
                ps.setString(2, desc.isEmpty() ? "General Merchandise" : desc);
            });
            prodSaved = productsList.size();
            log.info("Ingested {} products into dim_product.", prodSaved);
        }

        // 3. Batch Ingest dim_date
        List<Map<String, Object>> datesList = (List<Map<String, Object>>) data.get("dim_date");
        int dateSaved = 0;
        if (datesList != null && !datesList.isEmpty()) {
            String dateSql = "INSERT INTO dim_date (date_id, day, month, quarter, year) VALUES (?, ?, ?, ?, ?) " +
                    "ON DUPLICATE KEY UPDATE day=VALUES(day), month=VALUES(month), quarter=VALUES(quarter), year=VALUES(year)";
            jdbcTemplate.batchUpdate(dateSql, datesList, 500, (ps, d) -> {
                int dateId = parseSafeInt(d.get("date_id"), 20260101);
                int day = parseSafeInt(d.get("day"), 1);
                int month = parseSafeInt(d.get("month"), 1);
                int quarter = parseSafeInt(d.get("quarter"), 1);
                int year = parseSafeInt(d.get("year"), 2026);
                ps.setInt(1, dateId);
                ps.setInt(2, day);
                ps.setInt(3, month);
                ps.setInt(4, quarter);
                ps.setInt(5, year);
            });
            dateSaved = datesList.size();
            log.info("Ingested {} dates into dim_date.", dateSaved);
        }

        // 4. Safe Batch Ingestion of fact_sales via Staging Table
        List<Map<String, Object>> factsList = (List<Map<String, Object>>) data.get("fact_sales");
        int factSaved = 0;
        int factSkipped = 0;
        double totalRevenueStaged = 0.0;

        if (factsList != null && !factsList.isEmpty()) {
            // Ensure staging table exists with matching types
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS fact_sales_staging (" +
                    "sale_id BIGINT AUTO_INCREMENT NOT NULL, " +
                    "customer_id VARCHAR(50) NOT NULL, " +
                    "product_id INT NOT NULL, " +
                    "date_id INT NOT NULL, " +
                    "quantity INT NOT NULL, " +
                    "unit_price DECIMAL(10,2) NOT NULL, " +
                    "total_amount DECIMAL(12,2) NOT NULL, " +
                    "PRIMARY KEY (sale_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            jdbcTemplate.update("DELETE FROM fact_sales_staging");

            // Build lookup sets for FK validation
            Map<String, Integer> stockToId = new HashMap<>();
            jdbcTemplate.query("SELECT product_id, stock_code FROM dim_product", (rs) -> {
                stockToId.put(rs.getString("stock_code").trim(), rs.getInt("product_id"));
            });

            Set<String> validCustomers = new HashSet<>(
                    jdbcTemplate.queryForList("SELECT customer_id FROM dim_customer", String.class)
            );

            Set<Integer> validDates = new HashSet<>(
                    jdbcTemplate.queryForList("SELECT date_id FROM dim_date", Integer.class)
            );

            log.info("ETL: Validating and preparing {} fact records for batch staging...", factsList.size());

            List<Object[]> batchRows = new ArrayList<>(factsList.size());

            for (Map<String, Object> f : factsList) {
                String custId = String.valueOf(f.get("customer_id")).trim();
                custId = custId.length() > 50 ? custId.substring(0, 50) : custId;
                if (custId.isEmpty()) custId = "GUEST";

                if (!validCustomers.contains(custId)) {
                    // Auto-repair FK customer on the fly
                    jdbcTemplate.update("INSERT INTO dim_customer (customer_id, country) VALUES (?, ?) " +
                            "ON DUPLICATE KEY UPDATE country=country", custId, "Global");
                    validCustomers.add(custId);
                }

                String stockCode = f.get("stock_code") != null ? String.valueOf(f.get("stock_code")).trim() : "ITEM";
                stockCode = stockCode.length() > 50 ? stockCode.substring(0, 50) : stockCode;
                Integer prodId = stockToId.get(stockCode);
                if (prodId == null) {
                    // Auto-repair FK product on the fly
                    jdbcTemplate.update("INSERT INTO dim_product (stock_code, description) VALUES (?, ?) " +
                            "ON DUPLICATE KEY UPDATE description=description", stockCode, "Product " + stockCode);
                    Integer newId = jdbcTemplate.queryForObject("SELECT product_id FROM dim_product WHERE stock_code = ?", Integer.class, stockCode);
                    prodId = (newId != null) ? newId : 1;
                    stockToId.put(stockCode, prodId);
                }

                int dateId = parseSafeInt(f.get("date_id"), 20260101);
                if (!validDates.contains(dateId)) {
                    // Auto-repair FK date on the fly
                    int y = dateId / 10000;
                    int m = (dateId % 10000) / 100;
                    int d = dateId % 100;
                    int q = (m <= 3) ? 1 : ((m <= 6) ? 2 : ((m <= 9) ? 3 : 4));
                    jdbcTemplate.update("INSERT INTO dim_date (date_id, day, month, quarter, year) VALUES (?, ?, ?, ?, ?) " +
                            "ON DUPLICATE KEY UPDATE day=day", dateId, d, m, q, y);
                    validDates.add(dateId);
                }

                int qty = parseSafeInt(f.get("quantity"), 1);
                double price = parseSafeDouble(f.get("unit_price"), 1.0);
                double total = parseSafeDouble(f.get("total_amount"), qty * price);

                batchRows.add(new Object[]{custId, prodId, dateId, qty, price, total});
                totalRevenueStaged += total;
            }

            // High-speed batch insert into staging table (batches of 1000)
            String stagingSql = "INSERT INTO fact_sales_staging (customer_id, product_id, date_id, quantity, unit_price, total_amount) " +
                    "VALUES (?, ?, ?, ?, ?, ?)";
            jdbcTemplate.batchUpdate(stagingSql, batchRows);
            factSaved = batchRows.size();

            // Publication Gate: Commit into fact_sales
            if (factSaved > 0) {
                boolean isAppend = "append".equalsIgnoreCase(mode);
                if (isAppend) {
                    log.info("ETL: Appending {} verified facts from staging into fact_sales...", factSaved);
                    jdbcTemplate.update("INSERT INTO fact_sales (customer_id, product_id, date_id, quantity, unit_price, total_amount) " +
                            "SELECT customer_id, product_id, date_id, quantity, unit_price, total_amount FROM fact_sales_staging");
                } else {
                    log.info("ETL: Publishing {} verified facts from staging to fact_sales (Clean Swap Mode)...", factSaved);
                    jdbcTemplate.update("DELETE FROM fact_sales");
                    jdbcTemplate.update("INSERT INTO fact_sales (customer_id, product_id, date_id, quantity, unit_price, total_amount) " +
                            "SELECT customer_id, product_id, date_id, quantity, unit_price, total_amount FROM fact_sales_staging");

                    // Prune orphaned dimension records not present in the active dataset
                    try {
                        jdbcTemplate.update("DELETE FROM dim_product WHERE product_id NOT IN (SELECT DISTINCT product_id FROM fact_sales) " +
                                "AND product_id NOT IN (SELECT DISTINCT product_id FROM cart_item)");
                        jdbcTemplate.update("DELETE FROM dim_customer WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM fact_sales) " +
                                "AND customer_id NOT IN (SELECT DISTINCT customer_id FROM app_user WHERE customer_id IS NOT NULL)");
                        jdbcTemplate.update("DELETE FROM dim_date WHERE date_id NOT IN (SELECT DISTINCT date_id FROM fact_sales)");
                    } catch (Exception ex) {
                        log.warn("Non-fatal notice during dimension pruning: {}", ex.getMessage());
                    }
                }
                jdbcTemplate.update("DELETE FROM fact_sales_staging");
                log.info("ETL: Successfully committed {} facts into fact_sales (mode={}).", factSaved, mode);
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("mode", mode);
        res.put("customers_ingested", custSaved);
        res.put("products_ingested", prodSaved);
        res.put("dates_ingested", dateSaved);
        res.put("facts_ingested", factSaved);
        res.put("facts_skipped", factSkipped);
        res.put("total_revenue", Math.round(totalRevenueStaged * 100.0) / 100.0);
        return res;
    }
}
