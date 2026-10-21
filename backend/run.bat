@echo off
echo =======================================================================
echo Starting Spring Boot Backend on port 8080...
echo =======================================================================

if exist "%~dp0target\online-retail-dw-1.0.0.jar" (
    echo Launching packaged JAR: target\online-retail-dw-1.0.0.jar
    java -jar "%~dp0target\online-retail-dw-1.0.0.jar"
) else (
    echo Packaged JAR not found. Launching via Maven spring-boot:run...
    call mvn spring-boot:run
)
