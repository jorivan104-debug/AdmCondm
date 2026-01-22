# Setup del Backend

## Requisitos Previos

- Python 3.11+
- PostgreSQL instalado y corriendo
- Base de datos `admcondm` creada

## Pasos de Instalación

### 1. Crear entorno virtual

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Instalar dependencias

```powershell
pip install -r requirements.txt
```

### 3. Configurar base de datos

Crear la base de datos en PostgreSQL:

```sql
CREATE DATABASE admcondm;
```

### 4. Configurar variables de entorno

Crear archivo `.env` en la carpeta `backend/`:

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/admcondm
SECRET_KEY=tu-secret-key-segura-aqui
```

### 5. Inicializar base de datos

```powershell
python scripts/init_database.py
```

Este script:
- Crea todas las tablas
- Inicializa los roles (admin, accountant, accounting_assistant, user)
- Crea un usuario de prueba:
  - Email: `admin@test.com`
  - Password: `admin123`
  - Role: `admin`

### 6. Ejecutar el servidor

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El servidor estará disponible en:
- API: http://localhost:8000
- Documentación: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Usuario de Prueba

Después de ejecutar `init_database.py`, puedes usar:

- **Email**: admin@test.com
- **Password**: admin123
- **Role**: admin

## Solución de Problemas

### Error: "No module named 'app'"

Asegúrate de estar en la carpeta `backend/` y que el entorno virtual esté activado.

### Error de conexión a PostgreSQL

Verifica que:
1. PostgreSQL esté corriendo
2. La base de datos `admcondm` exista
3. Las credenciales en `.env` sean correctas

### Error al crear tablas

Si las tablas ya existen, puedes usar Alembic para migraciones:

```powershell
alembic upgrade head
```

