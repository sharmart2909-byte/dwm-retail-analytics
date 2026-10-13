package com.retail.dw.repository;

import com.retail.dw.model.DimDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DimDateRepository extends JpaRepository<DimDate, Integer> {
    List<DimDate> findByYear(Integer year);
    List<DimDate> findByYearAndQuarter(Integer year, Integer quarter);
}
