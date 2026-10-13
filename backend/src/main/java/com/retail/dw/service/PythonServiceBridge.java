package com.retail.dw.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class PythonServiceBridge {

    private static final Logger log = LoggerFactory.getLogger(PythonServiceBridge.class);

    private final RestTemplate restTemplate;

    @Value("${python.service.url:http://localhost:8000}")
    private String pythonServiceUrl;

    public PythonServiceBridge(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Map<String, Object> checkHealth() {
        try {
            String url = pythonServiceUrl + "/health";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.warn("Python service not reachable at {}: {}", pythonServiceUrl, e.getMessage());
            Map<String, Object> status = new HashMap<>();
            status.put("status", "offline");
            status.put("error", e.getMessage());
            return status;
        }
    }

    public Map<String, Object> preprocessFile(MultipartFile file) {
        String url = pythonServiceUrl + "/api/data/preprocess";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            if (file != null && !file.isEmpty()) {
                ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return file.getOriginalFilename() != null ? file.getOriginalFilename() : "dataset.csv";
                    }
                };
                body.add("file", fileResource);
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error communicating with Python preprocessing service: {}", e.getMessage());
            throw new RuntimeException("Python Preprocessing Service Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> fetchStarSchemaData() {
        String url = pythonServiceUrl + "/api/data/star-schema";
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error fetching star schema from Python service: {}", e.getMessage());
            throw new RuntimeException("Python Star Schema Generation Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> runRegression() {
        String url = pythonServiceUrl + "/api/ml/regression";
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error running regression on Python service: {}", e.getMessage());
            throw new RuntimeException("Python Regression Service Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> runNaiveBayes() {
        String url = pythonServiceUrl + "/api/ml/naive-bayes";
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error running Naive Bayes on Python service: {}", e.getMessage());
            throw new RuntimeException("Python Naive Bayes Service Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> runClustering(Integer nClusters) {
        String url = pythonServiceUrl + "/api/ml/clustering";
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("n_clusters", nClusters != null ? nClusters : 3);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error running clustering on Python service: {}", e.getMessage());
            throw new RuntimeException("Python Clustering Service Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> runApriori(Double minSupport, Double minConfidence) {
        String url = pythonServiceUrl + "/api/ml/apriori";
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("min_support", minSupport != null ? minSupport : 0.03);
            request.put("min_confidence", minConfidence != null ? minConfidence : 0.2);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error running Apriori on Python service: {}", e.getMessage());
            throw new RuntimeException("Python Apriori Service Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> runRecommendation(String stockCode, Integer topN) {
        String url = pythonServiceUrl + "/api/ml/recommend";
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("stock_code", stockCode);
            request.put("top_n", topN != null ? topN : 5);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error running recommendation on Python service: {}", e.getMessage());
            throw new RuntimeException("Python Recommendation Service Error: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> compareAlgorithms() {
        String url = pythonServiceUrl + "/api/ml/comparison";
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Error running algorithm comparison on Python service: {}", e.getMessage());
            throw new RuntimeException("Python Comparison Service Error: " + e.getMessage(), e);
        }
    }
}
