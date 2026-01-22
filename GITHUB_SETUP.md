# Configuración Inicial de GitHub

## Pasos para Publicar en GitHub

### 1. Crear Repositorio en GitHub

1. Ve a [GitHub.com](https://github.com) e inicia sesión
2. Click en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Completa:
   - **Repository name**: `AdmCondm` (o el nombre que prefieras)
   - **Description**: "Sistema de Gestión Condominial Multiplataforma"
   - **Visibility**: Público o Privado (según prefieras)
   - **NO marques** "Add a README file", "Add .gitignore", ni "Choose a license"
4. Click en **"Create repository"**

### 2. Conectar Repositorio Local con GitHub

Ejecuta estos comandos en PowerShell (en la raíz del proyecto):

```powershell
# Cambiar a la rama main (si no estás ya en ella)
git branch -M main

# Agregar el repositorio remoto (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/AdmCondm.git

# Subir el código
git push -u origin main
```

### 3. Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En **Source**, selecciona **"GitHub Actions"**
5. Guarda los cambios

### 4. Configurar URL del Backend (Opcional)

Si ya tienes el backend desplegado en Railway, Render u otro servicio:

1. En tu repositorio de GitHub, ve a **Settings** → **Secrets and variables** → **Actions**
2. Click en **"New repository secret"**
3. Completa:
   - **Name**: `VITE_API_URL`
   - **Secret**: La URL completa de tu API (ejemplo: `https://tu-api.railway.app/api`)
4. Click en **"Add secret"**

### 5. Verificar Despliegue

1. Ve a la pestaña **Actions** en tu repositorio
2. Verás un workflow ejecutándose llamado "Deploy Frontend to GitHub Pages"
3. Cuando termine (tiene un check verde), tu sitio estará disponible en:
   - `https://TU_USUARIO.github.io/AdmCondm/`

### 6. Actualizaciones Futuras

Cada vez que hagas cambios y hagas `git push`, el frontend se desplegará automáticamente.

```powershell
git add .
git commit -m "Descripción de los cambios"
git push
```

## Despliegue del Backend

El backend necesita desplegarse en un servicio separado. Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas.

### Opciones Recomendadas:

- **Railway**: https://railway.app (Más fácil, gratis con límites)
- **Render**: https://render.com (Gratis con límites)
- **Heroku**: https://heroku.com (Requiere tarjeta de crédito para apps gratuitas)

## URLs Finales

Una vez configurado todo:

- **Frontend**:** `https://TU_USUARIO.github.io/AdmCondm/`
- **Backend API**: `https://tu-backend-url.com`
- **API Docs**: `https://tu-backend-url.com/docs`

## Solución de Problemas

### Error: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/AdmCondm.git
```

### Error al hacer push
Asegúrate de estar autenticado en GitHub:
```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### El workflow no se ejecuta
- Verifica que GitHub Pages esté configurado para usar "GitHub Actions"
- Verifica que el archivo `.github/workflows/deploy-frontend.yml` exista
