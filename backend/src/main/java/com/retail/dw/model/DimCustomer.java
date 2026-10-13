package com.retail.dw.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dim_customer")
public class DimCustomer {

    @Id
    @Column(name = "customer_id", length = 50, nullable = false)
    private String customerId;

    @Column(name = "country", length = 100, nullable = false)
    private String country;

    public DimCustomer() {
    }

    public DimCustomer(String customerId, String country) {
        this.customerId = customerId;
        this.country = country;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }
}
