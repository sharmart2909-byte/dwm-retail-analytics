-- =====================================================================
-- Seed Data for retail_dw Star Schema
-- Real Online Retail sample data for immediate testing and viva demo
-- =====================================================================

USE retail_dw;

-- Customers
INSERT INTO dim_customer (customer_id, country) VALUES
('17850', 'United Kingdom'),
('13047', 'United Kingdom'),
('12583', 'France'),
('13748', 'United Kingdom'),
('15100', 'United Kingdom'),
('15291', 'United Kingdom'),
('14688', 'United Kingdom'),
('17809', 'United Kingdom'),
('15311', 'United Kingdom'),
('16098', 'United Kingdom'),
('18074', 'United Kingdom'),
('17420', 'United Kingdom'),
('16029', 'United Kingdom'),
('16250', 'United Kingdom'),
('12431', 'Australia'),
('17511', 'United Kingdom'),
('13705', 'United Kingdom'),
('12662', 'Germany'),
('12748', 'United Kingdom'),
('17841', 'United Kingdom')
ON DUPLICATE KEY UPDATE country=VALUES(country);

-- Products
INSERT INTO dim_product (product_id, stock_code, description) VALUES
(1, '85123A', 'WHITE HANGING HEART T-LIGHT HOLDER'),
(2, '71053', 'WHITE METAL LANTERN'),
(3, '84406B', 'CREAM CUPID HEARTS COAT HANGER'),
(4, '84029G', 'KNITTED UNION FLAG HOT WATER BOTTLE'),
(5, '84029E', 'RED WOOLLY HOTTIE WHITE HEART.'),
(6, '22752', 'SET 7 BABUSHKA NESTING BOXES'),
(7, '21730', 'GLASS STAR FROSTED T-LIGHT HOLDER'),
(8, '22633', 'HAND WARMER UNION JACK'),
(9, '22632', 'HAND WARMER RED POLKADOT'),
(10, '84879', 'ASSORTED COLOUR BIRD ORNAMENT'),
(11, '22745', 'POPPY\'S PLAYHOUSE BEDROOM'),
(12, '22748', 'POPPY\'S PLAYHOUSE KITCHEN'),
(13, '22749', 'POPPY\'S PLAYHOUSE LIVING ROOM'),
(14, '22310', 'IVORY KNITTED MUG COSY'),
(15, '84969', 'BOX OF 6 ASSORTED COLOUR TEASPOONS'),
(16, '20725', 'LUNCH BAG RED RETROSPOT'),
(17, '20727', 'LUNCH BAG  BLACK SKULL.'),
(18, '20728', 'LUNCH BAG CARS BLUE'),
(19, '22382', 'LUNCH BAG SPACEBOY DESIGN'),
(20, '22383', 'LUNCH BAG SUKI DESIGN')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Dates (Year, Quarter, Month, Day)
INSERT INTO dim_date (date_id, day, month, quarter, year) VALUES
(20110110, 10, 1, 1, 2011),
(20110215, 15, 2, 1, 2011),
(20110320, 20, 3, 1, 2011),
(20110412, 12, 4, 2, 2011),
(20110518, 18, 5, 2, 2011),
(20110622, 22, 6, 2, 2011),
(20110714, 14, 7, 3, 2011),
(20110819, 19, 8, 3, 2011),
(20110925, 25, 9, 3, 2011),
(20111005, 5, 10, 4, 2011),
(20111111, 11, 11, 4, 2011),
(20111201, 1, 12, 4, 2011),
(20111202, 2, 12, 4, 2011),
(20111203, 3, 12, 4, 2011),
(20111204, 4, 12, 4, 2011),
(20111205, 5, 12, 4, 2011)
ON DUPLICATE KEY UPDATE day=VALUES(day), month=VALUES(month), quarter=VALUES(quarter), year=VALUES(year);

-- Fact Sales
INSERT INTO fact_sales (customer_id, product_id, date_id, quantity, unit_price, total_amount) VALUES
('17850', 1, 20111201, 6, 2.55, 15.30),
('17850', 2, 20111201, 6, 3.39, 20.34),
('17850', 3, 20111201, 8, 2.75, 22.00),
('17850', 4, 20111201, 6, 3.39, 20.34),
('17850', 5, 20111201, 6, 3.39, 20.34),
('13047', 6, 20111201, 2, 7.65, 15.30),
('13047', 7, 20111201, 6, 2.55, 15.30),
('13047', 8, 20111201, 6, 1.85, 11.10),
('13047', 9, 20111201, 6, 1.85, 11.10),
('12583', 10, 20111201, 32, 1.69, 54.08),
('12583', 11, 20111201, 6, 2.10, 12.60),
('12583', 12, 20111201, 6, 2.10, 12.60),
('12583', 13, 20111201, 6, 2.10, 12.60),
('13748', 14, 20111202, 4, 1.65, 6.60),
('15100', 15, 20111202, 12, 1.25, 15.00),
('15291', 16, 20111202, 10, 1.65, 16.50),
('15291', 17, 20111202, 10, 1.65, 16.50),
('14688', 18, 20111203, 10, 1.65, 16.50),
('14688', 19, 20111203, 10, 1.65, 16.50),
('14688', 20, 20111203, 10, 1.65, 16.50),
('17809', 1, 20111111, 12, 2.55, 30.60),
('15311', 2, 20111005, 18, 3.39, 61.02),
('16098', 10, 20110925, 48, 1.69, 81.12),
('18074', 16, 20110819, 20, 1.65, 33.00),
('17420', 17, 20110714, 15, 1.65, 24.75),
('16029', 6, 20110622, 4, 7.65, 30.60),
('16250', 8, 20110518, 24, 1.85, 44.40),
('12431', 9, 20110412, 12, 1.85, 22.20),
('17511', 16, 20110320, 50, 1.45, 72.50),
('13705', 18, 20110215, 30, 1.65, 49.50),
('12662', 10, 20110110, 32, 1.69, 54.08),
('12748', 1, 20111204, 12, 2.55, 30.60),
('12748', 2, 20111204, 6, 3.39, 20.34),
('17841', 16, 20111205, 25, 1.65, 41.25),
('17841', 19, 20111205, 25, 1.65, 41.25);
