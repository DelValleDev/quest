# Quest - External Integrations System

**Status**: ✅ Complete (Strava, Spotify, GitHub) | ⏸️ Pending (Todoist, Google Calendar, Notion)

---

## 📋 Overview

Sistema completo de integraciones externas que permite a los usuarios conectar sus apps favoritas para:
- **Auto-sync de actividades** (workouts, música, commits)
- **Auto-complete de hábitos** (correr 5km → marca "ejercicio" como completado)
- **Insights profundos** (mood tracking, contribution streaks, etc.)
- **Quests personalizadas** (IA usa datos de integraciones para crear challenges específicos)

---

## 🎯 Integraciones Implementadas

### ✅ Strava (OAuth 2.0)
**Archivo**: `app/src/lib/integrations/strava.ts`

**Funcionalidades**:
- OAuth flow completo (getStravaAuthUrl, exchangeStravaCode, refreshStravaToken)
- Fetch activities últimos 7 días (running, cycling, swimming)
- Auto-refresh de tokens cuando expiran (< 1 hora)
- Sync automático: guarda en `user_activity_imports` con metadata (speed, elevation, heartrate)
- **Auto-complete habits**: Si tienes hábito "running" y sincronizas un workout, se marca como completado

**Datos sincronizados**:
```typescript
{
  distance_meters: 5000,
  duration_seconds: 1800, // 30 minutos
  calories: 450,
  metadata: {
    name: "Morning Run",
    average_speed: 2.78, // m/s
    elevation_gain: 120,
    heartrate: 145
  }
}
```

**Base de datos**: `user_integrations.integration_type = 'strava'`

---

### ✅ Spotify (OAuth 2.0)
**Archivo**: `app/src/lib/integrations/spotify.ts`

**Funcionalidades**:
- OAuth flow completo
- Fetch recently played tracks (últimas 50 canciones)
- **Audio features analysis**: valence (happiness), energy, danceability
- **Mood tracking**: calcula promedio de valence de todas las canciones escuchadas hoy
- **Auto-complete habits**: Si escuchas 30+ minutos de música calm (low energy, high valence), marca hábito "meditación" como completado

**Datos sincronizados**:
```typescript
{
  duration_seconds: 7200, // 2 horas de música
  metadata: {
    tracks_played: 45,
    mood_score: 72, // 0-100 based on valence
    energy_level: 58, // 0-100
    top_artists: ["Radiohead", "Pink Floyd", "Tame Impala"],
    listening_period: "24h"
  }
}
```

**Casos de uso IA**:
- Si mood_score < 40 (música triste) por 3 días consecutivos → IA pregunta "¿Estás bien?"
- Si user tiene bad habit "scrolling TikTok" y escucha 0 minutos música → quest: "Escucha 30 min de música en vez de redes sociales"

**Base de datos**: `user_integrations.integration_type = 'spotify'`

---

### ✅ GitHub (OAuth 2.0)
**Archivo**: `app/src/lib/integrations/github.ts`

**Funcionalidades**:
- OAuth flow completo
- Fetch commits de últimas 24 horas (usando GitHub Events API)
- Fetch pull requests (opened, merged)
- **Auto-complete habits**: Si tienes hábito "code 1 hour" y haces 1+ commit, se marca como completado

**Datos sincronizados**:
```typescript
{
  metadata: {
    commits_count: 12,
    prs_opened: 2,
    prs_merged: 1,
    repos: ["quest", "my-portfolio"],
    top_commit_messages: [
      "fix: Bad habits context in AI",
      "feat: Strava integration",
      "docs: Update README"
    ]
  }
}
```

**Casos de uso IA**:
- Si 0 commits por 3 días → quest: "Make 1 commit today, no matter how small"
- Si muchos commits pero 0 PRs → quest: "Open a PR for your work"

**Base de datos**: `user_integrations.integration_type = 'github'`

---

### ✅ Apple Health + Google Fit
**Archivo**: `app/src/lib/healthKit.ts` (ya existente)

**Funcionalidades**:
- Permisos nativos (iOS: HealthKit, Android: Google Fit)
- Sync steps, sleep, workouts, heart rate, calories

**Base de datos**: `user_integrations.integration_type = 'apple_health' | 'google_fit'`

---

## ⏸️ Integraciones Pendientes

