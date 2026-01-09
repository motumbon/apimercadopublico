# Instrucciones para Generar APK

## Requisitos Previos

1. **Node.js 18+** instalado
2. **Cuenta de Expo** (gratuita): https://expo.dev/signup

## Pasos para Generar el APK

### 1. Instalar EAS CLI

```bash
npm install -g eas-cli
```

### 2. Iniciar sesión en Expo

```bash
eas login
```
Ingresa tu email y contraseña de Expo.

### 3. Ir a la carpeta mobile

```bash
cd mobile
```

### 4. Instalar dependencias

```bash
npm install
```

### 5. Configurar EAS (primera vez)

```bash
eas build:configure
```
Selecciona "All" cuando pregunte las plataformas.

### 6. Generar el APK

```bash
eas build -p android --profile preview
```

Este proceso:
- Sube el código a los servidores de Expo
- Compila la aplicación en la nube
- Genera un APK descargable

**Tiempo estimado**: 10-20 minutos

### 7. Descargar el APK

Una vez completado:
- Recibirás un link en la terminal
- También puedes ir a https://expo.dev y ver tus builds

## Alternativa: Build Local (requiere Android Studio)

Si prefieres compilar localmente:

```bash
# Generar proyecto nativo
npx expo prebuild

# Abrir en Android Studio
cd android
# Usar Android Studio para generar APK
```

## Solución de Problemas

### Error de credenciales
```bash
eas credentials
```

### Limpiar caché
```bash
npx expo start -c
```

### Verificar configuración
```bash
eas build:inspect -p android --profile preview
```

## Assets

Antes del build, asegúrate de tener los iconos:
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/adaptive-icon.png` (1024x1024)

Si no los tienes, el build usará los de Expo por defecto.
