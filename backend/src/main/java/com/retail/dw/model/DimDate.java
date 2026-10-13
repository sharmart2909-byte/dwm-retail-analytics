package com.retail.dw.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "dim_date")
public class DimDate {

    @Id
    @Column(name = "date_id", nullable = false)
    private Integer dateId; // e.g. 20111201

    @Column(name = "day", nullable = false)
    private Integer day;

    @Column(name = "month", nullable = false)
    private Integer month;

    @Column(name = "quarter", nullable = false)
    private Integer quarter;

    @Column(name = "year", nullable = false)
    private Integer year;

    public DimDate() {
    }

    public DimDate(Integer dateId, Integer day, Integer month, Integer quarter, Integer year) {
        this.dateId = dateId;
        this.day = day;
        this.month = month;
        this.quarter = quarter;
        this.year = year;
    }

    public Integer getDateId() {
        return dateId;
    }

    public void setDateId(Integer dateId) {
        this.dateId = dateId;
    }

    public Integer getDay() {
        return day;
    }

    public void setDay(Integer day) {
        this.day = day;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Integer getQuarter() {
        return quarter;
    }

    public void setQuarter(Integer quarter) {
        this.quarter = quarter;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }
}
