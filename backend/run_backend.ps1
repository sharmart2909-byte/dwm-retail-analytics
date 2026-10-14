$jarPath = Join-Path $PSScriptRoot "target\online-retail-dw-1.0.0.jar"

if (Test-Path $jarPath) {
    Write-Host "[Spring Boot] Starting from packaged executable JAR: $jarPath" -ForegroundColor Green
    & java -jar $jarPath
} else {
    Write-Host "[Spring Boot] JAR not packaged yet. Starting via Maven spring-boot:run..." -ForegroundColor Cyan
    & mvn spring-boot:run
}
