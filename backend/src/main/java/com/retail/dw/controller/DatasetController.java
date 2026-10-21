package com.retail.dw.controller;

import com.retail.dw.service.PythonServiceBridge;
import com.retail.dw.service.WarehouseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/dataset")
@CrossOrigin(originPatterns = "*")
public class DatasetController {

    private final PythonServiceBridge pythonServiceBridge;
    private final WarehouseService warehouseService;

    public DatasetController(PythonServiceBridge pythonServiceBridge, WarehouseService warehouseService) {
        this.pythonServiceBridge = pythonServiceBridge;
        this.warehouseService = warehouseService;
    }

    @PostMapping("/inspect")
    public ResponseEntity<Map<String, Object>> inspectDataset(
            @RequestParam(value = "file", required = false) MultipartFile file) {
        Map<String, Object> result = pythonServiceBridge.inspectFile(file);
        if (Boolean.FALSE.equals(result.get("success"))) {
            int status = (int) result.getOrDefault("status", 400);
            return ResponseEntity.status(status).body(result);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadAndPreprocess(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "mapping", required = false) String mapping,
            @RequestParam(value = "auto_sync_dw", defaultValue = "false") boolean autoSyncDw) {

        Map<String, Object> preprocessResult = pythonServiceBridge.preprocessFile(file, mapping);

        if (Boolean.FALSE.equals(preprocessResult.get("success"))) {
            int status = (int) preprocessResult.getOrDefault("status", 400);
            return ResponseEntity.status(status).body(preprocessResult);
        }

        if (autoSyncDw && Boolean.TRUE.equals(preprocessResult.get("success"))) {
            try {
                Map<String, Object> starSchemaData = pythonServiceBridge.fetchStarSchemaData();
                warehouseService.populateFromStarSchemaData(starSchemaData);
                preprocessResult.put("dw_synced", true);
            } catch (Exception e) {
                preprocessResult.put("dw_synced", false);
                preprocessResult.put("dw_sync_error", e.getMessage());
            }
        }

        return ResponseEntity.ok(preprocessResult);
    }

    @GetMapping("/preview")
    public ResponseEntity<Map<String, Object>> getDatasetPreview() {
        return ResponseEntity.ok(pythonServiceBridge.getDatasetPreview());
    }
}
