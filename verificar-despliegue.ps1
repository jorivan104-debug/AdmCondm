# Script para verificar el estado del despliegue

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔍 VERIFICANDO ESTADO DEL DESPLIEGUE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$repoUrl = "https://github.com/jorivan104-debug/AdmCondm"
$pagesUrl = "https://jorivan104-debug.github.io/AdmCondm/"
$settingsUrl = "$repoUrl/settings/pages"
$actionsUrl = "$repoUrl/actions"

Write-Host "📋 URLs del Proyecto:" -ForegroundColor Yellow
Write-Host "   Repositorio: $repoUrl" -ForegroundColor White
Write-Host "   GitHub Pages: $pagesUrl" -ForegroundColor White
Write-Host "   Settings: $settingsUrl" -ForegroundColor White
Write-Host "   Actions: $actionsUrl" -ForegroundColor White
Write-Host ""

# Verificar estado local
Write-Host "🔍 Verificando estado local..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "   ⚠️  Hay cambios sin commitear" -ForegroundColor Yellow
    Write-Host "   Ejecuta: git add . ; git commit -m 'Update' ; git push" -ForegroundColor Gray
} else {
    Write-Host "   ✅ No hay cambios pendientes" -ForegroundColor Green
}

$lastCommit = git log --oneline -1
Write-Host "   Último commit: $lastCommit" -ForegroundColor Gray
Write-Host ""

# Verificar remote
Write-Host "🔗 Verificando configuración remota..." -ForegroundColor Yellow
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "   ✅ Remote configurado: $remote" -ForegroundColor Green
} else {
    Write-Host "   ❌ No hay remote configurado" -ForegroundColor Red
}
Write-Host ""

# Instrucciones
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📋 VERIFICACIONES NECESARIAS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Verifica que GitHub Pages esté activado:" -ForegroundColor White
Write-Host "   👉 $settingsUrl" -ForegroundColor Cyan
Write-Host "   - Source debe ser: 'GitHub Actions'" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Verifica que el workflow se esté ejecutando:" -ForegroundColor White
Write-Host "   👉 $actionsUrl" -ForegroundColor Cyan
Write-Host "   - Debe haber un workflow 'Deploy Frontend to GitHub Pages'" -ForegroundColor Gray
Write-Host "   - Si no está ejecutándose, click en 'Run workflow'" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Espera 2-5 minutos y verifica tu sitio:" -ForegroundColor White
Write-Host "   👉 $pagesUrl" -ForegroundColor Green
Write-Host ""

# Intentar verificar si el sitio está activo
Write-Host "🔍 Intentando verificar si el sitio está activo..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $pagesUrl -Method Head -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ ¡El sitio está activo!" -ForegroundColor Green
        Write-Host "   👉 $pagesUrl" -ForegroundColor Cyan
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "   ❌ El sitio aún no está disponible (404)" -ForegroundColor Red
        Write-Host "   - Verifica que GitHub Pages esté activado" -ForegroundColor Yellow
        Write-Host "   - Verifica que el workflow haya terminado exitosamente" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️  No se pudo verificar (Error: $statusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  💡 PRÓXIMOS PASOS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Si el sitio aún no funciona:" -ForegroundColor White
Write-Host "1. Abre: $settingsUrl" -ForegroundColor Cyan
Write-Host "2. Selecciona 'GitHub Actions' como Source" -ForegroundColor White
Write-Host "3. Guarda los cambios" -ForegroundColor White
Write-Host "4. Ve a: $actionsUrl" -ForegroundColor Cyan
Write-Host "5. Click en Run workflow para forzar el despliegue" -ForegroundColor White
Write-Host ""

$abrir = Read-Host "¿Deseas abrir las páginas de GitHub ahora? (s/n)"
if ($abrir -eq "s" -or $abrir -eq "S") {
    Start-Process $settingsUrl
    Start-Sleep -Seconds 2
    Start-Process $actionsUrl
    Start-Sleep -Seconds 2
    Start-Process $pagesUrl
}
