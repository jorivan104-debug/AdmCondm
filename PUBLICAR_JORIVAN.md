# 🚀 Publicar para jorivan104-debug

## ✅ Configuración Lista

Tu repositorio local está configurado para:
- **Usuario**: jorivan104-debug
- **Repositorio**: AdmCondm
- **URL**: https://github.com/jorivan104-debug/AdmCondm

## 📋 Pasos para Publicar

### 1. Crear Repositorio en GitHub (YA ABIERTO EN TU NAVEGADOR)

Si no se abrió automáticamente, ve a:
👉 **https://github.com/new**

**Configuración:**
- ✅ Repository name: `AdmCondm` (ya está prellenado)
- ✅ Description: "Sistema de Gestión Condominial Multiplataforma" (ya está prellenado)
- ⚠️ **NO marques** ninguna de estas opciones:
  - ❌ Add a README file
  - ❌ Add .gitignore
  - ❌ Choose a license
- ✅ Visibility: **Público** (necesario para GitHub Pages gratis)
- ✅ Click en **"Create repository"**

### 2. Subir el Código

Una vez creado el repositorio, ejecuta este comando:

```powershell
git push -u origin main
```

**Si te pide autenticación:**
- Usuario: `jorivan104-debug`
- Contraseña: Usa un **Personal Access Token** (NO tu contraseña de GitHub)
  - Crear token: https://github.com/settings/tokens
  - Click en "Generate new token (classic)"
  - Selecciona scope: `repo` (marca la casilla completa)
  - Click en "Generate token"
  - Copia el token y úsalo como contraseña

### 3. Activar GitHub Pages

1. Ve a: **https://github.com/jorivan104-debug/AdmCondm/settings/pages**
2. En **Source**, selecciona: **"GitHub Actions"**
3. Click en **"Save"**

### 4. Verificar Despliegue

1. Ve a: **https://github.com/jorivan104-debug/AdmCondm/actions**
2. Verás un workflow ejecutándose: "Deploy Frontend to GitHub Pages"
3. Espera 2-5 minutos a que termine (verás un check verde ✅)

### 5. ¡Listo! Tu Sitio Estará En:

🌐 **https://jorivan104-debug.github.io/AdmCondm/**

---

## 🔄 Comandos Rápidos

```powershell
# Subir código
git push -u origin main

# Ver estado
git status

# Ver remotes
git remote -v
```

---

## 📝 Notas

- El despliegue es automático cada vez que hagas `git push`
- El frontend se desplegará en GitHub Pages
- El backend necesita desplegarse por separado (Railway, Render, etc.)
- Ver `DEPLOYMENT.md` para más detalles sobre el backend

---

## ❓ Si Tienes Problemas

### Error: "Authentication failed"
→ Crea un Personal Access Token y úsalo como contraseña

### Error: "Repository not found"
→ Asegúrate de haber creado el repositorio en GitHub primero

### El workflow no se ejecuta
→ Verifica que GitHub Pages esté configurado para "GitHub Actions"