### Todoist (OAuth 2.0)
**Prioridad**: ALTA
**Funcionalidades planeadas**:
- Sync bidireccional de tareas
- Completar tarea en Todoist → marca quest en Quest
- Crear quest en Quest → agrega tarea en Todoist
- Mantener sincronizados ambos ecosistemas

### Google Calendar (OAuth 2.0)
**Prioridad**: MEDIA
**Funcionalidades planeadas**:
- Importar eventos del día como scheduled quests
- Time blocking automático
- Track tiempo real vs estimado en tareas

### Notion (OAuth 2.0)
**Prioridad**: MEDIA
**Funcionalidades planeadas**:
- Sync bases de datos de tareas
- Importar páginas como quests
- Second brain integration

### MyFitnessPal
**Prioridad**: BAJA
**Funcionalidades planeadas**:
- Track calorías consumidas
- Auto-complete hábito "track food"

### Headspace / Calm
**Prioridad**: BAJA
**Funcionalidades planeadas**:
- Track minutos de meditación
- Auto-complete hábito "meditate"

---

## 🗄️ Estructura de Base de Datos

### Tabla: `user_integrations`
**Purpose**: Guardar OAuth tokens y estado de conexión

```sql
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  integration_type TEXT, -- 'strava', 'spotify', 'github', etc.
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMPTZ, -- Token expiration
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB, -- Username, scopes, etc.
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(user_id, integration_type)
);
```

### Tabla: `user_activity_imports`
**Purpose**: Guardar actividades sincronizadas (para no duplicar)

```sql
CREATE TABLE user_activity_imports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source TEXT, -- 'strava', 'spotify', 'github'
  external_id TEXT, -- ID externo (evita duplicados)
  activity_type TEXT, -- 'run', 'ride', 'music_listening', 'coding'
  distance_meters INT,
  duration_seconds INT,
  calories INT,
  date TIMESTAMPTZ,
  metadata JSONB, -- Activity-specific data
  created_at TIMESTAMPTZ,
  
  UNIQUE(user_id, source, external_id)
);
```

### Función: `auto_complete_habit_from_activity`
**Purpose**: Auto-completar hábitos cuando se importa actividad

```sql
CREATE FUNCTION auto_complete_habit_from_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_completion_date DATE,
  p_notes TEXT
) RETURNS BOOLEAN;
```

**Ejemplo de uso**:
```typescript
// Strava sync detecta workout de running
await auto_complete_habit_from_activity(
  userId,
  'run',
  '2025-01-18',
  'Auto-synced from Strava: Morning Run'
);
// Si user tiene hábito "running", se marca como completado
```

---

## 📱 UI: IntegrationsScreen

**Archivo**: `app/src/screens/main/IntegrationsScreen.tsx`

**Funcionalidades**:
- Lista todas las integraciones disponibles
- Estado: conectada ✅ / desconectada
- Botón "Conectar" → OAuth flow
- Botón "Sincronizar ahora" → manual sync
- Expandible: muestra benefits y last synced
- Badge "PRO" para integraciones premium (Spotify, Todoist, Calendar, Notion)

**Navegación**: ProfileScreen → Settings → Integrations

---

## 🔐 Seguridad

### OAuth Flow
1. Usuario hace clic en "Conectar Strava"
2. App abre `https://www.strava.com/oauth/authorize?client_id=...&scope=...`
3. Usuario autoriza
4. Strava redirige a `quest://strava-callback?code=ABC123`
5. App captura código y llama `exchangeStravaCode(code)`
6. Guarda tokens en `user_integrations` (encrypted)

### Token Refresh Automático
```typescript
// Antes de cada API call:
const accessToken = await ensureValidStravaToken(userId);
// Si token expira en < 1 hora:
//   1. Refresh token
//   2. Guarda nuevos tokens
//   3. Retorna nuevo access_token
```

### RLS Policies
```sql
-- Users solo pueden ver sus propias integraciones
CREATE POLICY "Users can view their own integrations"
  ON user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🤖 Integración con IA

### Contexto Agregado a `getCompleteUserContext()`

**ANTES** (sin integraciones):
```typescript
// IA solo conocía:
- Life paths
- Habits positivos
- Bad habits
- Quests pendientes
```

**AHORA** (con integraciones):
```typescript
// IA también conoce:
=== EXTERNAL INTEGRATIONS ===
Connected Apps:
- 🏃 Strava: Last run 2 days ago (5km, 30min, 450 cal)
- 🎵 Spotify: Listening mood today: 72/100 (uplifting)
- 💻 GitHub: 12 commits today (professional pillar active!)

