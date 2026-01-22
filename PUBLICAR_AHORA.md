# 🚀 Publicar en GitHub AHORA - Guía Rápida

## ⚡ Opción Rápida (Recomendada)

### Paso 1: Crear Repositorio en GitHub (1 minuto)

1. Ve a: **https://github.com/new**
2. Completa:
   - **Repository name**: `AdmCondm`
   - **Description**: "Sistema de Gestión Condominial Multiplataforma"
   - **Visibility**: Público (para GitHub Pages gratis)
   - ❌ **NO marques** ninguna opción adicional
3. Click en **"Create repository"**

### Paso 2: Ejecutar Script Automático

Abre PowerShell en esta carpeta y ejecuta:

```powershell
.\publicar-completo.ps1
```

El script te pedirá tu usuario de GitHub y hará todo automáticamente.

---

## 📝 Opción Manual (Si prefieres control total)

### 1. Crear Repositorio
- Ve a https://github.com/new
- Crea el repositorio `AdmCondm`

### 2. Conectar y Subir

```powershell
# Reemplaza TU_USUARIO con tu usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/AdmCondm.git
git push -u origin main
```

**Nota**: Si te pide autenticación:
- Usuario: Tu usuario de GitHub
- Contraseña: Usa un **Personal Access Token** (no tu contraseña)
- Crear token: https://github.com/settings/tokens
- Selecciona scope: `repo`

### 3. Activar GitHub Pages

1. Ve a: `https://github.com/TU_USUARIO/AdmCondm/settings/pages`
2. En **Source**, selecciona: **"GitHub Actions"**
3. Click en **"Save"**

### 4. Verificar Despliegue

1. Ve a: `https://github.com/TU_USUARIO/AdmCondm/actions`
2. Espera a que termine el workflow (2-5 minutos)
3. Tu sitio estará en: **`https://TU_USUARIO.github.io/AdmCondm/`**

---

## ✅ Verificación Final

Una vez desplegado, verifica:

- ✅ Frontend: `https://TU_USUARIO.github.io/AdmCondm/`
- ✅ Repositorio: `https://github.com/TU_USUARIO/AdmCondm`
- ✅ Actions: `https://github.com/TU_USUARIO/AdmCondm/actions`

---

## 🔧 Si Tienes Problemas

### Error: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/AdmCondm.git
```

### Error: "Authentication failed"
1. Crea un token: https://github.com/settings/tokens
2. Usa el token como contraseña (no tu contraseña de GitHub)

### El workflow no se ejecuta
- Verifica que GitHub Pages esté en "GitHub Actions"
- Verifica que el archivo `.github/workflows/deploy-frontend.yml` exista

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas, ejecuta el script interactivo:
```powershell
.\publicar-completo.ps1
```

El script te guiará paso a paso.
