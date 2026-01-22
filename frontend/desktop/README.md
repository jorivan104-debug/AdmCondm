# Frontend Desktop - Sistema de Gestión Condominial

Aplicación desktop desarrollada con Electron que reutiliza la aplicación web.

## Instalación

```bash
npm install
```

## Desarrollo

Primero, asegúrate de que la aplicación web esté corriendo en desarrollo:

```bash
cd ../web
npm run dev
```

Luego, en otra terminal:

```bash
cd desktop
npm start
```

## Build

Para crear ejecutables:

```bash
npm run build        # Build para todas las plataformas
npm run build:win    # Solo Windows
npm run build:mac    # Solo Mac
```

## Notas

- En desarrollo, la aplicación carga desde `http://localhost:5173`
- En producción, carga desde `../web/dist/index.html` (debe construirse primero)