Recent Activities (last 7 days):
• Jan 18: Ran 5km (auto-completed "Exercise" habit)
• Jan 17: Listened to 2 hours of calm music
• Jan 16: Made 8 commits to "quest" repo
• Jan 15: Cycled 15km

CRITICAL - USE INTEGRATION DATA:
1. Create quests ALIGNED with their activities:
   - If they run regularly: "Beat your 5km PR"
   - If they code daily: "Refactor one function today"
   - If they listen to sad music: "Listen to 30min of uplifting music"

2. Detect PATTERNS and red flags:
   - 0 workouts for 7 days → "What's blocking you from exercising?"
   - Mood score < 40 for 3 days → "Your music suggests you're struggling"
   - 0 commits for 3 days → "Get back on track with 1 commit"
```

### Ejemplos de Quests Generadas por IA

**Caso 1: User con Strava conectado + bad habit "sedentary"**
```
IA detecta:
- Bad habit: "Being sedentary" (10 occurrences this month)
- Strava: Last workout was 8 days ago
- Life path: "Get physically strong"

Quest generada:
"Do ANY form of exercise for 15 minutes today. Walking counts. Just move."
```

**Caso 2: User con Spotify conectado + mood score bajo**
```
IA detecta:
- Spotify mood_score: 32/100 (música muy triste)
- Spotify energy_level: 25/100 (música depresiva)
- Escuchando artistas: Radiohead, Elliott Smith, The National

Quest generada:
"Listen to 30 minutes of uplifting music. Here are some artists: Vulfpeck, Anderson .Paak, Jungle. Your recent music suggests you're struggling - want to talk about it?"
```

**Caso 3: User con GitHub conectado + 0 commits por 3 días**
```
IA detecta:
- GitHub: 0 commits for 3 days (antes hacía 5-10/día)
- Life path: "Become a senior engineer"
- Habit: "Code for 1 hour" (not completed in 3 days)

Quest generada:
"Make ONE commit today. Doesn't matter how small. Fix a typo. Refactor one line. Just break the streak."
```

---

## 🚀 Deployment Checklist

### Backend (Supabase)
- [x] Migration `064_external_integrations.sql` creada
- [ ] Aplicar migration a production: `supabase db push`
- [ ] Verificar RLS policies activas
- [ ] Verificar funciones creadas: `get_integration_status`, `auto_complete_habit_from_activity`

### Environment Variables
Agregar a `.env` (y Expo secrets):

```bash
# Strava
EXPO_PUBLIC_STRAVA_CLIENT_ID=your_client_id
EXPO_PUBLIC_STRAVA_CLIENT_SECRET=your_client_secret

# Spotify
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET=your_client_secret

# GitHub
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_client_id
EXPO_PUBLIC_GITHUB_CLIENT_SECRET=your_client_secret
```

### OAuth Apps Setup

#### Strava
1. Ir a: https://www.strava.com/settings/api
2. Crear app
3. Redirect URI: `quest://strava-callback`
4. Scopes: `activity:read_all,activity:write`

#### Spotify
1. Ir a: https://developer.spotify.com/dashboard
2. Crear app
3. Redirect URI: `quest://spotify-callback`
4. Scopes: `user-read-recently-played, user-top-read, playlist-read-private`

#### GitHub
1. Ir a: https://github.com/settings/developers
2. Crear OAuth app
3. Redirect URI: `quest://github-callback`
4. Scopes: `repo, read:user, read:org`

### Deep Links (iOS/Android)
Agregar a `app.json`:

```json
{
  "expo": {
    "scheme": "quest",
    "ios": {
      "bundleIdentifier": "com.quest.app"
    },
    "android": {
      "package": "com.quest.app"
    }
  }
}
```

---

## 📊 Métricas de Éxito

### KPIs
- **Adoption Rate**: % de users que conectan ≥1 integración
- **Retention**: Users con integraciones activas retienen 2x más
- **Auto-completion Rate**: % de hábitos completados vía auto-sync
- **AI Quest Quality**: Quests basadas en integrations tienen 80%+ completion rate

