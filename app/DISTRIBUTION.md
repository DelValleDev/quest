# 🚀 Guía de Distribución de Quest con EAS Build

## Paso 1: Instalar EAS CLI

```bash
npm install -g eas-cli
```

## Paso 2: Iniciar sesión en Expo

```bash
eas login
```

## Paso 3: Configurar el proyecto

1. **Actualiza los placeholders en `app.json`:**
   - `YOUR_EXPO_USERNAME`: Tu nombre de usuario de Expo
   - `com.yourcompany.quest`: Tu bundle identifier/package name único
   - `YOUR_EAS_PROJECT_ID`: Se generará automáticamente

2. **Actualiza los placeholders en `eas.json`:**
   - `YOUR_APPLE_ID`: Tu Apple ID (email)
   - `YOUR_ASC_APP_ID`: Tu App Store Connect App ID
   - `YOUR_TEAM_ID`: Tu Apple Developer Team ID

## Paso 4: Vincular el proyecto a EAS

```bash
cd app
eas init
```

Esto generará automáticamente el `projectId` y actualizará tu `app.json`.

## Paso 5: Configurar las credenciales

### Para iOS:
```bash
eas credentials
```
Selecciona iOS y sigue las instrucciones para configurar:
- Apple Developer Account
- Distribution Certificate
- Provisioning Profile

### Para Android:
```bash
eas credentials
```
Selecciona Android y genera un nuevo keystore o usa uno existente.

## Paso 6: Crear builds

### Build de desarrollo (para probar):
```bash
# Android APK para testing
eas build --profile development --platform android

# iOS Simulator build
eas build --profile development --platform ios
```

### Build de preview (para testers internos):
```bash
# Android APK
eas build --profile preview --platform android

# iOS (requiere Apple Developer Account)
eas build --profile preview --platform ios
```

### Build de producción (para las tiendas):
```bash
# Android App Bundle para Play Store
eas build --profile production --platform android

# iOS para App Store
eas build --profile production --platform ios
```

## Paso 7: Distribuir

### Distribución interna con EAS (recomendado para testing):
Los builds de desarrollo y preview se pueden descargar directamente desde:
- https://expo.dev/accounts/YOUR_USERNAME/projects/quest-app/builds

### Subir a las tiendas:
```bash
# Subir a Google Play Store
eas submit --platform android

# Subir a App Store
eas submit --platform ios
```

---

## 📱 Configuración de OAuth (Google/Apple Sign-In)

### Google Sign-In:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. Habilita "Google Sign-In API"
4. Ve a Credentials → Create Credentials → OAuth 2.0 Client ID
5. Crea credenciales para:
   - Web application (para Expo Go y web)
   - iOS (con tu bundle ID)
   - Android (con tu package name y SHA-1 fingerprint)

6. Actualiza `socialAuth.ts` con tus Client IDs:
```typescript
const GOOGLE_CLIENT_ID = {
  expo: 'tu-expo-client-id.apps.googleusercontent.com',
  ios: 'tu-ios-client-id.apps.googleusercontent.com',
  android: 'tu-android-client-id.apps.googleusercontent.com',
  web: 'tu-web-client-id.apps.googleusercontent.com',
};
```

### Apple Sign-In:

1. Ve a [Apple Developer Portal](https://developer.apple.com/)
2. Ve a Certificates, Identifiers & Profiles
3. Selecciona tu App ID
4. Habilita "Sign In with Apple" capability
5. En Supabase Dashboard:
   - Ve a Authentication → Providers → Apple
   - Configura tu Service ID, Team ID, y Key ID

---

## 📦 Archivos necesarios para producción

### Para Android:
- `google-services.json` - Descarga de Firebase Console
- Keystore (generado por EAS o propio)

### Para iOS:
- Apple Developer Account
- Certificados de distribución
- Provisioning Profile

---

## 🔄 Updates OTA (Over-the-Air)

Con EAS Update puedes enviar actualizaciones de código sin pasar por las tiendas:

```bash
# Instalar dependencia
npx expo install expo-updates

# Publicar update
eas update --branch production --message "Fix: corrección de bug"
```

---

## 🎯 Checklist pre-lanzamiento

- [ ] Actualizar versión en `app.json`
- [ ] Probar en dispositivos reales
- [ ] Verificar que OAuth funciona correctamente
- [ ] Verificar push notifications
- [ ] Preparar screenshots para las tiendas
- [ ] Escribir descripción de la app
- [ ] Preparar políticas de privacidad
- [ ] Configurar In-App Purchases (para Premium)

---

## 📞 Soporte

Si tienes problemas:
- [Documentación de EAS](https://docs.expo.dev/eas/)
- [Discord de Expo](https://discord.gg/expo)
- [Foro de Expo](https://forums.expo.dev/)
