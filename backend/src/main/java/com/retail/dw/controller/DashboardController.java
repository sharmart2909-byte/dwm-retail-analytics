package com.retail.dw.controller;

import com.retail.dw.repository.FactSalesRepository;
import com.retail.dw.service.PythonServiceBridge;
import com.retail.dw.service.WarehouseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(originPatterns = "*")
public class DashboardController {

    private final WarehouseService warehouseService;
    private final FactSalesRepository salesRepository;
    private final PythonServiceBridge pythonServiceBridge;

    public DashboardController(WarehouseService warehouseService,
                               FactSalesRepository salesRepository,
                               PythonServiceBridge pythonServiceBridge) {
        this.warehouseService = warehouseService;
        this.salesRepository = salesRepository;
        this.pythonServiceBridge = pythonServiceBridge;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStatistics() {
        Map<String, Object> stats = new HashMap<>();

        // Real MySQL Star Schema metrics
        Map<String, Object> warehouseOverview = warehouseService.getWarehouseOverview();
        stats.put("warehouse", warehouseOverview);

        // Top 5 Products by Revenue
        List<Map<String, Object>> topProducts = salesRepository.findTopProductsByRevenue();
        stats.put("top_products", topProducts.size() > 5 ? topProducts.subList(0, 5) : topProducts);

        // Country Sales Breakdown
        List<Map<String, Object>> countrySales = salesRepository.findSalesByCountry();
        stats.put("country_sales", countrySales);

        // Monthly Sales Trend
        List<Map<String, Object>> monthlyTrend = salesRepository.findMonthlySalesTrend();
        stats.put("monthly_trend", monthlyTrend);

        // Python service health & status
        Map<String, Object> pythonHealth = pythonServiceBridge.checkHealth();
        stats.put("python_service", pythonHealth);

        stats.put("system_status", "ONLINE");
        return ResponseEntity.ok(stats);
    }
}