### Analytics Queries
```sql
-- Users con integraciones activas
SELECT COUNT(DISTINCT user_id) as users_with_integrations
FROM user_integrations
WHERE is_active = true;

-- Actividades sincronizadas por fuente
SELECT source, COUNT(*) as total_activities
FROM user_activity_imports
GROUP BY source
ORDER BY total_activities DESC;

-- Auto-completions últimos 7 días
SELECT DATE(completion_date) as day, COUNT(*) as auto_completed
FROM user_habit_completions
WHERE notes LIKE 'Auto-synced from%'
  AND completion_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
```

---

## 🔧 Troubleshooting

### "OAuth redirect not working"
**Problema**: Deep link `quest://strava-callback` no abre la app

**Solución**:
1. Verificar `app.json` tiene `"scheme": "quest"`
2. Rebuild app: `expo prebuild` → `npx expo run:ios`
3. En iOS: Verificar Associated Domains en Xcode

### "Token expired error"
**Problema**: Access token expiró y no se refresh automáticamente

**Solución**:
```typescript
// Siempre usar ensureValidToken antes de API calls:
const accessToken = await ensureValidStravaToken(userId);
if (!accessToken) {
  throw new Error('Reconnect Strava');
}
```

### "Duplicate activities synced"
**Problema**: Mismo workout aparece 2 veces

**Solución**: La tabla `user_activity_imports` tiene `UNIQUE(user_id, source, external_id)` para prevenir duplicados. Si ocurre:
```sql
-- Limpiar duplicados manualmente
DELETE FROM user_activity_imports a
USING user_activity_imports b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.source = b.source
  AND a.external_id = b.external_id;
```

---

## 📝 TODO - Próximas Mejoras

### Priority 1 (ESTA SEMANA)
- [ ] Todoist integration (OAuth + bidirectional sync)
- [ ] Google Calendar integration (OAuth + events as quests)
- [ ] Background sync automático (cada 1 hora cuando app está abierta)
- [ ] Push notification: "🏃 Strava detected a workout! Mark your habit as complete?"

### Priority 2 (PRÓXIMO MES)
- [ ] Notion integration (databases as quests)
- [ ] MyFitnessPal integration (nutrition tracking)
- [ ] Webhooks: Strava → instant sync (no polling)
- [ ] Integration analytics dashboard en ProfileScreen

### Priority 3 (FUTURO)
- [ ] Zapier/IFTTT integration (connect ANY app)
- [ ] AI suggestions: "You should connect GitHub, you mentioned coding goals"
- [ ] Integration marketplace (community-created integrations)
- [ ] Export data: download all synced activities as CSV

---

## 👥 Team Notes

### Para Frontend Devs
- IntegrationsScreen está en `app/src/screens/main/IntegrationsScreen.tsx`
- Para agregar nueva integración:
  1. Crear archivo en `app/src/lib/integrations/[service].ts`
  2. Implementar OAuth flow
  3. Agregar a `getAvailableIntegrations()` en `index.ts`
  4. Agregar case en `connectIntegration()` y `syncAllIntegrations()`

### Para Backend Devs
- Migration en `supabase/migrations/064_external_integrations.sql`
- RLS policies protegen tokens (users solo ven sus propios datos)
- Función `auto_complete_habit_from_activity` es reutilizable para todas las integraciones

### Para AI/ML Team
- Contexto de integraciones ya está en `getCompleteUserContext()` en `openai.ts`
- Usar datos de integrations para:
  - Detectar patterns (0 workouts → sedentary)
  - Mood tracking (música triste → check mental health)
  - Personalized quests (Strava data → "Beat your PR")

---

## 📚 Referencias

**APIs Documentación**:
- Strava API: https://developers.strava.com/docs/reference/
- Spotify API: https://developer.spotify.com/documentation/web-api
- GitHub API: https://docs.github.com/en/rest

**OAuth 2.0 Flow**:
- https://oauth.net/2/
- https://www.rfc-editor.org/rfc/rfc6749

**React Native Deep Links**:
- https://docs.expo.dev/guides/linking/

---

**Última actualización**: 2025-01-18  
**Versión**: 1.0.0  
**Estado**: ✅ Listo para deploy (con env variables configuradas)
