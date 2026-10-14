package com.retail.dw.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OlapService {

    private static final Logger log = LoggerFactory.getLogger(OlapService.class);
    private final JdbcTemplate jdbcTemplate;

    public OlapService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * OLAP ROLL-UP: Summarizes measures along dimension hierarchies.
     * Hierarchy 1: Time dimension (Month -> Quarter -> Year)
     * Hierarchy 2: Geography dimension (Country -> Total)
     */
    public Map<String, Object> executeRollup(String dimension) {
        long t0 = System.currentTimeMillis();
        String sql;
        String title;
        String explanation;

        if ("geography".equalsIgnoreCase(dimension)) {
            title = "OLAP Roll-up: Country Geography Dimension";
            explanation = "Rolls up sales figures from individual countries to a global total aggregate using WITH ROLLUP.";
            sql = "SELECT " +
                  "  COALESCE(c.country, 'ALL COUNTRIES (ROLLUP TOTAL)') AS country, " +
                  "  COUNT(f.sale_id) AS total_transactions, " +
                  "  SUM(f.quantity) AS total_units_sold, " +
                  "  ROUND(SUM(f.total_amount), 2) AS total_revenue, " +
                  "  ROUND(AVG(f.total_amount), 2) AS avg_order_value " +
                  "FROM fact_sales f " +
                  "JOIN dim_customer c ON f.customer_id = c.customer_id " +
                  "GROUP BY c.country WITH ROLLUP";
        } else {
            title = "OLAP Roll-up: Temporal Dimension (Year & Quarter Hierarchy)";
            explanation = "Aggregates detailed transactions upwards to Quarter and Year levels, reducing granularity.";
            sql = "SELECT " +
                  "  COALESCE(CAST(d.year AS CHAR), 'ALL YEARS') AS year, " +
                  "  COALESCE(CAST(d.quarter AS CHAR), 'ALL QUARTERS') AS quarter, " +
                  "  COUNT(f.sale_id) AS transaction_count, " +
                  "  SUM(f.quantity) AS total_quantity, " +
                  "  ROUND(SUM(f.total_amount), 2) AS total_revenue " +
                  "FROM fact_sales f " +
                  "JOIN dim_date d ON f.date_id = d.date_id " +
                  "GROUP BY d.year, d.quarter WITH ROLLUP";
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        long execTime = System.currentTimeMillis() - t0;

        Map<String, Object> response = new HashMap<>();
        response.put("operation", "ROLL-UP");
        response.put("title", title);
        response.put("sql_query", sql);
        response.put("execution_time_ms", execTime);
        response.put("result_count", rows.size());
        response.put("rows", rows);
        response.put("viva_explanation", explanation);
        return response;
    }

    /**
     * OLAP DRILL-DOWN: Navigates from higher-level summary data to lower-level details.
     * Breaks down sales into Year -> Month -> Day -> Product detail.
     */
    public Map<String, Object> executeDrillDown(Integer year, Integer month) {
        long t0 = System.currentTimeMillis();
        int targetYear = (year != null && year > 0) ? year : 2011;
        int targetMonth = (month != null && month > 0) ? month : 12;

        String sql = "SELECT " +
                     "  d.year, " +
                     "  d.quarter, " +
                     "  d.month, " +
                     "  d.day, " +
                     "  p.stock_code, " +
                     "  p.description, " +
                     "  SUM(f.quantity) AS units_sold, " +
                     "  ROUND(SUM(f.total_amount), 2) AS revenue " +
                     "FROM fact_sales f " +
                     "JOIN dim_date d ON f.date_id = d.date_id " +
                     "JOIN dim_product p ON f.product_id = p.product_id " +
                     "WHERE d.year = " + targetYear + " AND d.month = " + targetMonth + " " +
                     "GROUP BY d.year, d.quarter, d.month, d.day, p.stock_code, p.description " +
                     "ORDER BY revenue DESC LIMIT 50";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        long execTime = System.currentTimeMillis() - t0;

        Map<String, Object> response = new HashMap<>();
        response.put("operation", "DRILL-DOWN");
        response.put("title", "OLAP Drill-down: Year " + targetYear + " -> Month " + targetMonth + " -> Daily Product Breakdown");
        response.put("sql_query", sql);
        response.put("execution_time_ms", execTime);
        response.put("result_count", rows.size());
        response.put("rows", rows);
        response.put("viva_explanation", "Drill-down increases data granularity, decomposing monthly aggregates into specific daily product transactions.");
        return response;
    }

    /**
     * OLAP SLICE: Filters along a single dimension, cutting a 1D slice out of the multidimensional cube.
     */
    public Map<String, Object> executeSlice(String dimension, String value) {
        long t0 = System.currentTimeMillis();
        String sql;
        String title;
        List<Map<String, Object>> rows;

        if ("year".equalsIgnoreCase(dimension)) {
            int yearVal = 2011;
            try {
                if (value != null) yearVal = Integer.parseInt(value);
            } catch (Exception ignored) {}
            title = "OLAP Slice: Filtered by Dimension Year = " + yearVal;
            sql = "SELECT " +
                  "  c.country, " +
                  "  d.year, " +
                  "  COUNT(f.sale_id) AS transactions, " +
                  "  SUM(f.quantity) AS total_units, " +
                  "  ROUND(SUM(f.total_amount), 2) AS total_revenue " +
                  "FROM fact_sales f " +
                  "JOIN dim_customer c ON f.customer_id = c.customer_id " +
                  "JOIN dim_date d ON f.date_id = d.date_id " +
                  "WHERE d.year = " + yearVal + " " +
                  "GROUP BY c.country, d.year " +
                  "ORDER BY total_revenue DESC";
            rows = jdbcTemplate.queryForList(sql);
        } else {
            String countryVal = (value != null && !value.isBlank()) ? value : "United Kingdom";
            title = "OLAP Slice: Filtered by Dimension Country = '" + countryVal + "'";
            sql = "SELECT " +
                  "  d.year, " +
                  "  d.month, " +
                  "  p.stock_code, " +
                  "  p.description, " +
                  "  SUM(f.quantity) AS units_sold, " +
                  "  ROUND(SUM(f.total_amount), 2) AS sliced_revenue " +
                  "FROM fact_sales f " +
                  "JOIN dim_customer c ON f.customer_id = c.customer_id " +
                  "JOIN dim_date d ON f.date_id = d.date_id " +
                  "JOIN dim_product p ON f.product_id = p.product_id " +
                  "WHERE c.country = ? " +
                  "GROUP BY d.year, d.month, p.stock_code, p.description " +
                  "ORDER BY sliced_revenue DESC LIMIT 30";
            rows = jdbcTemplate.queryForList(sql, countryVal);
        }

        long execTime = System.currentTimeMillis() - t0;

        Map<String, Object> response = new HashMap<>();
        response.put("operation", "SLICE");
        response.put("title", title);
        response.put("sql_query", sql);
        response.put("execution_time_ms", execTime);
        response.put("result_count", rows.size());
        response.put("rows", rows);
        response.put("viva_explanation", "Slice extracts a single sub-cube dimension slice (1 predicate filter), keeping all other dimensions visible.");
        return response;
    }

    /**
     * OLAP DICE: Selects two or more dimensions simultaneously, forming a specialized sub-cube.
     */
    public Map<String, Object> executeDice(String countries, Integer quarter, Integer year) {
        long t0 = System.currentTimeMillis();
        int targetQuarter = (quarter != null && quarter >= 1 && quarter <= 4) ? quarter : 4;
        int targetYear = (year != null && year > 0) ? year : 2011;

        String sql = "SELECT " +
                     "  c.country, " +
                     "  d.year, " +
                     "  d.quarter, " +
                     "  p.stock_code, " +
                     "  p.description, " +
                     "  SUM(f.quantity) AS diced_units, " +
                     "  ROUND(SUM(f.total_amount), 2) AS diced_revenue " +
                     "FROM fact_sales f " +
                     "JOIN dim_customer c ON f.customer_id = c.customer_id " +
                     "JOIN dim_date d ON f.date_id = d.date_id " +
                     "JOIN dim_product p ON f.product_id = p.product_id " +
                     "WHERE c.country IN ('United Kingdom', 'France', 'Germany', 'Australia') " +
                     "  AND d.quarter = " + targetQuarter + " " +
                     "  AND d.year = " + targetYear + " " +
                     "GROUP BY c.country, d.year, d.quarter, p.stock_code, p.description " +
                     "ORDER BY diced_revenue DESC LIMIT 30";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        long execTime = System.currentTimeMillis() - t0;

        Map<String, Object> response = new HashMap<>();
        response.put("operation", "DICE");
        response.put("title", "OLAP Dice: Country IN ('UK','France','Germany','Australia') AND Quarter = " + targetQuarter + " AND Year = " + targetYear);
        response.put("sql_query", sql);
        response.put("execution_time_ms", execTime);
        response.put("result_count", rows.size());
        response.put("rows", rows);
        response.put("viva_explanation", "Dice constructs a sub-cube by imposing filters on multiple dimensions simultaneously (Geography AND Temporal Dimensions).");
        return response;
    }
}
