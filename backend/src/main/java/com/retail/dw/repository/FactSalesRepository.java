package com.retail.dw.repository;

import com.retail.dw.model.FactSales;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Repository
public interface FactSalesRepository extends JpaRepository<FactSales, Long> {

    @Query("SELECT COUNT(f) FROM FactSales f")
    long countSales();

    @Query("SELECT COALESCE(SUM(f.totalAmount), 0) FROM FactSales f")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(f.quantity), 0) FROM FactSales f")
    Long sumTotalQuantity();

    @Query("SELECT COALESCE(AVG(f.totalAmount), 0) FROM FactSales f")
    Double avgSaleAmount();

    // Top 5 Products by Revenue
    @Query("SELECT p.stockCode AS stockCode, p.description AS description, " +
           "SUM(f.quantity) AS totalQty, SUM(f.totalAmount) AS totalRevenue " +
           "FROM FactSales f JOIN f.product p " +
           "GROUP BY p.stockCode, p.description " +
           "ORDER BY totalRevenue DESC")
    List<Map<String, Object>> findTopProductsByRevenue();

    // Country Sales Distribution
    @Query("SELECT c.country AS country, COUNT(f.saleId) AS transactionCount, " +
           "SUM(f.quantity) AS totalQuantity, SUM(f.totalAmount) AS totalRevenue " +
           "FROM FactSales f JOIN f.customer c " +
           "GROUP BY c.country " +
           "ORDER BY totalRevenue DESC")
    List<Map<String, Object>> findSalesByCountry();

    // Monthly Sales Trend
    @Query("SELECT d.year AS year, d.month AS month, " +
           "COUNT(f.saleId) AS transactionCount, SUM(f.quantity) AS totalQuantity, " +
           "SUM(f.totalAmount) AS totalRevenue " +
           "FROM FactSales f JOIN f.date d " +
           "GROUP BY d.year, d.month " +
           "ORDER BY d.year ASC, d.month ASC")
    List<Map<String, Object>> findMonthlySalesTrend();
}
