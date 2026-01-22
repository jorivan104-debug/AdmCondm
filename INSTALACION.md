# Guía de Instalación - Sistema de Gestión Condominial

Esta guía te ayudará a instalar todas las herramientas necesarias para desarrollar y ejecutar la aplicación en Windows.

## Requisitos Previos

- Windows 10 o superior
- Acceso a internet
- Permisos de administrador (para algunas instalaciones)

## Paso 1: Instalar Node.js y npm

1. Visita https://nodejs.org/
2. Descarga la versión LTS (Long Term Support)
3. Ejecuta el instalador
4. Acepta los términos y sigue el asistente
5. **Importante**: Asegúrate de marcar la opción "Automatically install the necessary tools"

**Verificación:**
```powershell
node --version
npm --version
```

Deberías ver versiones como `v20.x.x` y `10.x.x`

## Paso 2: Instalar Python

1. Visita https://www.python.org/downloads/
2. Descarga Python 3.11 o superior
3. Ejecuta el instalador
4. **MUY IMPORTANTE**: Marca la casilla "Add Python to PATH" antes de instalar
5. Selecciona "Install Now"

**Verificación:**
```powershell
python --version
pip --version
```

Deberías ver `Python 3.11.x` o superior

## Paso 3: Instalar PostgreSQL

1. Visita https://www.postgresql.org/download/windows/
2. Descarga el instalador de EnterpriseDB
3. Ejecuta el instalador
4. Durante la instalación:
   - Selecciona el puerto por defecto (5432)
   - **Anota la contraseña** que configures para el usuario `postgres` (la necesitarás después)
   - Selecciona "Locale" como "Spanish, Spain" o "English, United States"
5. Completa la instalación

**Verificación:**
```powershell
psql --version
```

## Paso 4: Instalar Git

1. Visita https://git-scm.com/download/win
2. Descarga el instalador
3. Ejecuta el instalador
4. Usa las opciones por defecto (recomendado)

**Verificación:**
```powershell
git --version
```

## Paso 5: Instalar Java JDK (Para React Native Android)

1. Visita https://adoptium.net/
2. Selecciona:
   - Version: 17 (LTS)
   - Operating System: Windows
   - Architecture: x64
3. Descarga el instalador `.msi`
4. Ejecuta el instalador
5. Durante la instalación, marca "Set JAVA_HOME variable"

**Configurar JAVA_HOME manualmente (si es necesario):**
1. Abre "Variables de entorno" desde el Panel de Control
2. En "Variables del sistema", busca o crea `JAVA_HOME`
3. Establece el valor como: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot` (ajusta la versión)
4. Agrega a PATH: `%JAVA_HOME%\bin`

**Verificación:**
```powershell
java -version
```

Deberías ver algo como `openjdk version "17.x.x"`

## Paso 6: Instalar Android Studio (Para React Native)

1. Visita https://developer.android.com/studio
2. Descarga Android Studio
3. Ejecuta el instalador
4. Durante la instalación:
   - Selecciona "Standard" installation
   - Acepta las licencias
5. Una vez abierto Android Studio:
   - Ve a "More Actions" > "SDK Manager"
   - En la pestaña "SDK Platforms", marca:
     - Android 13.0 (Tiramisu)
     - Android 12.0 (S)
   - En la pestaña "SDK Tools", marca:
     - Android SDK Build-Tools
     - Android SDK Command-line Tools
     - Android SDK Platform-Tools
     - Android Emulator
     - Intel x86 Emulator Accelerator (HAXM installer)
   - Haz clic en "Apply" y espera la descarga

**Configurar Variables de Entorno:**
1. Abre "Variables de entorno" desde el Panel de Control
2. Crea una nueva variable del sistema:
   - Nombre: `ANDROID_HOME`
   - Valor: `C:\Users\USUARIO\AppData\Local\Android\Sdk` (ajusta la ruta si instalaste en otro lugar)
3. Edita la variable `Path` y agrega:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

**Verificación:**
```powershell
adb version
```

## Paso 7: Instalar React Native CLI

Abre PowerShell como administrador y ejecuta:

```powershell
npm install -g react-native-cli
```

**Verificación:**
```powershell
react-native --version
```

## Paso 8: Instalar Visual Studio Code (Recomendado)

1. Visita https://code.visualstudio.com/
2. Descarga el instalador
3. Ejecuta el instalador
4. Durante la instalación, marca "Add to PATH"

**Extensiones Recomendadas:**
Una vez instalado VS Code, instala estas extensiones:
- Python (Microsoft)
- ESLint
- Prettier - Code formatter
- PostgreSQL (Chris Kolkman)
- React Native Tools
- Tailwind CSS IntelliSense
- shadcn/ui Snippets

## Paso 9: Verificar Todas las Instalaciones

Crea un script de verificación ejecutando este comando en PowerShell:

```powershell
Write-Host "=== Verificación de Instalaciones ===" -ForegroundColor Green
Write-Host ""
Write-Host "Node.js: " -NoNewline; node --version
Write-Host "npm: " -NoNewline; npm --version
Write-Host "Python: " -NoNewline; python --version
Write-Host "pip: " -NoNewline; pip --version
Write-Host "PostgreSQL: " -NoNewline; psql --version
Write-Host "Git: " -NoNewline; git --version
Write-Host "Java: " -NoNewline; java -version 2>&1 | Select-Object -First 1
Write-Host "React Native CLI: " -NoNewline; react-native --version
Write-Host "Android SDK: " -NoNewline; if ($env:ANDROID_HOME) { Write-Host "Configurado en $env:ANDROID_HOME" } else { Write-Host "NO CONFIGURADO" -ForegroundColor Red }
```

## Paso 10: Reiniciar el Sistema

Después de instalar todo, **reinicia tu computadora** para asegurar que todas las variables de entorno se carguen correctamente.

## Solución de Problemas Comunes

### Python no se reconoce
- Asegúrate de haber marcado "Add Python to PATH" durante la instalación
- Reinicia PowerShell después de instalar Python
- Verifica manualmente las variables de entorno

### PostgreSQL no se reconoce
- Asegúrate de que PostgreSQL esté en el PATH
- La ruta típica es: `C:\Program Files\PostgreSQL\15\bin` (ajusta la versión)

### Android SDK no se reconoce
- Verifica que `ANDROID_HOME` esté configurado correctamente
- Asegúrate de haber agregado las rutas al PATH
- Reinicia PowerShell después de configurar

### Java no se reconoce
- Verifica que `JAVA_HOME` esté configurado
- Asegúrate de que `%JAVA_HOME%\bin` esté en el PATH

## Próximos Pasos

Una vez completada la instalación, el siguiente paso será:
1. Crear la estructura del proyecto
2. Configurar el entorno virtual de Python
3. Instalar dependencias del backend
4. Configurar la base de datos
5. Instalar dependencias del frontend

¿Necesitas ayuda con algún paso específico? Avísame y te guío.

