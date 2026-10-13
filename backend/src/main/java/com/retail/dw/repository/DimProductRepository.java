package com.retail.dw.repository;

import com.retail.dw.model.DimProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DimProductRepository extends JpaRepository<DimProduct, Integer> {
    Optional<DimProduct> findByStockCode(String stockCode);
}
