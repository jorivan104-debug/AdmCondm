# Sistema de Gestión Condominial Multiplataforma

Sistema completo para la gestión de condominios y propiedades horizontales, disponible en múltiples plataformas.

## Estructura del Proyecto

```
AdmCondm/
├── backend/          # API FastAPI (Python)
├── frontend/
│   ├── web/         # Aplicación React Web
│   ├── mobile/      # Aplicación React Native
│   └── desktop/     # Wrapper Electron
├── INSTALACION.md   # Guía de instalación
└── README.md        # Este archivo
```

## Características

- **Multiplataforma**: Web, Android, Windows, Mac
- **Gestión de Condominios**: CRUD completo de condominios
- **Gestión de Propiedades**: Apartamentos, casas, locales con historial de titularidad
- **Gestión de Residentes**: Con soporte para cambios de titularidad
- **Contabilidad Avanzada**: Transacciones, presupuestos, conciliación bancaria
- **Solicitudes de Espacios**: Reserva y aprobación de espacios públicos
- **Asambleas**: Gestión de reuniones y actas
- **Documentos**: Subida y gestión de documentos
- **Notificaciones**: Sistema de notificaciones
- **Roles**: Admin, Contador, Auxiliar de Contabilidad, Usuario

## Instalación

Ver [INSTALACION.md](INSTALACION.md) para instrucciones detalladas de instalación.

## Desarrollo

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Web

```bash
cd frontend/web
npm install
npm run dev
```

### Frontend Mobile

```bash
cd frontend/mobile
npm install
npm start
```

### Frontend Desktop

```bash
cd frontend/desktop
npm install
npm start
```

## Configuración

1. Crear base de datos PostgreSQL:
```sql
CREATE DATABASE admcondm;
```

2. Configurar variables de entorno en `backend/.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/admcondm
SECRET_KEY=your-secret-key
```

3. Ejecutar migraciones:
```bash
cd backend
alembic upgrade head
```

4. Inicializar roles:
```bash
python scripts/init_roles.py
```

## Tecnologías

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Alembic
- **Frontend Web**: React, Vite, TypeScript, shadcn/ui, Tailwind CSS
- **Frontend Mobile**: React Native, Expo, TypeScript
- **Frontend Desktop**: Electron

## Despliegue

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas de despliegue en GitHub Pages y servicios en la nube.

### Despliegue Rápido

1. **Frontend (GitHub Pages)**: Automático con GitHub Actions
   - URL: `https://TU_USUARIO.github.io/AdmCondm/`

2. **Backend**: Desplegar en Railway, Render o Heroku
   - Ver [DEPLOYMENT.md](DEPLOYMENT.md) para detalles

## Licencia

Este proyecto es privado.

