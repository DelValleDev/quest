# 🚀 Quest - Setup Guide

This guide will walk you step by step through configuring the Quest project.

---

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- [Supabase](https://supabase.com) account
- [OpenAI](https://platform.openai.com) account (for AI Coach)

---

## 1️⃣ Configure Supabase (Backend)

### Step 1: Create Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose a name and secure password
4. Wait ~2 minutes for creation

### Step 2: Run Migrations
Go to **SQL Editor** in your dashboard and run the migration files in order from `supabase/migrations/`:

```
📁 supabase/migrations/
├── 001_life_paths_subscription_limits.sql
├── 002_fix_assessment_questions.sql
├── ... (continue in numerical order)
└── 023_generate_daily_agenda.sql
```

> **Note**: For initial setup, run `database/00_MASTER_SCHEMA.sql` first, then `database/01_ASSESSMENT_QUESTIONS.sql`, and finally apply migrations in order.

⚠️ **Important**: Execute each file separately and verify there are no errors.

### Step 3: Get Credentials
1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 2️⃣ Configure OpenAI (AI Coach)

### Step 1: Create API Key
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)

### Step 2: Add Credits
1. Go to [Billing](https://platform.openai.com/settings/organization/billing)
2. Add a payment method
3. The `gpt-4o-mini` model costs approximately:
   - $0.15 per 1M input tokens
   - $0.60 per 1M output tokens
   - For normal use: ~$5-10/month

⚠️ **Without API key**: The AI Coach will work with pre-defined responses (local fallback).

---

## 3️⃣ Configure Health Integrations

### HealthKit (iOS)
HealthKit is already configured in the project. Permissions are requested at runtime.

### Google Fit (Android)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable **Fitness API**
4. Create OAuth credentials (Android type)
5. Add your SHA-1 fingerprint
6. Add Client ID to `.env`:
   ```
   EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

---

## 4️⃣ Configure Environment Variables

1. In the `app/` folder, copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   # Supabase (REQUIRED)
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   
   # OpenAI (REQUIRED for AI Coach)
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-xxxxx
   
   # Google Fit (Android)
   EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID=xxxxx.apps.googleusercontent.com
   
   # RevenueCat (Optional - for payments)
   EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxx
   EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxx
   ```

---

## 5️⃣ Install and Run

```bash
# Enter the app folder
cd app

# Install dependencies
npm install

# Start Expo
npx expo start
```

Options to view the app:
- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Expo Go (your phone)**: Scan the QR code

---

## 🧪 Test Everything Works

### Test 1: Supabase Connection
1. Open the app
2. Register a new account
3. You should be able to create a user without errors

### Test 2: AI Coach
1. Go to the Quest Coach screen (chat)
2. Type "Hello"
3. If OpenAI is configured: Personalized response
4. If not: Generic response (fallback)

### Test 3: Assessment
1. Complete the initial questionnaire
2. Verify in Supabase that `pillar_scores` were saved

---

## ❓ Troubleshooting

### Error: "supabase is not defined"
→ Verify that `.env` has the correct Supabase variables

### Error: "OpenAI API error"
→ Verify your API key and that you have credits

### Error: "Policy already exists"
→ Already fixed in SQL files with `DROP POLICY IF EXISTS`

### App doesn't load
→ Delete `node_modules` and reinstall:
```bash
rm -rf node_modules
npm install
```

---

## 📱 For Production

When you're ready to publish:

1. **EAS Build**:
   ```bash
   npx eas build --platform all
   ```

2. **Production variables** in `eas.json`

3. **Production Supabase**: Use a separate project

---

## 📞 Support

Problems? Check:
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [OpenAI API Reference](https://platform.openai.com/docs)

---

---

# 🚀 Quest - Guía de Configuración (Español)

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

### Paso 2: Ejecutar Migraciones
Ve a **SQL Editor** en tu dashboard y ejecuta los archivos de migración en orden desde `supabase/migrations/`:

```
📁 supabase/migrations/
├── 001_life_paths_subscription_limits.sql
├── 002_fix_assessment_questions.sql
├── ... (continúa en orden numérico)
└── 023_generate_daily_agenda.sql
```

> **Nota**: Para setup inicial, ejecuta primero `database/00_MASTER_SCHEMA.sql`, luego `database/01_ASSESSMENT_QUESTIONS.sql`, y finalmente aplica las migraciones en orden.

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

## 3️⃣ Configurar Integraciones de Salud

### HealthKit (iOS)
HealthKit ya está configurado en el proyecto. Los permisos se solicitan en tiempo de ejecución.

### Google Fit (Android)
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea o selecciona un proyecto
3. Habilita **Fitness API**
4. Crea credenciales OAuth (tipo Android)
5. Agrega tu fingerprint SHA-1
6. Agrega el Client ID a `.env`:
   ```
   EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   ```

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
   
   # Google Fit (Android)
   EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID=xxxxx.apps.googleusercontent.com
   
   # RevenueCat (Opcional - para pagos)
   EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxx
   EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxx
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
