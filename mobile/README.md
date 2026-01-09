# Seguimiento OC - Aplicación Móvil

Aplicación móvil para seguimiento de licitaciones y órdenes de compra de Mercado Público Chile.

## Características

- **Sincronización automática** con el servidor cada 2 minutos
- **Login/Registro** con las mismas credenciales de la versión web
- **Ver licitaciones** con filtros por institución, línea y mes de OC
- **Detalle de licitaciones** con información de saldos y montos
- **Ver órdenes de compra** asociadas a cada licitación
- **Items de licitación** con detalle de productos y adjudicaciones
- **Items de OC** con precios y totales
- **Notificaciones** de nuevas OC detectadas
- **Colores diferenciados** para proveedores propios (verde) vs otros (amarillo)

## Requisitos

- Node.js 18+
- npm o yarn
- Expo CLI
- EAS CLI (para build de APK)
- Cuenta de Expo (gratuita)

## Instalación

```bash
# Instalar dependencias
cd mobile
npm install

# Iniciar en modo desarrollo
npm start
```

## Build APK

### 1. Configurar EAS

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login en Expo
eas login

# Configurar proyecto (primera vez)
eas build:configure
```

### 2. Generar APK

```bash
# Build APK (perfil preview)
eas build -p android --profile preview

# O para producción
eas build -p android --profile production
```

### 3. Descargar APK

Una vez completado el build, recibirás un link para descargar el APK.
También puedes ver el estado en: https://expo.dev

## Configuración de API

La app se conecta por defecto al servidor en Railway:
```
https://web-production-fe1d1.up.railway.app/api
```

Para cambiar la URL, editar `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://tu-servidor.com/api"
    }
  }
}
```

## Estructura del Proyecto

```
mobile/
├── App.js                 # Entry point
├── app.json               # Configuración Expo
├── eas.json               # Configuración EAS Build
├── package.json
├── assets/                # Iconos y splash
└── src/
    ├── config/
    │   └── api.js         # Configuración de API y endpoints
    ├── contexts/
    │   ├── AuthContext.js # Manejo de autenticación
    │   └── DataContext.js # Manejo de datos y sincronización
    ├── navigation/
    │   └── AppNavigator.js # Navegación de la app
    └── screens/
        ├── LoginScreen.js
        ├── RegisterScreen.js
        ├── HomeScreen.js
        ├── LicitacionesScreen.js
        ├── LicitacionDetalleScreen.js
        ├── NotificacionesScreen.js
        └── PerfilScreen.js
```

## Sincronización

La app implementa sincronización automática:
- Al iniciar sesión, se cargan todos los datos del servidor
- Cada 2 minutos se actualizan los datos en segundo plano
- Pull-to-refresh disponible en todas las pantallas

## Notas

- La app requiere conexión a internet para funcionar
- Los datos se obtienen siempre del servidor (no hay almacenamiento local offline)
- Las credenciales de login son las mismas de la versión web
