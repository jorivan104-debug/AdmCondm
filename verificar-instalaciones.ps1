# Script de Verificación de Instalaciones
# Ejecutar en PowerShell: .\verificar-instalaciones.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Instalaciones" -ForegroundColor Cyan
Write-Host "  Sistema de Gestión Condominial" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$instalaciones = @{
    "Node.js" = @{
        "Comando" = "node --version"
        "Requerido" = $true
    }
    "npm" = @{
        "Comando" = "npm --version"
        "Requerido" = $true
    }
    "Python" = @{
        "Comando" = "python --version"
        "Requerido" = $true
    }
    "pip" = @{
        "Comando" = "pip --version"
        "Requerido" = $true
    }
    "PostgreSQL" = @{
        "Comando" = "psql --version"
        "Requerido" = $true
    }
    "Git" = @{
        "Comando" = "git --version"
        "Requerido" = $true
    }
    "Java" = @{
        "Comando" = "java -version"
        "Requerido" = $false
    }
    "React Native CLI" = @{
        "Comando" = "react-native --version"
        "Requerido" = $false
    }
}

$todoOk = $true
$requeridosOk = $true

foreach ($item in $instalaciones.GetEnumerator()) {
    $nombre = $item.Key
    $info = $item.Value
    $comando = $info.Comando
    $requerido = $info.Requerido
    
    Write-Host "$nombre: " -NoNewline
    
    try {
        if ($nombre -eq "Java") {
            $resultado = & cmd /c "$comando 2>&1" | Select-Object -First 1
        } else {
            $resultado = Invoke-Expression $comando 2>&1
        }
        
        if ($LASTEXITCODE -eq 0 -or $resultado) {
            Write-Host $resultado -ForegroundColor Green
        } else {
            throw "Error"
        }
    } catch {
        if ($requerido) {
            Write-Host "NO INSTALADO (REQUERIDO)" -ForegroundColor Red
            $todoOk = $false
            $requeridosOk = $false
        } else {
            Write-Host "NO INSTALADO (Opcional)" -ForegroundColor Yellow
            $todoOk = $false
        }
    }
}

Write-Host ""
Write-Host "Variables de Entorno:" -ForegroundColor Cyan

# Verificar ANDROID_HOME
if ($env:ANDROID_HOME) {
    Write-Host "ANDROID_HOME: " -NoNewline
    Write-Host $env:ANDROID_HOME -ForegroundColor Green
} else {
    Write-Host "ANDROID_HOME: " -NoNewline
    Write-Host "NO CONFIGURADO (Opcional para React Native)" -ForegroundColor Yellow
}

# Verificar JAVA_HOME
if ($env:JAVA_HOME) {
    Write-Host "JAVA_HOME: " -NoNewline
    Write-Host $env:JAVA_HOME -ForegroundColor Green
} else {
    Write-Host "JAVA_HOME: " -NoNewline
    Write-Host "NO CONFIGURADO (Opcional para React Native)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($requeridosOk) {
    Write-Host "✓ Todas las herramientas requeridas están instaladas" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes proceder con la configuración del proyecto." -ForegroundColor Green
} else {
    Write-Host "✗ Faltan herramientas requeridas" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instala las herramientas marcadas como REQUERIDO" -ForegroundColor Yellow
    Write-Host "Consulta el archivo INSTALACION.md para instrucciones detalladas." -ForegroundColor Yellow
}

Write-Host ""

