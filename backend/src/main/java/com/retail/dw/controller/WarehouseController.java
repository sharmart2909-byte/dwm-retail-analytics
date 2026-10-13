package com.retail.dw.controller;

import com.retail.dw.service.PythonServiceBridge;
import com.retail.dw.service.WarehouseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/warehouse")
@CrossOrigin(originPatterns = "*")
public class WarehouseController {

    private final WarehouseService warehouseService;
    private final PythonServiceBridge pythonServiceBridge;

    public WarehouseController(WarehouseService warehouseService, PythonServiceBridge pythonServiceBridge) {
        this.warehouseService = warehouseService;
        this.pythonServiceBridge = pythonServiceBridge;
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(warehouseService.getWarehouseOverview());
    }

    @GetMapping("/table/{tableName}")
    public ResponseEntity<Map<String, Object>> getTableData(
            @PathVariable(value = "tableName") String tableName,
            @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return ResponseEntity.ok(warehouseService.getTableData(tableName, limit));
    }

    @PostMapping("/sync-etl")
    public ResponseEntity<Map<String, Object>> syncWarehouseFromEtl() {
        Map<String, Object> starSchemaData = pythonServiceBridge.fetchStarSchemaData();
        Map<String, Object> syncResult = warehouseService.populateFromStarSchemaData(starSchemaData);
        return ResponseEntity.ok(syncResult);
    }
}
