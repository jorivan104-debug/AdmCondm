# Backend - Sistema de Gestión Condominial

API REST desarrollada con FastAPI para la gestión de condominios y propiedades horizontales.

## Instalación

1. Crear un entorno virtual:
```bash
python -m venv venv
```

2. Activar el entorno virtual:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

5. Crear la base de datos PostgreSQL:
```sql
CREATE DATABASE admcondm;
```

6. Ejecutar migraciones:
```bash
alembic upgrade head
```

## Ejecutar el servidor

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en: http://localhost:8000

Documentación interactiva: http://localhost:8000/docs

## Estructura del Proyecto

```
backend/
├── app/
│   ├── api/          # Endpoints de la API
│   ├── core/         # Configuración y utilidades
│   ├── models/       # Modelos SQLAlchemy
│   ├── schemas/      # Schemas Pydantic
│   └── services/     # Lógica de negocio
├── alembic/          # Migraciones de base de datos
└── requirements.txt  # Dependencias
```

