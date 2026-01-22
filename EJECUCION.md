# Guía de Ejecución

## Resumen de Correcciones Realizadas

### Backend
1. ✅ Corregido import de `UserRole` y `UserCondominium` en `models/__init__.py`
2. ✅ Corregido endpoint de refresh token para usar el schema correcto
3. ✅ Eliminado import innecesario de `shutil` en `documents.py`
4. ✅ Creado script `init_database.py` para inicialización completa
5. ✅ Creado script `create_test_user.py` para crear usuario de prueba

### Frontend
- ✅ Estructura básica lista
- ✅ Configuración de autenticación correcta

## Pasos para Ejecutar

### 1. Backend

```powershell
# Navegar a backend
cd backend

# Crear y activar entorno virtual
python -m venv venv
.\venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt

# Crear base de datos PostgreSQL (ejecutar en psql o pgAdmin)
# CREATE DATABASE admcondm;

# Crear archivo .env con:
# DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/admcondm
# SECRET_KEY=tu-secret-key-segura

# Inicializar base de datos (crea tablas, roles y usuario de prueba)
python scripts/init_database.py

# Ejecutar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Web

```powershell
# En otra terminal, navegar a frontend/web
cd frontend/web

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

### 3. Acceder a la Aplicación

- **Frontend Web**: http://localhost:5173
- **API Backend**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

### 4. Usuario de Prueba

Después de ejecutar `init_database.py`, puedes usar:

- **Email**: `admin@test.com`
- **Password**: `admin123`
- **Role**: `admin`

## Verificación

1. Abre http://localhost:8000/health - Debe retornar `{"status": "healthy"}`
2. Abre http://localhost:8000/docs - Debe mostrar la documentación de la API
3. Abre http://localhost:5173 - Debe mostrar la página de login
4. Inicia sesión con `admin@test.com` / `admin123`

## Solución de Problemas

### Error: Python no encontrado
- Instala Python desde https://www.python.org/downloads/
- Asegúrate de marcar "Add Python to PATH" durante la instalación

### Error: PostgreSQL no encontrado
- Instala PostgreSQL desde https://www.postgresql.org/download/windows/
- Crea la base de datos `admcondm`

### Error: Módulo no encontrado
- Asegúrate de estar en la carpeta correcta
- Activa el entorno virtual: `.\venv\Scripts\Activate.ps1`
- Reinstala dependencias: `pip install -r requirements.txt`

### Error de conexión a base de datos
- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `.env`
- Verifica que la base de datos `admcondm` exista

