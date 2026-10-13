-- =====================================================================
-- Online Retail OLAP SQL Queries on Star Schema
-- Subject: Data Warehousing and Data Mining (DWM)
-- Operations: Roll-up, Drill-down, Slice, Dice
-- =====================================================================

USE retail_dw;

-- ---------------------------------------------------------------------
-- 1. OLAP ROLL-UP OPERATION
-- Description: Summarizes data by climbing up a hierarchy or reducing dimensions.
-- Example 1: Roll-up from Month to Quarter and Year (temporal hierarchy).
-- ---------------------------------------------------------------------
SELECT
    d.year,
    d.quarter,
    COUNT(f.sale_id) AS total_transactions,
    SUM(f.quantity) AS total_quantity,
    SUM(f.total_amount) AS total_revenue,
    AVG(f.total_amount) AS avg_sale_value
FROM fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
GROUP BY d.year, d.quarter WITH ROLLUP;

-- Example 2: Roll-up across Geography (Country -> Global Total).
SELECT
    IFNULL(c.country, 'ALL COUNTRIES (ROLLUP)') AS country,
    COUNT(f.sale_id) AS total_sales,
    SUM(f.total_amount) AS total_revenue
FROM fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
GROUP BY c.country WITH ROLLUP;


-- ---------------------------------------------------------------------
-- 2. OLAP DRILL-DOWN OPERATION
-- Description: Navigates from higher-level summary data to lower-level detailed data.
-- Example: Drill-down from Year -> Quarter -> Month -> Day for sales analysis.
-- ---------------------------------------------------------------------
SELECT
    d.year,
    d.quarter,
    d.month,
    d.day,
    p.stock_code,
    p.description,
    SUM(f.quantity) AS units_sold,
    SUM(f.total_amount) AS revenue
FROM fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_product p ON f.product_id = p.product_id
WHERE d.year = 2011 AND d.month = 12
GROUP BY d.year, d.quarter, d.month, d.day, p.stock_code, p.description
ORDER BY revenue DESC;


-- ---------------------------------------------------------------------
-- 3. OLAP SLICE OPERATION
-- Description: Selects a single dimension from the cube and results in a sub-cube.
-- Example 1: Slice on Country = 'United Kingdom'.
-- ---------------------------------------------------------------------
SELECT
    d.year,
    d.month,
    p.description,
    SUM(f.quantity) AS units_sold,
    SUM(f.total_amount) AS sliced_revenue
FROM fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_product p ON f.product_id = p.product_id
WHERE c.country = 'United Kingdom'
GROUP BY d.year, d.month, p.description
ORDER BY sliced_revenue DESC
LIMIT 20;

-- Example 2: Slice on Year = 2011.
SELECT
    c.country,
    SUM(f.total_amount) AS revenue_2011
FROM fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
JOIN dim_date d ON f.date_id = d.date_id
WHERE d.year = 2011
GROUP BY c.country
ORDER BY revenue_2011 DESC;


-- ---------------------------------------------------------------------
-- 4. OLAP DICE OPERATION
-- Description: Selects two or more dimensions simultaneously to define a sub-cube.
-- Example: Dice on Country IN ('Germany', 'France') AND Quarter = 4 AND Year = 2011.
-- ---------------------------------------------------------------------
SELECT
    c.country,
    d.quarter,
    d.month,
    p.stock_code,
    p.description,
    SUM(f.quantity) AS diced_units,
    SUM(f.total_amount) AS diced_revenue
FROM fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_product p ON f.product_id = p.product_id
WHERE c.country IN ('Germany', 'France')
  AND d.year = 2011
  AND d.quarter = 4
GROUP BY c.country, d.quarter, d.month, p.stock_code, p.description
ORDER BY diced_revenue DESC;
