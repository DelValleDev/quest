# 🚀 Quest - Guía de Configuración

Esta guía te llevará paso a paso para configurar el proyecto Quest.

---

## 📋 Requisitos Previos

- Node.js 18+ instalado
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [OpenAI](https://platform.openai.com) (para el AI Coach)

---

## 1️⃣ Configurar Supabase (Backend)

### Paso 1: Crear Proyecto
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Clic en "New Project"
3. Elige un nombre y contraseña segura
4. Espera ~2 minutos a que se cree

### Paso 2: Ejecutar Scripts SQL
Ve a **SQL Editor** en tu dashboard y ejecuta los archivos en este orden:

```
📁 database/
├── 1. schema.sql              (tablas principales)
├── 2. social.sql              (amigos, solicitudes)
├── 3. shop.sql                (tienda, inventario)
├── 4. assessment.sql          (cuestionario inicial)
├── 5. daily_quests_achievements.sql
├── 6. daily_quest_system.sql  (quests diarias)
├── 7. duels_system.sql        (duelos 1v1)
├── 8. raids_system.sql        (raids grupales)
├── 9. classes_system.sql      (clases de personaje)
├── 10. activity_feed.sql      (feed de actividad)
├── 11. calendar_system.sql    (integración calendario)
└── 12. schema_updates.sql     (actualizaciones finales)
```

⚠️ **Importante**: Ejecuta cada archivo por separado y verifica que no haya errores.

### Paso 3: Obtener Credenciales
1. Ve a **Settings → API**
2. Copia:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 2️⃣ Configurar OpenAI (AI Coach)

### Paso 1: Crear API Key
1. Ve a [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Clic en "Create new secret key"
3. Copia la key (empieza con `sk-proj-...`)

### Paso 2: Agregar Créditos
1. Ve a [Billing](https://platform.openai.com/settings/organization/billing)
2. Agrega un método de pago
3. El modelo `gpt-4o-mini` cuesta aproximadamente:
   - $0.15 por 1M tokens de entrada
   - $0.60 por 1M tokens de salida
   - Para uso normal: ~$5-10/mes

⚠️ **Sin API key**: El AI Coach funcionará con respuestas pre-definidas (fallback local).

---

## 3️⃣ Configurar Google Calendar (Opcional)

### Paso 1: Crear Proyecto en Google Cloud
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services → Library**
4. Busca y habilita **Google Calendar API**

### Paso 2: Crear Credenciales OAuth
1. Ve a **APIs & Services → Credentials**
2. Clic en **Create Credentials → OAuth client ID**
3. Tipo: **Web application**
4. Authorized redirect URIs: `https://auth.expo.io/@TU_USUARIO/quest`
5. Copia:
   - **Client ID** → `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
   - **Client Secret** → `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`

### Paso 3: Configurar Consent Screen
1. Ve a **OAuth consent screen**
2. Llena la información básica
3. Agrega scope: `https://www.googleapis.com/auth/calendar.readonly`

---

## 4️⃣ Configurar Variables de Entorno

1. En la carpeta `app/`, copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```

2. Edita `.env` con tus valores:
   ```env
   # Supabase (REQUERIDO)
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   
   # OpenAI (REQUERIDO para AI Coach)
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-xxxxx
   
   # Google Calendar (OPCIONAL)
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
   ```

---

## 5️⃣ Instalar y Ejecutar

```bash
# Entrar a la carpeta de la app
cd app

# Instalar dependencias
npm install

# Iniciar Expo
npx expo start
```

Opciones para ver la app:
- **iOS Simulator**: Presiona `i`
- **Android Emulator**: Presiona `a`
- **Expo Go (tu teléfono)**: Escanea el QR

---

## 🧪 Probar que Todo Funciona

### Test 1: Conexión a Supabase
1. Abre la app
2. Registra una cuenta nueva
3. Deberías poder crear usuario sin errores

### Test 2: AI Coach
1. Ve a la pantalla de Quest Coach (chat)
2. Escribe "Hola"
3. Si OpenAI está configurado: Respuesta personalizada
4. Si no: Respuesta genérica (fallback)

### Test 3: Assessment
1. Completa el cuestionario inicial
2. Verifica en Supabase que se guardaron los `pillar_scores`

---

## ❓ Solución de Problemas

### Error: "supabase is not defined"
→ Verifica que `.env` tenga las variables de Supabase correctas

### Error: "OpenAI API error"
→ Verifica tu API key y que tengas créditos

### Error: "Policy already exists"
→ Ya arreglado en los SQL files con `DROP POLICY IF EXISTS`

### La app no carga
→ Borra `node_modules` y vuelve a instalar:
```bash
rm -rf node_modules
npm install
```

---

## 📱 Para Producción

Cuando estés listo para publicar:

1. **EAS Build**:
   ```bash
   npx eas build --platform all
   ```

2. **Variables de producción** en `eas.json`

3. **Supabase en producción**: Usa un proyecto separado

---

## 📞 Soporte

¿Problemas? Revisa:
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Expo](https://docs.expo.dev)
- [OpenAI API Reference](https://platform.openai.com/docs)

---

**¡Listo! Tu Quest está configurado.** 🎮✨
