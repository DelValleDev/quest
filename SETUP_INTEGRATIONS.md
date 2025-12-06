# 🚀 GUÍA PASO A PASO - Completar Integrations System

## ✅ Lo que YA está hecho (automáticamente):
- ✅ Código de las 3 integraciones (Strava, Spotify, GitHub) 
- ✅ IntegrationsScreen UI completa
- ✅ Migration SQL lista para aplicar
- ✅ OpenAI context actualizado con datos de integrations
- ✅ Archivo .env.example actualizado con todas las variables
- ✅ Deep links configurados en app.json (scheme: "quest")
- ✅ 0 errores TypeScript

---

## 📋 Lo que TIENES QUE HACER (paso a paso):

### PASO 1: Aplicar Migration a Supabase ⚠️ CRÍTICO

**¿Qué hace?** Crea las tablas `user_integrations` y `user_activity_imports` en la base de datos.

**Opción A - Desde Dashboard (más fácil):**
1. Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Haz clic en el botón "SQL Editor" (icono de rayo ⚡)
3. Clic en "New query"
4. Copia TODO el contenido del archivo: `supabase/migrations/064_external_integrations.sql`
5. Pega en el editor
6. Clic en "Run" (botón verde abajo a la derecha)
7. Verifica que aparezca: "Success. No rows returned"

**Opción B - Desde Terminal:**
```bash
cd c:\Users\VICTUS\OneDrive\Escritorio\Programacion\Projects\Mios\proyectos githubcopilot\quest
supabase db push
```

**Verificación:**
Ejecuta esta query en SQL Editor para confirmar que las tablas existen:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_integrations', 'user_activity_imports');
```
Debería retornar 2 filas.

---

### PASO 2: Crear OAuth Apps (15-20 minutos)

#### 2.1 - Strava OAuth App 🏃

1. Ve a: https://www.strava.com/settings/api
2. Clic en "Create & Manage Your App"
3. Llena el formulario:
   - **Application Name:** Quest App
   - **Category:** Health & Fitness
   - **Website:** https://quest-app.com (o tu dominio)
   - **Authorization Callback Domain:** `quest`
   - **Application Icon:** (opcional, sube el logo de Quest)
4. Clic en "Create"
5. **COPIA Y GUARDA:**
   - Client ID: (número largo, ej: 123456)
   - Client Secret: (string largo, ej: abc123def456...)

#### 2.2 - Spotify OAuth App 🎵

1. Ve a: https://developer.spotify.com/dashboard
2. Clic en "Create app"
3. Llena el formulario:
   - **App name:** Quest App
   - **App description:** Gamified habit tracker with music mood analysis
   - **Redirect URIs:** `quest://spotify-callback`
   - **Which API/SDKs are you planning to use?** Web API
   - Acepta términos
4. Clic en "Save"
5. En la página de tu app, clic en "Settings"
6. **COPIA Y GUARDA:**
   - Client ID: (visible directamente)
   - Client Secret: (clic en "View client secret")

#### 2.3 - GitHub OAuth App 💻

1. Ve a: https://github.com/settings/developers
2. Clic en "New OAuth App"
3. Llena el formulario:
   - **Application name:** Quest App
   - **Homepage URL:** https://quest-app.com (o tu dominio)
   - **Authorization callback URL:** `quest://github-callback`
   - **Application description:** (opcional) Gamified productivity tracker
4. Clic en "Register application"
5. **COPIA Y GUARDA:**
   - Client ID: (visible directamente)
   - Clic en "Generate a new client secret"
   - Client Secret: (aparecerá, cópialo AHORA, solo se muestra una vez)

---

### PASO 3: Configurar Environment Variables

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cd app
   Copy-Item .env.example .env
   ```

2. Abre `app/.env` y reemplaza estos valores:
   ```bash
   # STRAVA
   EXPO_PUBLIC_STRAVA_CLIENT_ID=123456  # ← Tu Client ID de Strava
   EXPO_PUBLIC_STRAVA_CLIENT_SECRET=abc123def456  # ← Tu Client Secret de Strava

   # SPOTIFY
   EXPO_PUBLIC_SPOTIFY_CLIENT_ID=tu_spotify_client_id  # ← Tu Client ID de Spotify
   EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET=tu_spotify_secret  # ← Tu Client Secret de Spotify

   # GITHUB
   EXPO_PUBLIC_GITHUB_CLIENT_ID=tu_github_client_id  # ← Tu Client ID de GitHub
   EXPO_PUBLIC_GITHUB_CLIENT_SECRET=tu_github_secret  # ← Tu Client Secret de GitHub
   ```

3. **⚠️ IMPORTANTE:** Agrega `.env` a `.gitignore` si no está ya (para no subir secrets a Git)

---

### PASO 4: Rebuild la App (necesario para deep links)

Los deep links (`quest://strava-callback`) requieren rebuild nativo:

