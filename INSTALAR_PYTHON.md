# Instalación de Python

## Opción 1: Script Automático (Recomendado)

Ejecuta el script de PowerShell como administrador:

```powershell
.\instalar-python.ps1
```

El script:
1. Verifica si Python ya está instalado
2. Descarga Python 3.12.7 automáticamente
3. Abre el instalador
4. Te recuerda marcar "Add Python to PATH"

**IMPORTANTE**: Durante la instalación, DEBES marcar:
- ✓ **"Add Python to PATH"** (MUY IMPORTANTE)
- ✓ "Install for all users" (recomendado)

## Opción 2: Instalación Manual

1. Abre el navegador en: https://www.python.org/downloads/
2. Haz clic en "Download Python 3.12.x" (o la versión más reciente)
3. Ejecuta el instalador descargado
4. **MUY IMPORTANTE**: Marca la casilla **"Add Python to PATH"** antes de instalar
5. Haz clic en "Install Now"
6. Espera a que termine la instalación

## Verificación

Después de instalar, abre una **nueva** terminal de PowerShell y ejecuta:

```powershell
python --version
pip --version
```

Deberías ver algo como:
```
Python 3.12.7
pip 24.0
```

## Si Python no se reconoce

1. **Reinicia PowerShell** (cierra y abre una nueva ventana)
2. Si aún no funciona, agrega Python manualmente al PATH:
   - Busca "Variables de entorno" en Windows
   - Agrega `C:\Users\USUARIO\AppData\Local\Programs\Python\Python312` al PATH
   - O `C:\Program Files\Python312` si instalaste para todos los usuarios

## Siguiente Paso

Una vez instalado Python, puedes continuar con la ejecución del backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/init_database.py
uvicorn app.main:app --reload
```

