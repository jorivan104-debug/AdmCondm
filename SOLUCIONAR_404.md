# 🔧 Solucionar Error 404 en GitHub Pages

## Diagnóstico del Problema

El error 404 significa que GitHub Pages no está activo o el despliegue no se ha completado. Sigue estos pasos:

## ✅ Pasos para Solucionar

### 1. Verificar que el Repositorio Existe

Ve a: **https://github.com/jorivan104-debug/AdmCondm**

Si ves "404 Not Found", el repositorio no existe. Créalo:
- Ve a: https://github.com/new
- Nombre: `AdmCondm`
- Click en "Create repository"

### 2. Subir el Código (Si No Lo Has Hecho)

```powershell
git push -u origin main
```

Si te da error de autenticación:
1. Ve a: https://github.com/settings/tokens
2. Generate new token (classic)
3. Selecciona scope: `repo` (marca toda la sección)
4. Generate token
5. Copia el token y úsalo como contraseña cuando hagas push

### 3. Activar GitHub Pages (MUY IMPORTANTE)

1. Ve a: **https://github.com/jorivan104-debug/AdmCondm/settings/pages**
2. En la sección **"Source"**:
   - Selecciona: **"GitHub Actions"** (NO "Deploy from a branch")
3. Click en **"Save"**

### 4. Forzar Ejecución del Workflow

El workflow debería ejecutarse automáticamente, pero si no:

1. Ve a: **https://github.com/jorivan104-debug/AdmCondm/actions**
2. Click en **"Deploy Frontend to GitHub Pages"**
3. Click en **"Run workflow"** (botón a la derecha)
4. Selecciona branch: `main`
5. Click en **"Run workflow"**

### 5. Verificar que el Workflow se Ejecute

1. Ve a: **https://github.com/jorivan104-debug/AdmCondm/actions**
2. Deberías ver un workflow ejecutándose
3. Espera 2-5 minutos
4. Cuando termine (check verde ✅), tu sitio estará listo

### 6. Verificar la URL Correcta

Tu sitio estará en:
**https://jorivan104-debug.github.io/AdmCondm/**

⚠️ **IMPORTANTE**: 
- La URL debe tener `/AdmCondm/` al final
- Si solo pones `jorivan104-debug.github.io` sin el nombre del repo, dará 404

## 🔍 Verificación Rápida

Ejecuta estos comandos para verificar:

```powershell
# Verificar que el remote está configurado
git remote -v

# Verificar que hay commits
git log --oneline

# Intentar hacer push (si no lo has hecho)
git push -u origin main
```

## ❌ Problemas Comunes

### Error: "Repository not found"
→ El repositorio no existe en GitHub. Créalo primero.

### Error: "Authentication failed"
→ Usa un Personal Access Token, no tu contraseña.

### El workflow no aparece en Actions
→ Verifica que el archivo `.github/workflows/deploy-frontend.yml` existe y está en el repositorio.

### El workflow falla
→ Revisa los logs en la pestaña "Actions" para ver el error específico.

### GitHub Pages sigue dando 404 después de activarlo
→ Espera 5-10 minutos. GitHub Pages puede tardar en propagarse.

## 🚀 Comando Rápido para Forzar Despliegue

Si ya subiste el código y activaste GitHub Pages, puedes forzar un nuevo despliegue:

```powershell
# Hacer un cambio pequeño para forzar el workflow
echo "" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push
```

Esto forzará que el workflow se ejecute nuevamente.
