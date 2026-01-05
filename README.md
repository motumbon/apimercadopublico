# Seguimiento de Licitaciones - Mercado Público Chile

Aplicación web para hacer seguimiento de licitaciones y órdenes de compra del portal [Mercado Público](https://www.mercadopublico.cl/).

## Características

- 🔍 **Buscar licitaciones** por código ID
- 📋 **Ver órdenes de compra** asociadas a cada licitación con sus montos
- 💾 **Almacenar licitaciones** para seguimiento continuo
- 🔄 **Actualización automática** diaria a las 18:00 hrs (hora Chile)
- 🔃 **Actualización manual** con botón de refrescar

## Requisitos

- Node.js >= 18.0.0
- npm

## Instalación Local

1. Clonar el repositorio:
```bash
git clone <tu-repositorio>
cd seguimiento-licitaciones-mp
```

2. Instalar dependencias:
```bash
npm run install:all
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tu ticket de API
```

4. Ejecutar en desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Deploy en Railway

1. Conectar el repositorio de GitHub a Railway
2. Configurar las variables de entorno en Railway:
   - `MERCADO_PUBLICO_TICKET`: Tu ticket de API
   - `NODE_ENV`: production
3. Railway detectará automáticamente el proyecto y lo desplegará

## API de Mercado Público

Esta aplicación utiliza la API pública de Mercado Público Chile:
- Documentación: https://api.mercadopublico.cl/modules/api.aspx
- Para obtener un ticket propio: https://api.mercadopublico.cl/modules/IniciarSesion.aspx

## Estructura del Proyecto

```
├── server/           # Backend Express
│   ├── index.js      # Servidor principal
│   ├── routes/       # Rutas de la API
│   ├── services/     # Lógica de negocio
│   └── db/           # Base de datos SQLite
├── client/           # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.jsx
│   └── ...
└── package.json
```

## Licencia

MIT
