# Script completo para publicar en GitHub
# Este script intenta automatizar todo el proceso posible

param(
    [Parameter(Mandatory=$false)]
    [string]$GitHubUsuario = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RepositorioNombre = "AdmCondm"
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 PUBLICACIÓN AUTOMÁTICA EN GITHUB" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git no está instalado. Instálalo desde: https://git-scm.com" -ForegroundColor Red
    exit 1
}

# Verificar que estamos en un repositorio Git
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Si no se proporcionó usuario, pedirlo
if ([string]::IsNullOrWhiteSpace($GitHubUsuario)) {
    Write-Host "📝 Necesito tu usuario de GitHub para continuar" -ForegroundColor Yellow
    $GitHubUsuario = Read-Host "Ingresa tu usuario de GitHub"
    
    if ([string]::IsNullOrWhiteSpace($GitHubUsuario)) {
        Write-Host "❌ Usuario requerido. Cancelando..." -ForegroundColor Red
        exit 1
    }
}

$repoUrl = "https://github.com/$GitHubUsuario/$RepositorioNombre.git"
$pagesUrl = "https://$GitHubUsuario.github.io/$RepositorioNombre/"

Write-Host ""
Write-Host "📋 Configuración:" -ForegroundColor Cyan
Write-Host "   Usuario: $GitHubUsuario" -ForegroundColor White
Write-Host "   Repositorio: $RepositorioNombre" -ForegroundColor White
Write-Host "   URL: $repoUrl" -ForegroundColor White
Write-Host "   GitHub Pages: $pagesUrl" -ForegroundColor White
Write-Host ""

# Verificar si hay cambios sin commitear
$status = git status --porcelain
if ($status) {
    Write-Host "📦 Hay cambios sin commitear. Agregándolos..." -ForegroundColor Yellow
    git add .
    $commitMessage = Read-Host "Mensaje del commit (Enter para usar mensaje por defecto)"
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $commitMessage = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
    git commit -m $commitMessage
    Write-Host "✅ Cambios commiteados" -ForegroundColor Green
}

# Verificar si existe remote origin
$currentRemote = git remote get-url origin 2>$null
if ($currentRemote) {
    if ($currentRemote -ne $repoUrl) {
        Write-Host "⚠️  Ya existe un remote origin diferente: $currentRemote" -ForegroundColor Yellow
        $sobrescribir = Read-Host "¿Deseas cambiarlo? (s/n)"
        if ($sobrescribir -eq "s" -or $sobrescribir -eq "S") {
            git remote set-url origin $repoUrl
            Write-Host "✅ Remote actualizado" -ForegroundColor Green
        }
    } else {
        Write-Host "✅ Remote origin ya está configurado correctamente" -ForegroundColor Green
    }
} else {
    Write-Host "🔗 Agregando remote origin..." -ForegroundColor Yellow
    git remote add origin $repoUrl
    Write-Host "✅ Remote agregado" -ForegroundColor Green
}

# Asegurar que estamos en main
git branch -M main

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  ⚠️  IMPORTANTE: ANTES DE CONTINUAR" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Asegúrate de haber creado el repositorio en GitHub:" -ForegroundColor White
Write-Host "   👉 https://github.com/new" -ForegroundColor Cyan
Write-Host ""
Write-Host "   - Nombre: $RepositorioNombre" -ForegroundColor White
Write-Host "   - NO marques README, .gitignore ni license" -ForegroundColor White
Write-Host "   - Click en 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "2. Si necesitas un token de acceso personal:" -ForegroundColor White
Write-Host "   👉 https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "   - Click en 'Generate new token (classic)'" -ForegroundColor White
Write-Host "   - Selecciona scope 'repo'" -ForegroundColor White
Write-Host ""
$continuar = Read-Host "¿Ya creaste el repositorio en GitHub? (s/n)"

if ($continuar -ne "s" -and $continuar -ne "S") {
    Write-Host ""
    Write-Host "⏸️  Pausando. Crea el repositorio y ejecuta este script nuevamente." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Comando rápido para ejecutar después:" -ForegroundColor Cyan
    Write-Host "   .\publicar-completo.ps1 -GitHubUsuario $GitHubUsuario" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "🚀 Subiendo código a GitHub..." -ForegroundColor Yellow
Write-Host "   (Se te pedirá autenticación si es necesario)" -ForegroundColor Gray
Write-Host ""

try {
    # Intentar push
    git push -u origin main 2>&1 | ForEach-Object {
        if ($_ -match "error|fatal|denied") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_ -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✅ ¡CÓDIGO SUBIDO EXITOSAMENTE!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 PRÓXIMOS PASOS MANUALES:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Activar GitHub Pages:" -ForegroundColor White
    Write-Host "   👉 https://github.com/$GitHubUsuario/$RepositorioNombre/settings/pages" -ForegroundColor Cyan
    Write-Host "   - Source: Selecciona 'GitHub Actions'" -ForegroundColor White
    Write-Host "   - Click en 'Save'" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Verificar el despliegue:" -ForegroundColor White
    Write-Host "   👉 https://github.com/$GitHubUsuario/$RepositorioNombre/actions" -ForegroundColor Cyan
    Write-Host "   - Espera a que termine el workflow 'Deploy Frontend to GitHub Pages'" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Tu sitio estará disponible en:" -ForegroundColor White
    Write-Host "   🌐 $pagesUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏱️  El despliegue puede tardar 2-5 minutos" -ForegroundColor Yellow
    Write-Host ""
    
    # Abrir el navegador con los enlaces importantes
    $abrir = Read-Host "¿Deseas abrir el repositorio en el navegador? (s/n)"
    if ($abrir -eq "s" -or $abrir -eq "S") {
        Start-Process "https://github.com/$GitHubUsuario/$RepositorioNombre"
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error al hacer push. Posibles causas:" -ForegroundColor Red
    Write-Host "   - El repositorio no existe en GitHub" -ForegroundColor Red
    Write-Host "   - Problemas de autenticación" -ForegroundColor Red
    Write-Host "   - No tienes permisos para escribir" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Soluciones:" -ForegroundColor Yellow
    Write-Host "   1. Verifica que el repositorio exista: $repoUrl" -ForegroundColor White
    Write-Host "   2. Crea un token de acceso: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "   3. Usa el token como contraseña al hacer push" -ForegroundColor White
    Write-Host ""
    exit 1
}
