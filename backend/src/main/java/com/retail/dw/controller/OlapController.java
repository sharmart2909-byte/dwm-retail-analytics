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

    @GetMapping("/options")
    public ResponseEntity<Map<String, Object>> getOlapOptions() {
        return ResponseEntity.ok(olapService.getOlapOptions());
    }

    @GetMapping("/rollup")
    public ResponseEntity<Map<String, Object>> getRollup(
            @RequestParam(value = "dimension", defaultValue = "time") String dimension) {
        return ResponseEntity.ok(olapService.executeRollup(dimension));
    }

    @GetMapping("/drilldown")
    public ResponseEntity<Map<String, Object>> getDrilldown(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "month", required = false) Integer month) {
        return ResponseEntity.ok(olapService.executeDrillDown(year, month));
    }

    @GetMapping("/slice")
    public ResponseEntity<Map<String, Object>> getSlice(
            @RequestParam(value = "dimension", defaultValue = "country") String dimension,
            @RequestParam(value = "value", required = false) String value) {
        return ResponseEntity.ok(olapService.executeSlice(dimension, value));
    }

    @GetMapping("/dice")
    public ResponseEntity<Map<String, Object>> getDice(
            @RequestParam(value = "countries", required = false) String countries,
            @RequestParam(value = "quarter", required = false) Integer quarter,
            @RequestParam(value = "year", required = false) Integer year) {
        return ResponseEntity.ok(olapService.executeDice(countries, quarter, year));
    }
}
