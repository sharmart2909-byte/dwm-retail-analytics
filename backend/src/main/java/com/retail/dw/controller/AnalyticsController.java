package com.retail.dw.controller;

import com.retail.dw.service.PythonServiceBridge;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(originPatterns = "*")
public class AnalyticsController {

    private final PythonServiceBridge pythonServiceBridge;

    public AnalyticsController(PythonServiceBridge pythonServiceBridge) {
        this.pythonServiceBridge = pythonServiceBridge;
    }

    @GetMapping("/regression")
    public ResponseEntity<Map<String, Object>> getRegressionAnalysis() {
        return ResponseEntity.ok(pythonServiceBridge.runRegression());
    }

    @GetMapping("/naive-bayes")
    public ResponseEntity<Map<String, Object>> getNaiveBayesClassification() {
        return ResponseEntity.ok(pythonServiceBridge.runNaiveBayes());
    }

    @GetMapping("/clustering")
    public ResponseEntity<Map<String, Object>> getCustomerSegmentation(
            @RequestParam(value = "n_clusters", defaultValue = "3") Integer n_clusters) {
        return ResponseEntity.ok(pythonServiceBridge.runClustering(n_clusters));
    }

    @GetMapping("/apriori")
    public ResponseEntity<Map<String, Object>> getAprioriRules(
            @RequestParam(value = "min_support", defaultValue = "0.03") Double min_support,
            @RequestParam(value = "min_confidence", defaultValue = "0.2") Double min_confidence) {
        return ResponseEntity.ok(pythonServiceBridge.runApriori(min_support, min_confidence));
    }

    @PostMapping("/recommend")
    public ResponseEntity<Map<String, Object>> getProductRecommendations(@RequestBody Map<String, Object> payload) {
        String stockCode = String.valueOf(payload.getOrDefault("stock_code", "85123A"));
        Object topNObj = payload.getOrDefault("top_n", 5);
        int topN = (topNObj instanceof Number) ? ((Number) topNObj).intValue() : 5;
        return ResponseEntity.ok(pythonServiceBridge.runRecommendation(stockCode, topN));
    }

    @GetMapping("/comparison")
    public ResponseEntity<Map<String, Object>> getAlgorithmComparison() {
        return ResponseEntity.ok(pythonServiceBridge.compareAlgorithms());
    }
}
