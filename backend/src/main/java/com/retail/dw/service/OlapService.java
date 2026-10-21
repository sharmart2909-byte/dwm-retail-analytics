package com.retail.dw.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class OlapService {

    private static final Logger log = LoggerFactory.getLogger(OlapService.class);
    private final JdbcTemplate jdbcTemplate;

    public OlapService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Retrieves active dimension options (years, months, quarters, top countries)
     * derived from the latest synchronized dataset.
     */
    public Map<String, Object> getOlapOptions() {
        Map<String, Object> options = new HashMap<>();

        List<Integer> years = jdbcTemplate.queryForList(
                "SELECT DISTINCT d.year FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.year DESC",
                Integer.class
        );
        if (years.isEmpty()) {
            years = jdbcTemplate.queryForList("SELECT DISTINCT year FROM dim_date ORDER BY year DESC", Integer.class);
        }

        List<Integer> months = jdbcTemplate.queryForList(
                "SELECT DISTINCT d.month FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.month ASC",
                Integer.class
        );
        if (months.isEmpty()) {
            months = List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
        }

        List<Integer> quarters = jdbcTemplate.queryForList(
                "SELECT DISTINCT d.quarter FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.quarter ASC",
                Integer.class
        );
        if (quarters.isEmpty()) {
            quarters = List.of(1, 2, 3, 4);
        }

        List<String> countries = jdbcTemplate.queryForList(
                "SELECT c.country FROM fact_sales f JOIN dim_customer c ON f.customer_id = c.customer_id " +
                "GROUP BY c.country ORDER BY SUM(f.total_amount) DESC LIMIT 20",
                String.class
        );
        if (countries.isEmpty()) {
            countries = jdbcTemplate.queryForList("SELECT DISTINCT country FROM dim_customer LIMIT 20", String.class);
        }

        options.put("years", years);
        options.put("months", months);
        options.put("quarters", quarters);
        options.put("countries", countries);
        return options;
    }

    /**
     * OLAP ROLL-UP: Summarizes measures along dimension hierarchies.
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
     */
    public Map<String, Object> executeDrillDown(Integer year, Integer month) {
        long t0 = System.currentTimeMillis();

        // Dynamically resolve targetYear from active warehouse if not specified
        int targetYear;
        if (year != null && year > 0) {
            targetYear = year;
        } else {
            List<Integer> availYears = jdbcTemplate.queryForList(
                    "SELECT DISTINCT d.year FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.year DESC LIMIT 1",
                    Integer.class
            );
            targetYear = !availYears.isEmpty() ? availYears.get(0) : 2026;
        }

        // Dynamically resolve targetMonth from active warehouse
        int targetMonth;
        if (month != null && month > 0) {
            targetMonth = month;
        } else {
            List<Integer> availMonths = jdbcTemplate.queryForList(
                    "SELECT DISTINCT d.month FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id WHERE d.year = ? ORDER BY d.month DESC LIMIT 1",
                    Integer.class, targetYear
            );
            targetMonth = !availMonths.isEmpty() ? availMonths.get(0) : 1;
        }

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
                     "WHERE d.year = ? AND d.month = ? " +
                     "GROUP BY d.year, d.quarter, d.month, d.day, p.stock_code, p.description " +
                     "ORDER BY revenue DESC LIMIT 50";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, targetYear, targetMonth);
        long execTime = System.currentTimeMillis() - t0;

        Map<String, Object> response = new HashMap<>();
        response.put("operation", "DRILL-DOWN");
        response.put("title", "OLAP Drill-down: Year " + targetYear + " -> Month " + targetMonth + " -> Daily Product Breakdown");
        response.put("sql_query", sql.replaceFirst("\\?", String.valueOf(targetYear)).replaceFirst("\\?", String.valueOf(targetMonth)));
        response.put("execution_time_ms", execTime);
        response.put("result_count", rows.size());
        response.put("rows", rows);
        response.put("viva_explanation", "Drill-down increases data granularity, decomposing monthly aggregates into specific daily product transactions.");
        return response;
    }

    /**
     * OLAP SLICE: Filters along a single dimension.
     */
    public Map<String, Object> executeSlice(String dimension, String value) {
        long t0 = System.currentTimeMillis();
        String sql;
        String title;
        List<Map<String, Object>> rows;

        if ("year".equalsIgnoreCase(dimension)) {
            int yearVal;
            try {
                yearVal = (value != null && !value.isBlank()) ? Integer.parseInt(value.trim()) : 0;
            } catch (Exception e) {
                yearVal = 0;
            }
            if (yearVal <= 0) {
                List<Integer> availYears = jdbcTemplate.queryForList(
                        "SELECT DISTINCT d.year FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.year DESC LIMIT 1",
                        Integer.class
                );
                yearVal = !availYears.isEmpty() ? availYears.get(0) : 2026;
            }

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
                  "WHERE d.year = ? " +
                  "GROUP BY c.country, d.year " +
                  "ORDER BY total_revenue DESC";
            rows = jdbcTemplate.queryForList(sql, yearVal);
        } else {
            String countryVal = (value != null && !value.isBlank()) ? value.trim() : null;
            if (countryVal == null) {
                List<String> topCountries = jdbcTemplate.queryForList(
                        "SELECT c.country FROM fact_sales f JOIN dim_customer c ON f.customer_id = c.customer_id " +
                        "GROUP BY c.country ORDER BY SUM(f.total_amount) DESC LIMIT 1",
                        String.class
                );
                countryVal = !topCountries.isEmpty() ? topCountries.get(0) : "Global";
            }

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
     * OLAP DICE: Selects two or more dimensions simultaneously without hardcoded assumptions.
     */
    public Map<String, Object> executeDice(String countries, Integer quarter, Integer year) {
        long t0 = System.currentTimeMillis();

        int targetQuarter;
        if (quarter != null && quarter >= 1 && quarter <= 4) {
            targetQuarter = quarter;
        } else {
            List<Integer> availQ = jdbcTemplate.queryForList(
                    "SELECT DISTINCT d.quarter FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.quarter DESC LIMIT 1",
                    Integer.class
            );
            targetQuarter = !availQ.isEmpty() ? availQ.get(0) : 4;
        }

        int targetYear;
        if (year != null && year > 0) {
            targetYear = year;
        } else {
            List<Integer> availY = jdbcTemplate.queryForList(
                    "SELECT DISTINCT d.year FROM fact_sales f JOIN dim_date d ON f.date_id = d.date_id ORDER BY d.year DESC LIMIT 1",
                    Integer.class
            );
            targetYear = !availY.isEmpty() ? availY.get(0) : 2026;
        }

        // Dynamically get the top countries from active warehouse if not specified
        List<String> targetCountriesList = new ArrayList<>();
        if (countries != null && !countries.isBlank()) {
            for (String c : countries.split(",")) {
                if (!c.trim().isEmpty()) targetCountriesList.add(c.trim());
            }
        }
        if (targetCountriesList.isEmpty()) {
            targetCountriesList = jdbcTemplate.queryForList(
                    "SELECT c.country FROM fact_sales f JOIN dim_customer c ON f.customer_id = c.customer_id " +
                    "GROUP BY c.country ORDER BY SUM(f.total_amount) DESC LIMIT 4",
                    String.class
            );
        }
        if (targetCountriesList.isEmpty()) {
            targetCountriesList = List.of("Global");
        }

        String inClause = String.join("','", targetCountriesList);
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
                     "WHERE c.country IN ('" + inClause + "') " +
                     "  AND d.quarter = " + targetQuarter + " " +
                     "  AND d.year = " + targetYear + " " +
                     "GROUP BY c.country, d.year, d.quarter, p.stock_code, p.description " +
                     "ORDER BY diced_revenue DESC LIMIT 30";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        long execTime = System.currentTimeMillis() - t0;

        Map<String, Object> response = new HashMap<>();
        response.put("operation", "DICE");
        response.put("title", "OLAP Dice: Country IN ('" + inClause + "') AND Quarter = " + targetQuarter + " AND Year = " + targetYear);
        response.put("sql_query", sql);
        response.put("execution_time_ms", execTime);
        response.put("result_count", rows.size());
        response.put("rows", rows);
        response.put("viva_explanation", "Dice constructs a sub-cube by imposing filters on multiple dimensions simultaneously (Geography AND Temporal Dimensions).");
        return response;
    }
}
