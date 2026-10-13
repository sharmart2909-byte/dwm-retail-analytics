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

    public DimProduct() {
    }

    public DimProduct(Integer productId, String stockCode, String description) {
        this.productId = productId;
        this.stockCode = stockCode;
        this.description = description;
    }

    public DimProduct(String stockCode, String description) {
        this.stockCode = stockCode;
        this.description = description;
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
}
