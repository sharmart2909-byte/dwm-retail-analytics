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
                        "SELECT sale_id, customer_id, product_id, date_id, quantity, unit_price, total_amount FROM fact_sales LIMIT ?", safeLimit);
                result.put("records", factList);
                result.put("total_count", salesRepository.countSales());
                break;
        }

        return result;
    }

    @Transactional
    public Map<String, Object> populateFromStarSchemaData(Map<String, Object> starSchemaPayload) {
        log.info("Starting warehouse ETL ingestion from star schema payload...");
        Map<String, Object> data = (Map<String, Object>) starSchemaPayload.get("data");
        if (data == null) {
            data = starSchemaPayload;
        }

        // 1. Ingest dim_customer
        List<Map<String, Object>> customersList = (List<Map<String, Object>>) data.get("dim_customer");
        int custSaved = 0;
        if (customersList != null) {
            for (Map<String, Object> c : customersList) {
                String id = String.valueOf(c.get("customer_id"));
                String country = String.valueOf(c.get("country"));
                jdbcTemplate.update("INSERT INTO dim_customer (customer_id, country) VALUES (?, ?) " +
                        "ON DUPLICATE KEY UPDATE country = VALUES(country)", id, country);
                custSaved++;
            }
        }

        // 2. Ingest dim_product
        List<Map<String, Object>> productsList = (List<Map<String, Object>>) data.get("dim_product");
        int prodSaved = 0;
        if (productsList != null) {
            for (Map<String, Object> p : productsList) {
                String code = String.valueOf(p.get("stock_code"));
                String desc = String.valueOf(p.get("description"));
                jdbcTemplate.update("INSERT INTO dim_product (stock_code, description) VALUES (?, ?) " +
                        "ON DUPLICATE KEY UPDATE description = VALUES(description)", code, desc);
                prodSaved++;
            }
        }

        // 3. Ingest dim_date
        List<Map<String, Object>> datesList = (List<Map<String, Object>>) data.get("dim_date");
        int dateSaved = 0;
        if (datesList != null) {
            for (Map<String, Object> d : datesList) {
                int dateId = ((Number) d.get("date_id")).intValue();
                int day = ((Number) d.get("day")).intValue();
                int month = ((Number) d.get("month")).intValue();
                int quarter = ((Number) d.get("quarter")).intValue();
                int year = ((Number) d.get("year")).intValue();
                jdbcTemplate.update("INSERT INTO dim_date (date_id, day, month, quarter, year) VALUES (?, ?, ?, ?, ?) " +
                        "ON DUPLICATE KEY UPDATE day=VALUES(day), month=VALUES(month), quarter=VALUES(quarter), year=VALUES(year)",
                        dateId, day, month, quarter, year);
                dateSaved++;
            }
        }

        // 4. Ingest fact_sales
        List<Map<String, Object>> factsList = (List<Map<String, Object>>) data.get("fact_sales");
        int factSaved = 0;
        if (factsList != null) {
            // Fetch product code to id lookup
            Map<String, Integer> stockToId = new HashMap<>();
            jdbcTemplate.query("SELECT product_id, stock_code FROM dim_product", (rs) -> {
                stockToId.put(rs.getString("stock_code"), rs.getInt("product_id"));
            });

            // Clean previous facts or append
            jdbcTemplate.update("TRUNCATE TABLE fact_sales");

            for (Map<String, Object> f : factsList) {
                String custId = String.valueOf(f.get("customer_id"));
                int prodId = ((Number) f.get("product_id")).intValue();
                int dateId = ((Number) f.get("date_id")).intValue();
                int qty = ((Number) f.get("quantity")).intValue();
                double price = ((Number) f.get("unit_price")).doubleValue();
                double total = ((Number) f.get("total_amount")).doubleValue();

                jdbcTemplate.update("INSERT INTO fact_sales (customer_id, product_id, date_id, quantity, unit_price, total_amount) " +
                        "VALUES (?, ?, ?, ?, ?, ?)", custId, prodId, dateId, qty, price, total);
                factSaved++;
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("status", "success");
        res.put("customers_ingested", custSaved);
        res.put("products_ingested", prodSaved);
        res.put("dates_ingested", dateSaved);
        res.put("facts_ingested", factSaved);
        return res;
    }
}
