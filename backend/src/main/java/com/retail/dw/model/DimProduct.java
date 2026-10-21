package com.retail.dw.model;

import jakarta.persistence.*;

@Entity
@Table(name = "dim_product")
public class DimProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Integer productId;

    @Column(name = "stock_code", length = 50, nullable = false, unique = true)
    private String stockCode;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private java.math.BigDecimal unitPrice = java.math.BigDecimal.valueOf(2.99);

    public DimProduct() {
    }

    public DimProduct(Integer productId, String stockCode, String description) {
        this.productId = productId;
        this.stockCode = stockCode;
        this.description = description;
        this.unitPrice = java.math.BigDecimal.valueOf(2.99);
    }

    public DimProduct(Integer productId, String stockCode, String description, java.math.BigDecimal unitPrice) {
        this.productId = productId;
        this.stockCode = stockCode;
        this.description = description;
        this.unitPrice = unitPrice != null ? unitPrice : java.math.BigDecimal.valueOf(2.99);
    }

    public DimProduct(String stockCode, String description) {
        this.stockCode = stockCode;
        this.description = description;
        this.unitPrice = java.math.BigDecimal.valueOf(2.99);
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public String getStockCode() {
        return stockCode;
    }

    public void setStockCode(String stockCode) {
        this.stockCode = stockCode;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public java.math.BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(java.math.BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }
}
