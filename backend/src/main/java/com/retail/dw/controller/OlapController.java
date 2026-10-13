package com.retail.dw.controller;

import com.retail.dw.service.OlapService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/olap")
@CrossOrigin(originPatterns = "*")
public class OlapController {

    private final OlapService olapService;

    public OlapController(OlapService olapService) {
        this.olapService = olapService;
    }

    @GetMapping("/rollup")
    public ResponseEntity<Map<String, Object>> getRollup(
            @RequestParam(value = "dimension", defaultValue = "time") String dimension) {
        return ResponseEntity.ok(olapService.executeRollup(dimension));
    }

    @GetMapping("/drilldown")
    public ResponseEntity<Map<String, Object>> getDrilldown(
            @RequestParam(value = "year", defaultValue = "2011") Integer year,
            @RequestParam(value = "month", defaultValue = "12") Integer month) {
        return ResponseEntity.ok(olapService.executeDrillDown(year, month));
    }

    @GetMapping("/slice")
    public ResponseEntity<Map<String, Object>> getSlice(
            @RequestParam(value = "dimension", defaultValue = "country") String dimension,
            @RequestParam(value = "value", defaultValue = "United Kingdom") String value) {
        return ResponseEntity.ok(olapService.executeSlice(dimension, value));
    }

    @GetMapping("/dice")
    public ResponseEntity<Map<String, Object>> getDice(
            @RequestParam(value = "countries", required = false) String countries,
            @RequestParam(value = "quarter", defaultValue = "4") Integer quarter,
            @RequestParam(value = "year", defaultValue = "2011") Integer year) {
        return ResponseEntity.ok(olapService.executeDice(countries, quarter, year));
    }
}
