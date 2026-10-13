package com.retail.dw.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fact_sales")
public class FactSales {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sale_id")
    private Long saleId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private DimCustomer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private DimProduct product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "date_id", nullable = false)
    private DimDate date;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 10, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "total_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    public FactSales() {
    }

    public FactSales(Long saleId, DimCustomer customer, DimProduct product, DimDate date,
                     Integer quantity, BigDecimal unitPrice, BigDecimal totalAmount) {
        this.saleId = saleId;
        this.customer = customer;
        this.product = product;
        this.date = date;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.totalAmount = totalAmount;
    }

    public Long getSaleId() {
        return saleId;
    }

    public void setSaleId(Long saleId) {
        this.saleId = saleId;
    }

    public DimCustomer getCustomer() {
        return customer;
    }

    public void setCustomer(DimCustomer customer) {
        this.customer = customer;
    }

    public DimProduct getProduct() {
        return product;
    }

    public void setProduct(DimProduct product) {
        this.product = product;
    }

    public DimDate getDate() {
        return date;
    }

    public void setDate(DimDate date) {
        this.date = date;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
}