```bash
cd app

# Si usas iOS:
npx expo prebuild --clean
npx expo run:ios

# Si usas Android:
npx expo prebuild --clean
npx expo run:android

# O simplemente:
npx expo prebuild --clean
```

**¿Por qué?** El scheme "quest" necesita configurarse en archivos nativos de iOS/Android.

---

### PASO 5: Probar OAuth Flow

1. Abre la app
2. Ve a: **Profile → Settings → Integrations** (o donde hayas puesto IntegrationsScreen)
3. Clic en "Connect" en Strava
4. Debería abrir el navegador con Strava login
5. Autoriza la app
6. **Si todo funciona:** La app debería reabrir automáticamente y mostrar "Strava Connected ✅"
7. Clic en "Sync All" para probar el sync

**Troubleshooting:**
- Si el deep link no funciona (no reabre la app):
  - Verifica que hiciste `expo prebuild --clean`
  - En iOS: verifica Associated Domains en Xcode
  - En Android: verifica intent-filter en AndroidManifest.xml

---

### PASO 6: Verificar que Todo Funciona

#### Test 1: Strava Sync
1. Conecta Strava
2. Haz un workout en Strava (o usa uno viejo)
3. En la app, clic en "Sync All"
4. Ve a SQL Editor en Supabase:
   ```sql
   SELECT * FROM user_activity_imports 
   WHERE source = 'strava' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   Deberías ver tus workouts sincronizados.

#### Test 2: Auto-Complete Habit
1. Crea un hábito que se llame "Running" o "Exercise"
2. Sincroniza un workout de running desde Strava
3. Verifica que el hábito se marque como completado automáticamente

#### Test 3: AI Context
1. Habla con el AI Coach
2. El AI debería mencionar tu actividad de Strava (ej: "Vi que corriste 5km ayer!")
3. Verifica en logs que el contexto incluye integration data

---

## 🐛 Troubleshooting Común

### "OAuth redirect no funciona"
**Síntoma:** Después de autorizar en Strava, no vuelve a la app

**Solución:**
1. Verifica que `app.json` tiene `"scheme": "quest"` ✅ (ya está)
2. Haz rebuild: `npx expo prebuild --clean`
3. En Strava settings, verifica que "Authorization Callback Domain" sea exactamente `quest` (sin `://`)

### "Token expired error"
**Síntoma:** Error "Access token expired"

**Solución:** El código ya tiene auto-refresh. Verifica que `refresh_token` esté guardado en `user_integrations` table.

### "Duplicate activities synced"
**Síntoma:** Mismo workout aparece 2 veces

**Solución:** La tabla tiene UNIQUE constraint. Si pasa, limpia duplicados:
```sql
DELETE FROM user_activity_imports a
USING user_activity_imports b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.source = b.source
  AND a.external_id = b.external_id;
```

### "Cannot find module '../lib/integrations'"
**Síntoma:** Error al importar integrations

**Solución:** Reinicia el metro bundler:
```bash
npx expo start --clear
```

---

## 📊 Verificación Final - Checklist

Ejecuta este checklist para confirmar que todo funciona:

- [ ] Migration aplicada (tablas `user_integrations` y `user_activity_imports` existen)
- [ ] OAuth apps creadas en Strava, Spotify, GitHub
- [ ] `.env` configurado con Client IDs y Secrets
- [ ] App rebuildeada con `expo prebuild --clean`
- [ ] IntegrationsScreen se abre sin errores
- [ ] OAuth flow funciona (conectar Strava exitosamente)
- [ ] Sync manual funciona (botón "Sync All")
- [ ] Activities aparecen en `user_activity_imports` table
- [ ] Habit auto-complete funciona
- [ ] AI menciona integration data en conversaciones

---

## 🎯 Próximos Pasos Opcionales

Una vez que todo funcione:

1. **Background Sync:** Implementar sync automático cada 1 hora
2. **Push Notifications:** "🏃 Strava detected a workout! Mark your habit?"
3. **Webhooks:** Strava instant sync (no polling)
4. **Analytics Dashboard:** Ver stats de todas las integraciones
5. **Más Integraciones:** Todoist, Google Calendar, Notion

---

## 📝 Notas Importantes

- **Seguridad:** Los tokens se guardan en `user_integrations` con RLS (solo el user los ve)
- **Rate Limits:** Strava/Spotify/GitHub tienen límites de API calls. El código ya maneja esto.
- **Tokens Encryption:** Por ahora se guardan en texto plano. Para producción, considera encriptar con `expo-crypto`
- **Deep Links en Web:** Si buildeas para web, necesitas configurar universal links (más complejo)

---

## 🆘 Si Algo Falla

**Pégame en el chat:**
1. El mensaje de error completo
2. Query de verificación:
   ```sql
   SELECT * FROM user_integrations WHERE user_id = 'tu-user-id';
   ```
3. Screenshot del error en la app

Y te ayudo a debuggear!

---

**Última actualización:** 2025-12-06
**Tiempo estimado:** 30-45 minutos (si todo va bien)
