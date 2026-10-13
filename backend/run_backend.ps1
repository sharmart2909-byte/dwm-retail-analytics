$repo = "$env:USERPROFILE\.m2\repository"
$jars = Get-ChildItem -Path $repo -Filter "*.jar" -Recurse | Where-Object {
    $_.FullName -notmatch '\\plugins\\|\\maven\\|maven-|surefire|compiler|buildpack|gradle'
} | Select-Object -ExpandProperty FullName

$cp = ($jars -join ";") + ";target\classes"
Write-Host "Starting Spring Boot with $($jars.Count) dependency JARs..."
& java -cp $cp com.retail.dw.OnlineRetailDwApplication
