# Script para descargar e instalar Python en Windows
# Ejecutar como administrador: .\instalar-python.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalador de Python" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Python ya está instalado
$pythonInstalled = $false
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion) {
        Write-Host "Python ya está instalado: $pythonVersion" -ForegroundColor Green
        $pythonInstalled = $true
    }
} catch {
    # Python no está instalado
}

if (-not $pythonInstalled) {
    Write-Host "Python no está instalado. Descargando Python 3.12.7..." -ForegroundColor Yellow
    
    # URL de descarga de Python 3.12.7 para Windows 64-bit
    $pythonUrl = "https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe"
    $installerPath = "$env:TEMP\python-installer.exe"
    
    try {
        # Descargar el instalador
        Write-Host "Descargando desde: $pythonUrl" -ForegroundColor Cyan
        Invoke-WebRequest -Uri $pythonUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "Instalador descargado en: $installerPath" -ForegroundColor Green
        Write-Host ""
        Write-Host "IMPORTANTE: Se abrirá el instalador de Python." -ForegroundColor Yellow
        Write-Host "Durante la instalación, DEBES marcar:" -ForegroundColor Yellow
        Write-Host "  ✓ 'Add Python to PATH'" -ForegroundColor Yellow
        Write-Host "  ✓ 'Install for all users' (recomendado)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Presiona Enter para abrir el instalador..." -ForegroundColor Cyan
        Read-Host
        
        # Ejecutar el instalador
        Start-Process -FilePath $installerPath -Wait
        
        Write-Host ""
        Write-Host "Instalación completada. Verificando..." -ForegroundColor Green
        
        # Refrescar variables de entorno
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Verificar instalación
        Start-Sleep -Seconds 2
        try {
            $pythonVersion = python --version 2>&1
            $pipVersion = pip --version 2>&1
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  Python instalado correctamente!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Python: $pythonVersion" -ForegroundColor Green
            Write-Host "pip: $pipVersion" -ForegroundColor Green
            Write-Host ""
            Write-Host "IMPORTANTE: Si Python no se reconoce, reinicia PowerShell o tu terminal." -ForegroundColor Yellow
        } catch {
            Write-Host ""
            Write-Host "Python instalado pero no se reconoce en PATH." -ForegroundColor Yellow
            Write-Host "Por favor:" -ForegroundColor Yellow
            Write-Host "1. Reinicia PowerShell" -ForegroundColor Yellow
            Write-Host "2. O agrega Python manualmente al PATH" -ForegroundColor Yellow
        }
        
        # Limpiar
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force
        }
        
    } catch {
        Write-Host ""
        Write-Host "Error al descargar o instalar Python: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Puedes descargar Python manualmente desde:" -ForegroundColor Yellow
        Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "Python ya está instalado. No es necesario reinstalar." -ForegroundColor Green
}

Write-Host ""

