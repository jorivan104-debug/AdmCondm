# Script para publicar en GitHub automáticamente
# Ejecuta este script después de crear el repositorio en GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsuario,
    
    [Parameter(Mandatory=$false)]
    [string]$RepositorioNombre = "AdmCondm"
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PUBLICANDO PROYECTO EN GITHUB" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: No se encontró un repositorio Git. Ejecuta 'git init' primero." -ForegroundColor Red
    exit 1
}

# Verificar que git está instalado
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Git no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar si ya existe el remote origin
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "⚠️  Ya existe un remote 'origin': $remoteExists" -ForegroundColor Yellow
    $sobrescribir = Read-Host "¿Deseas sobrescribirlo? (s/n)"
    if ($sobrescribir -eq "s" -or $sobrescribir -eq "S") {
        git remote remove origin
        Write-Host "✅ Remote origin eliminado" -ForegroundColor Green
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 1
    }
}

# Configurar la rama main
Write-Host ""
Write-Host "📌 Configurando rama main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✅ Rama configurada como 'main'" -ForegroundColor Green

# Agregar remote origin
$repoUrl = "https://github.com/$GitHubUsuario/$RepositorioNombre.git"
Write-Host ""
Write-Host "🔗 Agregando remote origin: $repoUrl" -ForegroundColor Yellow
git remote add origin $repoUrl
Write-Host "✅ Remote origin agregado" -ForegroundColor Green

# Verificar estado
Write-Host ""
Write-Host "📊 Estado del repositorio:" -ForegroundColor Yellow
git status

# Hacer push
Write-Host ""
Write-Host "🚀 Subiendo código a GitHub..." -ForegroundColor Yellow
Write-Host "⚠️  Nota: Se te pedirá autenticación (usuario y token de GitHub)" -ForegroundColor Yellow
Write-Host ""

try {
    git push -u origin main
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ✅ ¡CÓDIGO SUBIDO EXITOSAMENTE!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Ve a: https://github.com/$GitHubUsuario/$RepositorioNombre" -ForegroundColor White
    Write-Host "2. Settings → Pages → Source: GitHub Actions" -ForegroundColor White
    Write-Host "3. Tu sitio estará en: https://$GitHubUsuario.github.io/$RepositorioNombre/" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "❌ Error al hacer push. Verifica:" -ForegroundColor Red
    Write-Host "   - Que el repositorio exista en GitHub" -ForegroundColor Red
    Write-Host "   - Que tengas permisos para escribir" -ForegroundColor Red
    Write-Host "   - Que hayas ingresado las credenciales correctas" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Si necesitas un token de acceso:" -ForegroundColor Yellow
    Write-Host "   https://github.com/settings/tokens" -ForegroundColor Yellow
    exit 1
}
