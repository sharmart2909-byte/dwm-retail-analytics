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
    unit_price DECIMAL(10,2) DEFAULT 2.99,
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

-- =====================================================================
-- Staging Table: fact_sales_staging
-- Temporary staging area for transactional replacement and safe ETL
-- =====================================================================
CREATE TABLE IF NOT EXISTS fact_sales_staging LIKE fact_sales;

-- =====================================================================
-- Authentication Table: app_user
-- Stores Administrator and Customer credentials with PBKDF2 hashes
-- =====================================================================
CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,            -- 'ADMIN' or 'CUSTOMER'
    full_name VARCHAR(150),
    customer_id VARCHAR(50),             -- Linked to dim_customer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_username (username),
    KEY idx_user_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Shopping Cart Tables: cart & cart_item
-- Supports customer cart persistence, quantity tracking, and server-side pricing
-- =====================================================================
CREATE TABLE IF NOT EXISTS cart (
    cart_id BIGINT AUTO_INCREMENT NOT NULL,
    user_id BIGINT NOT NULL,
    customer_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_id),
    UNIQUE KEY uq_cart_user (user_id),
    KEY idx_cart_customer (customer_id),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cart_item (
    cart_item_id BIGINT AUTO_INCREMENT NOT NULL,
    cart_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_item_id),
    UNIQUE KEY uq_cart_product (cart_id, product_id),
    KEY idx_cart_item_cart (cart_id),
    KEY idx_cart_item_product (product_id),
    CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES cart (cart_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_item_product FOREIGN KEY (product_id) REFERENCES dim_product (product_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
