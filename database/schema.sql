-- =====================================================================
-- Online Retail Data Warehouse - Star Schema DDL
-- Subject: Data Warehousing and Data Mining (DWM)
-- Database: MySQL 8.0
-- =====================================================================

CREATE DATABASE IF NOT EXISTS retail_dw;
USE retail_dw;

-- Disable foreign key checks for clean drop
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS fact_sales;
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_date;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- Dimension 1: dim_customer
-- Contains unique customer demographics (Country)
-- =====================================================================
CREATE TABLE dim_customer (
    customer_id VARCHAR(50) NOT NULL,
    country VARCHAR(100) NOT NULL,
    PRIMARY KEY (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Dimension 2: dim_product
-- Contains unique product catalog info
-- =====================================================================
CREATE TABLE dim_product (
    product_id INT AUTO_INCREMENT NOT NULL,
    stock_code VARCHAR(50) NOT NULL,
    description VARCHAR(255) DEFAULT 'UNKNOWN',
    PRIMARY KEY (product_id),
    UNIQUE KEY uq_stock_code (stock_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Dimension 3: dim_date
-- Time dimension for temporal OLAP analysis (Day, Month, Quarter, Year)
-- =====================================================================
CREATE TABLE dim_date (
    date_id INT NOT NULL,  -- Format: YYYYMMDD, e.g., 20111201
    day INT NOT NULL,
    month INT NOT NULL,
    quarter INT NOT NULL,
    year INT NOT NULL,
    PRIMARY KEY (date_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Fact Table: fact_sales
-- Central fact table storing sales transactions, foreign keys, and measures
-- =====================================================================
CREATE TABLE fact_sales (
    sale_id BIGINT AUTO_INCREMENT NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    product_id INT NOT NULL,
    date_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (sale_id),
    KEY idx_fk_customer (customer_id),
    KEY idx_fk_product (product_id),
    KEY idx_fk_date (date_id),
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES dim_customer (customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_product FOREIGN KEY (product_id) REFERENCES dim_product (product_id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_date FOREIGN KEY (date_id) REFERENCES dim_date (date_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional helper views for OLAP reporting
CREATE OR REPLACE VIEW v_sales_star AS
SELECT
    f.sale_id,
    c.customer_id,
    c.country,
    p.product_id,
    p.stock_code,
    p.description,
    d.date_id,
    d.day,
    d.month,
    d.quarter,
    d.year,
    f.quantity,
    f.unit_price,
    f.total_amount
FROM fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
JOIN dim_product p ON f.product_id = p.product_id
JOIN dim_date d ON f.date_id = d.date_id;
