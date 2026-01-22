# Guía de Despliegue en GitHub

Esta guía explica cómo desplegar el proyecto en GitHub para que sea accesible desde internet.

## Configuración Inicial

### 1. Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio
2. Nombre sugerido: `AdmCondm` (o el que prefieras)
3. **NO** inicialices con README, .gitignore o licencia (ya los tenemos)

### 2. Inicializar Git Localmente

```powershell
# En la raíz del proyecto
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/AdmCondm.git
git push -u origin main
```

## Despliegue del Frontend (GitHub Pages)

### Configuración Automática

El proyecto ya está configurado con GitHub Actions para desplegar automáticamente el frontend en GitHub Pages cuando hagas push a la rama `main`.

### Pasos para Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Pages**
3. En **Source**, selecciona **GitHub Actions**
4. Guarda los cambios

### Configurar URL del Backend (Opcional)

Si tu backend está desplegado en otro servicio (Railway, Render, etc.):

1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Click en **New repository secret**
3. Nombre: `VITE_API_URL`
4. Valor: La URL completa de tu API (ej: `https://tu-api.railway.app/api`)
5. Click en **Add secret**

### Verificar Despliegue

Después de hacer push a `main`:
- Ve a **Actions** en tu repositorio
- Verás el workflow ejecutándose
- Cuando termine, tu sitio estará disponible en:
  `https://TU_USUARIO.github.io/AdmCondm/`

## Despliegue del Backend

GitHub Pages solo sirve archivos estáticos, por lo que el backend necesita desplegarse en otro servicio.

### Opción 1: Railway (Recomendado)

1. Ve a [Railway](https://railway.app)
2. Crea una cuenta y conecta tu repositorio de GitHub
3. Crea un nuevo proyecto desde GitHub
4. Selecciona el directorio `backend`
5. Railway detectará automáticamente que es Python
6. Configura las variables de entorno:
   - `DATABASE_URL`: URL de tu base de datos PostgreSQL
   - `SECRET_KEY`: Una clave secreta aleatoria
   - `CORS_ORIGINS`: `https://TU_USUARIO.github.io`
7. Railway desplegará automáticamente

### Opción 2: Render

1. Ve a [Render](https://render.com)
2. Crea una cuenta y conecta tu repositorio
3. Crea un nuevo **Web Service**
4. Selecciona tu repositorio y el directorio `backend`
5. Configura:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Configura las variables de entorno (igual que Railway)
7. Render desplegará automáticamente

### Opción 3: Heroku

1. Instala [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Crea app: `heroku create tu-app-nombre`
4. Configura variables: `heroku config:set DATABASE_URL=... SECRET_KEY=...`
5. Despliega: `git push heroku main`

## Configuración Completa

### 1. Backend Desplegado

Una vez que tengas tu backend desplegado, obtén su URL:
- Railway: `https://tu-proyecto.railway.app`
- Render: `https://tu-proyecto.onrender.com`
- Heroku: `https://tu-app.herokuapp.com`

### 2. Actualizar Frontend

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Agrega el secret `VITE_API_URL` con el valor: `https://tu-backend-url.com/api`
4. Haz un nuevo commit y push para que se vuelva a desplegar

### 3. Configurar CORS en Backend

Asegúrate de que tu backend permita requests desde GitHub Pages:

En `backend/app/core/config.py`, actualiza `CORS_ORIGINS`:

```python
CORS_ORIGINS: List[str] = [
    "https://TU_USUARIO.github.io",
    "http://localhost:5173",  # Para desarrollo local
]
```

## URLs Finales

- **Frontend**: `https://TU_USUARIO.github.io/AdmCondm/`
- **Backend API**: `https://tu-backend-url.com`
- **API Docs**: `https://tu-backend-url.com/docs`

## Actualizaciones Automáticas

Cada vez que hagas `git push` a la rama `main`:
- El frontend se desplegará automáticamente en GitHub Pages
- El backend se actualizará automáticamente si usas Railway/Render con auto-deploy

## Solución de Problemas

### Frontend no carga
- Verifica que GitHub Pages esté activado en Settings → Pages
- Revisa los logs en Actions para ver errores de build

### Errores de CORS
- Verifica que `CORS_ORIGINS` incluya tu URL de GitHub Pages
- Asegúrate de que `VITE_API_URL` esté configurado correctamente

### Backend no responde
- Verifica que el servicio esté corriendo (Railway/Render dashboard)
- Revisa los logs del servicio
- Verifica las variables de entorno
