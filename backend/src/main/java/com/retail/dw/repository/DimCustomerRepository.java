package com.retail.dw.repository;

import com.retail.dw.model.DimCustomer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DimCustomerRepository extends JpaRepository<DimCustomer, String> {
    List<DimCustomer> findByCountry(String country);
}
