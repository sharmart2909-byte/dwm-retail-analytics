package com.retail.dw.repository;

import com.retail.dw.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    Optional<CartItem> findByCartCartIdAndProductProductId(Long cartId, Integer productId);
    List<CartItem> findByCartCartId(Long cartId);
    void deleteByCartCartId(Long cartId);
}
