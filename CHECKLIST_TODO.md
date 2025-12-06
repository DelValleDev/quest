# 📋 Quest App - Checklist de Desarrollo

> **Fecha de creación:** 6 de Diciembre 2025  
> **Última actualización:** 8 de Diciembre 2025  
> **Estado:** En progreso - 66% completado

---

## 🚀 IMPLEMENTACIÓN DE 4 FASES (NUEVO)

### ✅ FASE 1: APIs Y SERVICIOS (COMPLETADA)

#### Bad Habits API ✅
- [x] `badHabits.ts` - CRUD completo de malos hábitos
  - [x] getUserBadHabits() - Obtener todos los bad habits
  - [x] createBadHabit() - Crear nuevo bad habit
  - [x] logBadHabit() - Registrar ocurrencia (usa función SQL)
  - [x] getBadHabitLogs() - Historial de ocurrencias
  - [x] updateBadHabit() - Actualizar bad habit
  - [x] deleteBadHabit() - Eliminar bad habit
  - [x] getBadHabitsStats() - Estadísticas completas
  - [x] subscribeToBadHabits() - Realtime subscription

#### Perfect Streaks API ✅
- [x] `perfectStreaks.ts` - Sistema de rachas perfectas
  - [x] getActivePerfectStreak() - Racha activa
  - [x] getPerfectStreaksHistory() - Historial completo
  - [x] getBestPerfectStreak() - Mejor racha histórica
  - [x] getPerfectStreakMilestones() - Milestones (7, 14, 21, 30, 60, 90, 180, 365 días)
  - [x] updatePerfectStreak() - Actualizar racha (cron job)
  - [x] getPerfectStreakStats() - Estadísticas avanzadas
  - [x] getNextMilestone() - Próximo objetivo
  - [x] subscribeToPerfectStreaks() - Realtime subscription

#### Quest AI API ✅
- [x] `questAI.ts` - IA Coach en guilds
  - [x] analyzeGuild() - Análisis detallado del guild
  - [x] suggestChallenges() - Sugerir raids/duels/habits
  - [x] createGuildInsight() - Crear insight automático
  - [x] getGuildInsights() - Obtener insights activos
  - [x] markInsightActedUpon() - Marcar como resuelto
  - [x] dismissInsight() - Descartar insight
  - [x] getGuildQuestConfig() - Obtener configuración Quest AI
  - [x] updateGuildQuestConfig() - Actualizar configuración granular
  - [x] logQuestInteraction() - Registrar interacción de IA
  - [x] getQuestInteractions() - Historial de interacciones
  - [x] getModerationLogs() - Logs de moderación
  - [x] generateDailySummary() - Resumen diario con IA
  - [x] subscribeToGuildInsights() - Realtime subscription

#### Moderation API ✅
- [x] `moderation.ts` - Sistema de moderación con IA
  - [x] checkContentToxicity() - OpenAI Moderation API
  - [x] moderateContent() - Moderación con whitelist/blacklist
  - [x] logModerationAction() - Registrar acción (función SQL)
  - [x] getModerationLogs() - Logs del guild
  - [x] getUserModerationLogs() - Logs de un usuario
  - [x] getModerationStats() - Estadísticas de moderación
  - [x] updateWhitelist() - Actualizar palabras permitidas
  - [x] updateBlacklist() - Actualizar palabras prohibidas
  - [x] subscribeToModerationLogs() - Realtime subscription

---

### ⏳ FASE 2: PANTALLAS (PARCIALMENTE COMPLETADA - 2/8)

#### Pantallas Implementadas ✅
- [x] **BadHabitsScreen.tsx** - CRUD de malos hábitos
  - [x] Lista de bad habits con stats
  - [x] Modal para crear nuevo bad habit
  - [x] Botón "Lo cometí" para registrar ocurrencia
  - [x] Estadísticas: total hábitos, ocurrencias, QC perdidos
  - [x] Realtime updates con Supabase
  - [x] Dark theme estilo Quest

- [x] **StreaksScreen.tsx** - Rachas perfectas
  - [x] Card principal con racha activa
  - [x] Milestones con progress bars
  - [x] Estadísticas: récord, total rachas, promedio, QC ganados
  - [x] Historial de rachas pasadas
  - [x] Indicador de próximo milestone
  - [x] Tips y consejos
  - [x] Realtime updates

#### Pantallas Pendientes ⏳
- [ ] **NotificationsScreen.tsx** - Sistema de notificaciones
  - [ ] Lista de notificaciones con tabs (Todas, No leídas, Leídas)
  - [ ] Badge con contador
  - [ ] Mark as read/unread
  - [ ] Filtros por tipo
  - [ ] Realtime updates

- [ ] **GuildSettingsScreen.tsx** - Configuración Quest AI
  - [ ] Toggle de features individuales (13 features)
  - [ ] Configuración de moderación
  - [ ] Whitelist/Blacklist editor
  - [ ] Scheduling (daily summary, weekly report)
  - [ ] Límites (max messages/day, cooldown)
  - [ ] Personalidad de Quest (motivational, strict, funny, analytical)

- [ ] **GuildModerationScreen.tsx** - Logs de moderación (solo admins)
  - [ ] Lista de acciones de moderación
  - [ ] Filtros: por usuario, por tipo, por fecha
  - [ ] Toxicity score chart
  - [ ] Top offenders
  - [ ] Appeals de contenido eliminado

- [ ] **GuildInsightsScreen.tsx** - Insights de IA
  - [ ] Lista de insights activos
  - [ ] Prioridad: urgent > high > medium > low
  - [ ] Tipos: pattern, suggestion, warning, opportunity, prediction
  - [ ] Botones: Dismiss, Act Upon
  - [ ] Historial de insights resueltos

- [ ] **NotificationSettingsScreen.tsx** - Configuración de push
  - [ ] Toggle de tipos de notificaciones
  - [ ] Do Not Disturb schedule
  - [ ] Smart timing toggle
  - [ ] Max notifications per day
  - [ ] Quiet hours configuration

- [ ] **VerificationScreen.tsx** - Upload de evidencia
  - [ ] Camera integration
  - [ ] Photo upload con geolocation
  - [ ] Video upload con compresión
  - [ ] Preview antes de submit
  - [ ] Trust score impact indicator

---

### ✅ FASE 3: CRON JOBS (COMPLETADA - 4/4)

#### Edge Functions Implementadas ✅
- [x] **daily-streak-check/** - Verificación diaria de rachas
  - [x] Procesa todos los usuarios activos
  - [x] Llama a update_perfect_streak() para cada usuario
  - [x] Envía notificación si se rompe la racha
  - [x] Envía notificación si alcanza milestone
  - [x] Logging completo de resultados
  - [x] Error handling robusto
  - **Cron:** Diario a las 00:01 (1 minuto después de medianoche)

- [x] **leaderboard-refresh/** - Actualizar leaderboard
  - [x] Refresca materialized views
  - [x] Optimización de queries
  - [x] Error handling
  - **Cron:** Cada hora

- [x] **quest-daily-summary/** - Resúmenes diarios de guilds
  - [x] Obtiene guilds con daily_summary habilitado
  - [x] Verifica hora configurada por guild
  - [x] Llama a quest_analyze_guild_detailed()
  - [x] Genera resumen con OpenAI GPT-4o-mini
  - [x] 4 personalidades: motivational, strict, funny, analytical
  - [x] Envía mensaje al chat del guild
  - [x] Registra interacción en guild_quest_interactions
  - [x] Logging por guild procesado
  - **Cron:** Cada hora (verifica si es el horario configurado)

- [x] **apply-daily-penalties/** - Penalizaciones por ausencia
  - [x] Procesa usuarios con consecutive_absent_days > 0
  - [x] Penalizaciones graduales:
    - 1 día: -20 QC
    - 3 días: -50 QC
    - 7 días: -100 QC
    - 14 días: -200 QC
  - [x] Registra transacción de QC
  - [x] Envía notificación al usuario
  - [x] Logging de penalizaciones aplicadas
  - **Cron:** Diario a las 23:59

#### Edge Functions Pendientes ⏳
- [ ] **quest-weekly-report/** - Reportes semanales
  - [ ] Similar a daily-summary pero más exhaustivo
  - [ ] Análisis de toda la semana
  - [ ] Comparación semana vs semana anterior
  - [ ] Recomendaciones para próxima semana
  - **Cron:** Domingos a las 18:00

- [ ] **raid-penalty-phases/** - Fases de votación de castigos
  - [ ] Fase 1: Proposición (12h)
  - [ ] Fase 2: Votación (12h)
  - [ ] Conteo automático de votos
  - [ ] Determinar castigo ganador
  - [ ] Notificar al perdedor
  - **Cron:** Cada 12 horas

- [ ] **cleanup-expired-insights/** - Limpiar insights expirados
  - [ ] DELETE insights con expires_at < now()
  - [ ] Logging de insights eliminados
  - **Cron:** Diario a las 03:00

---

### ⏳ FASE 4: PUSH NOTIFICATIONS (PARCIALMENTE COMPLETADA - 3/6)

#### Implementado ✅
- [x] Setup Expo Notifications (notifications.ts)
- [x] Register device token
- [x] Handle notification received
- [x] Handle notification pressed (deep linking básico)
- [x] Notificaciones básicas
  - [x] daily_quest_reminder
  - [x] streak_warning
  - [x] achievement_unlocked

#### Pendiente ⏳
- [ ] **Notificaciones avanzadas**
  - [ ] bad_habit_logged → "⚠️ Perdiste X QC"
  - [ ] streak_milestone → "🔥 X días perfectos! +Y QC"
  - [ ] streak_broken → "💔 Racha de X días terminada"
  - [ ] quest_message → "Quest: [mensaje del grupo]"
  - [ ] raid_penalty_vote → "Vota castigo para [usuario]"
  - [ ] friend_request → "👋 [usuario] te agregó"
  - [ ] guild_invite → "📬 Invitación a [guild]"
  - [ ] moderation_warning → "⚠️ Tu mensaje fue moderado"
  - [ ] insight_created → "💡 Nueva sugerencia del grupo"

- [ ] **Configuración avanzada**
  - [ ] Lógica de no-spam (máx 5/día)
  - [ ] Respeto de horarios (comida, sueño)
  - [ ] Do Not Disturb automático (22:00-08:00)
  - [ ] Smart timing (enviar cuando usuario suele abrir app)
  - [ ] Configuración personalizable completa (NotificationSettingsScreen)

- [ ] **Subscribe to Supabase realtime notifications table**
  - [ ] Escuchar INSERT en notifications table
  - [ ] Trigger push notification automáticamente
  - [ ] Batch notifications (agrupar similares)

---

## 📊 PROGRESO DE LAS 4 FASES

| Fase | Completado | Pendiente | % |
|------|------------|-----------|---|
| **Fase 1: APIs** | 4/4 servicios | 0 | 100% ✅ |
| **Fase 2: Screens** | 2/8 pantallas | 6 | 25% ⏳ |
| **Fase 3: Cron Jobs** | 4/7 functions | 3 | 57% ⏳ |
| **Fase 4: Push Notifs** | 3/6 features | 3 | 50% ⏳ |
| **TOTAL FASES** | **13/25 items** | **12** | **52%** |

---

## 📁 ARCHIVOS CREADOS EN ESTA ACTUALIZACIÓN

### APIs (app/src/lib/)
- ✅ `badHabits.ts` (290 líneas)
- ✅ `perfectStreaks.ts` (250 líneas)
- ✅ `questAI.ts` (320 líneas)
- ✅ `moderation.ts` (380 líneas)

### Screens (app/src/screens/main/)
- ✅ `BadHabitsScreen.tsx` (500 líneas)
- ✅ `StreaksScreen.tsx` (600 líneas)

### Edge Functions (supabase/functions/)
- ✅ `daily-streak-check/index.ts` (180 líneas)
- ✅ `leaderboard-refresh/index.ts` (40 líneas)
- ✅ `quest-daily-summary/index.ts` (200 líneas)
- ✅ `apply-daily-penalties/index.ts` (140 líneas)

### Documentación (private-docs/)
- ✅ `FEATURES_FALTANTES.md` (700 líneas) - Análisis exhaustivo de 31 features pendientes

**Total nuevo código:** ~3,600 líneas

---

## 🎯 LIFE PATHS - Mejoras

### Tiempo e Intensidad
- [x] **Agregar selector de tiempo límite para Life Paths** ✅ (1, 3, 6, 9, 12, 18, 24 meses)
- [x] **Validar límites de tiempo razonables** ✅ (mínimo 1 mes, máximo 2 años)
- [x] **Ajustar intensidad de hábitos/quests según el tiempo elegido** ✅
  - Menos tiempo = más intensidad y frecuencia (3-5 habits, 5-7 quests)
  - Más tiempo = ritmo más sostenible (2-3 habits, 3-4 quests)
- [x] **La IA considera el deadline al generar el plan de acción** ✅ (expandLifePathWithAI actualizado)

### Límites por Plan (Free vs Premium)
- [x] **FREE:** Máximo 5 hábitos activos ✅ (HabitsScreen.tsx)
- [x] **FREE:** Máximo 2 life paths activos ✅ (LifePathsScreen.tsx)
- [x] **PREMIUM:** Sin límites de hábitos/life paths ✅
- [x] **Mostrar contador de hábitos/life paths usados para free users** ✅ (Badge en header con "X/Y" para free, "Unlimited ✨" para premium)
- [x] Mostrar modal de upgrade cuando lleguen al límite ✅

---

## 📉 Sistema de Penalizaciones

### Hábitos/Quests no completados
- [x] **Si NO completas un hábito: perder XP (50% de lo que ibas a ganar)** ✅
- [x] **Si NO completas un quest: perder XP (50% de lo que ibas a ganar)** ✅
- [x] **Quest Coins NO se pierden (solo XP)** ✅
- [x] **Notificación visual cuando pierdes puntos** ✅ (PenaltyNotification modal)
- [x] **Tracking de hábitos/quests fallidos en el perfil** ✅ (penalty_logs table)
- [x] **Banner de advertencia antes de fin del día** ✅ (PenaltyWarningBanner después de 6 PM)
- [x] **Función para aplicar penalizaciones diarias** ✅ (apply_daily_penalties SQL function)
- [x] **Servicio TypeScript para manejar penalizaciones** ✅ (penalties.ts)
- [x] **Configuración automática de pg_cron** ✅ (Migration 029)

### Migraciones de Base de Datos
- Migration 027: `habit_time_of_day` y `xp_reward` columns (corregida ✅)
- Migration 028: Sistema de penalizaciones completo (corregida ✅)
- Migration 029: Configuración automática de pg_cron (nueva ✅)

---

## 🤖 Quest AI - Interacciones Proactivas

### Sistema de Mensajes Proactivos
- [x] **Migración 032: Tablas y funciones del sistema** ✅ (ai_message_log, ai_message_preferences, cooldowns)
- [x] **Migración 033: Sistema de aprendizaje de Quest AI** ✅ (ai_learnings, feedback system)
- [x] **9 tipos de mensajes proactivos con prioridades** ✅ (welcome, quest_complete, level_up, etc.)
- [x] **Integración en DailyQuestsScreen** ✅ (mensajes contextuales al completar quests)
- [x] **Cooldown system para evitar spam** ✅ (1 mensaje cada 2 horas)

### Actividades Positivas
- [x] **Migración 034: Sistema de malos hábitos** ✅ (bad_habit_slip_ups, clean_days tracking)
- [x] **Modal para agregar actividades positivas** ✅ (AddPositiveActivityModal.tsx)
- [x] **Botón en DailyQuestsScreen** ✅ (botón con borde punteado)
- [x] **Cálculo de XP dinámico** ✅ (15-25 base + bonus por descripción)
- [x] **Mensaje especial de IA para iniciativa** ✅ (isPositiveActivity flag)

### Sistema de Rachas Perfectas
- [x] **Migración 035: Perfect Streaks System** ✅ (perfect_days, milestones)
- [x] **Bonificaciones por días perfectos consecutivos** ✅ (7d, 15d, 30d, 60d, 100d, 365d)
- [x] **Función auto-check al completar quests** ✅ (trigger en user_daily_quests)
- [x] **Tracking de mejor racha personal** ✅ (best_perfect_streak en profiles)
- [ ] **UI: Banner de racha perfecta en HomeScreen** ⏳
- [ ] **UI: Modal de celebración de milestone** ⏳
- [ ] **UI: Calendario con días perfectos resaltados** ⏳

### Sistema de Malos Hábitos
- [x] **Backend completo (Migration 034)** ✅
- [x] **Documentación completa** ✅ (BAD_HABITS_SYSTEM.md)
- [ ] **UI: Crear/editar malos hábitos** ⏳
- [ ] **UI: Marcar día limpio** ⏳
- [ ] **UI: Registrar desliz (slip-up)** ⏳
- [ ] **UI: Analytics de patrones** ⏳

---

## 👥 Sistema Social Avanzado

### Backend (Migration 036) ✅ COMPLETO
- [x] **Tabla de posts de guild** ✅ (text, image, video, achievement, poll)
- [x] **Sistema de likes y comentarios** ✅ (auto-update counts con triggers)
- [x] **Desafíos grupales mejorados** ✅ (collective, individual, team_vs_team)
- [x] **Tabla de participantes en desafíos** ✅ (tracking individual de progreso)
- [x] **Leaderboard semanal** ✅ (auto-reset cada lunes)
- [x] **Sistema de notificaciones** ✅ (8 tipos de notificaciones)
- [x] **Gestión de media uploads** ✅ (tracking de archivos)
- [x] **Función get_guild_feed()** ✅ (feed optimizado con paginación)
- [x] **Función update_guild_leaderboard()** ✅ (actualización automática)
- [x] **RLS policies para seguridad** ✅ (permisos por rol)
- [x] **Indexes para performance** ✅ (queries optimizadas)

### Frontend ✅ COMPLETO (Chat) + ⏳ Feed
- [x] **GuildChatScreen** ✅ (chat grupal en tiempo real estilo WhatsApp)
  - [x] Mensajes en tiempo real con Supabase Realtime ✅
  - [x] Burbujas de chat (propios vs otros) ✅
  - [x] Avatares y nombres de usuarios ✅
  - [x] Input de mensaje con envío ✅
  - [x] Formato de tiempo inteligente (hoy, ayer, fecha) ✅
  - [x] Auto-scroll al recibir mensajes ✅
  - [x] Indicador de envío ✅
  - [x] Sistema de mensajes del sistema ✅
  - [x] Totalmente responsive con i18n ✅
  - [x] API completa (chatApi.ts) ✅
  - [x] Migración 037 aplicada ✅

- [x] **GuildFeedScreen** ✅ (feed de posts estilo Instagram)
  - [x] PostCard component (display de posts) ✅
  - [x] PostComposer modal (crear posts) ✅
  - [x] LikeButton con animación ✅
  - [x] CommentsModal con input ✅
  - [ ] MediaViewer (fullscreen image/video) ⏳
  - [ ] PollCard funcional (votaciones interactivas) ⏳
  - [x] Pull-to-refresh ✅
  - [x] Infinite scroll ✅
  - [x] Real-time updates (Supabase Realtime) ✅
  - [x] Navegación desde GuildsScreen ✅
  - [x] API functions completas ✅

- [x] **Navegación en GuildsScreen** ✅
  - [x] Botón principal "Chat Grupal 💬" ✅
  - [x] Botón secundario "Feed" ✅
  - [x] Ambos con i18n completo ✅

- [ ] **Sistema de Desafíos Grupales** ⏳
  - [ ] Modal de creación de desafíos (líderes)
  - [ ] Lista de desafíos activos
  - [ ] Pantalla de detalle con progress bars
  - [ ] Lista de participantes con contribuciones
  - [ ] Animación de completación

- [ ] **Leaderboard Semanal** ⏳
  - [ ] Tab de leaderboard en guild
  - [ ] Top 10 con medallas (oro/plata/bronce)
  - [ ] Highlight de rank personal
  - [ ] Countdown para reset
  - [ ] Vista de semanas históricas

- [ ] **Sistema de Notificaciones** ⏳
  - [ ] NotificationsScreen
  - [ ] Lista con iconos por tipo
  - [ ] Mark as read on tap
  - [ ] Badge en tab bar
  - [ ] Real-time updates
  - [ ] Navegación a action_url

- [ ] **Upload de Media** ⏳
  - [ ] Image picker integration
  - [ ] Video picker
  - [ ] Progress indicator
  - [ ] Compresión de imágenes
  - [ ] Thumbnails de videos
  - [ ] Supabase Storage integration

- [ ] **Perfil de Guild Mejorado** ⏳
  - [ ] Upload de cover image
  - [ ] Display de stats (level, XP)
  - [ ] Progress de XP semanal
  - [ ] Display de tags
  - [ ] Sección de reglas
  - [ ] Mensaje de bienvenida
- [x] **Servicio TypeScript** ✅ (proactiveAI.ts con generación de mensajes y cooldowns)
- [x] **Componente UI** ✅ (QuestAIToast - toast animado elegante)

### Mensajes motivacionales/ayuda (aparecen ocasionalmente, no siempre)
- [x] **Al completar un Quest → mensaje de celebración** ✅ (DailyQuestsScreen integrado)
- [x] **Al completar un Hábito → mensaje motivacional** ✅ (HabitsScreen integrado)
- [x] **Al subir de nivel → mensaje épico** ✅ (Detectado automáticamente en DailyQuestsScreen)
- [x] **Al mantener racha → motivación de streak** ✅ (Detectado en hitos: 7, 14, 30, 60, 100, 365 días)
- [x] **Al desbloquear Achievement → reconocimiento** ✅ (useAchievementMonitor hook en HomeScreen)
- [x] **Al ganar Badge → felicitación especial** ✅ (useBadgeMonitor hook en HomeScreen)
- [x] **Al completar TODOS los quests del día → celebración épica** ✅ (Prioridad máxima en DailyQuestsScreen)
- [x] Al ganar un Stake → felicitación ⏳ (Implementado en proactiveAI.ts - pendiente integración en DuelsScreen)
- [x] Al ganar un Duel → celebración de victoria ⏳ (Implementado en proactiveAI.ts - pendiente integración en DuelsScreen)

### Recomendaciones inteligentes (SOLO PREMIUM)
- [ ] La IA observa TODO lo que haces en la app (requiere tracking adicional)
- [ ] Sugerencias personalizadas basadas en comportamiento (requiere análisis de patrones)
- [ ] Detectar patrones negativos y ofrecer ayuda (fase futura)
- [x] **Opción para desactivar** en Perfil/Configuración ✅ (ai_message_preferences table)
- [x] Toggle: "Recibir recomendaciones de Quest AI" ✅ (proactive_messages_enabled field)

### Frecuencia de mensajes
- [x] **Implementar sistema de "cooldown" para no ser molesto** ✅ (30 min entre mensajes)
- [x] **Máximo 3-5 mensajes proactivos por día** ✅ (configurable, default 5)
- [x] **Priorizar mensajes según importancia** ✅ (all_quests > level_up > streak > quest_complete)

### Comportamiento Conversacional Mejorado
- [x] **Migración 033: Sistema de aprendizaje de contexto de usuario** ✅ (user_context_learnings table)
- [x] **Quest AI hace preguntas profundas en primera conversación** ✅ (2-3 preguntas sobre vida/sueños/obstáculos)
- [x] **Sistema de extracción automática de información clave** ✅ (extractAndSaveLearnings function)
- [x] **Categorías de aprendizaje:** ✅
  - motivation (motivaciones del usuario)
  - obstacle (obstáculos que enfrenta)
  - dream (sueños y aspiraciones)
  - fear (miedos y preocupaciones)
  - habit (patrones de hábitos)
  - pattern (patrones de comportamiento)
  - preference (preferencias personales)
- [x] **Integración en contexto de chat** ✅ (getCompleteUserContext incluye "WHAT I'VE LEARNED ABOUT YOU")
- [x] **AI usa información aprendida para personalizar respuestas** ✅ (prompt actualizado)
- [ ] Panel de administración de aprendizajes para el usuario (ver/editar/eliminar lo que AI sabe)
- [ ] Análisis avanzado de patrones con ML (fase futura)

---

## 🌐 Internacionalización (i18n) - TODA LA APP

### Pantallas principales
- [x] HomeScreen - todos los textos ✅
- [x] JourneyHubScreen - todos los textos (ya tenía i18n)
- [x] LifePathsScreen - todos los textos (ya tenía i18n)
- [x] LifePathDetailScreen - todos los textos (ya tenía i18n)
- [x] HabitsScreen - todos los textos (ya tenía i18n)
- [x] DailyQuestsScreen - todos los textos ✅
- [x] QuestCoachScreen - todos los textos ✅
- [x] SocialHubScreen - todos los textos (ya tenía i18n)
- [x] GuildsScreen - todos los textos (ya tenía i18n)
- [x] LeaderboardScreen - todos los textos ✅
- [x] ShopScreen - todos los textos ✅
- [x] ProfileScreen - todos los textos (ya tenía i18n)
- [x] AchievementsScreen - todos los textos ✅
- [x] ChallengesScreen - todos los textos ✅
- [x] DuelsScreen - todos los textos ✅
- [x] RaidsScreen - todos los textos ✅
- [x] SettingsScreen - todos los textos ✅
- [x] PremiumScreen - todos los textos ✅
- [x] MyPlanScreen - todos los textos ✅
- [x] BuyCoinsScreen - todos los textos ✅
- [x] RewardsScreen - todos los textos ✅
- [x] SocialScreen - todos los textos ✅
- [x] ClassSelectionScreen - todos los textos ✅

### Auth
- [x] AuthScreen - todos los textos ✅

### Onboarding (ya tienen i18n via useLanguageStore)
- [x] WelcomeScreen - usa i18n lib
- [x] InitialSetupScreen ✅
- [x] AssessmentScreen ✅
- [x] AspirationsScreen ✅
- [x] PillarSelectionScreen ✅
- [x] LanguageSelectionScreen ✅

### Componentes y Modales
- [x] PaywallModal ✅
- [x] QuestDetailModal (ya tenía i18n)
- [ ] Otros Alert.alert() con t() (en progreso)
- [ ] Otros modales menores

### Navegación
- [x] MainTabs - labels traducidos ✅
- [ ] Headers de navegación (la mayoría ya traducidos)
- [ ] Back buttons labels (automáticos de react-navigation)
- [ ] LanguageSelectionScreen

---

## 🧠 Quest AI - Comportamiento Conversacional

### Hacer preguntas constantemente
- [x] La IA siempre busca conocer más al usuario ✅ (sistema de learnings implementado)
- [x] Preguntas naturales durante la conversación ✅ (prompt mejorado)
- [x] Guardar respuestas en el contexto del usuario ✅ (extractAndSaveLearnings)
- [x] Usar información aprendida para personalizar todo ✅ (getCompleteUserContext incluye learnings)
- [x] Primera conversación: preguntas profundas sobre metas y vida ✅ (2-3 preguntas en sistema prompt)

---

## 📅 Google Calendar - Integración

### Conexión OAuth
- [ ] Configurar Google Cloud Console
- [ ] Implementar flujo de OAuth 2.0
- [ ] Permisos: leer/escribir eventos
- [ ] Botón "Conectar Google Calendar" funcional
- [ ] Guardar tokens de acceso de forma segura
- [ ] Refresh tokens automático

### Sincronización
- [ ] Leer eventos del calendario de Google
- [ ] Mostrar eventos en la agenda interna de Quest
- [ ] Crear eventos en Google Calendar desde Quest
- [ ] Sincronización bidireccional
- [ ] Detectar conflictos de horario

### Primera pregunta de la IA
- [ ] "¿Tienes tu agenda en Google Calendar? Puedo conectarla para conocer tu día a día"
- [ ] Si dice sí → iniciar conexión OAuth
- [ ] Si dice no → ofrecer crear agenda interna manualmente

---

## 📆 Agenda Interna de Quest

### Creación con IA
- [ ] La IA puede sugerir y crear eventos
- [ ] Basado en hábitos, quests, y life paths
- [ ] Horarios optimizados según el usuario
- [ ] Preguntar "¿A qué hora te levantas/duermes?"

### Creación Manual
- [ ] Formulario para agregar eventos manualmente
- [ ] Selector de fecha/hora
- ] Categorías de eventos
- [ ] Repetición (diario, semanal, etc.)
- [ ] Recordatorios/notificaciones

### Explicación al usuario
- [ ] Modal explicativo: "Para ayudarte mejor, necesito conocer tu agenda"
- [ ] Beneficios claros de compartir la agenda
- [ ] Opción de no compartir (menos personalización)

---

## ✅ Quests Manuales Positivos

### Actividades extra del día
- [x] Botón "Agregar actividad positiva" ✅ (DailyQuestsScreen - botón con diseño dashed border)
- [x] Ejemplos: salir con amigos, leer un libro, meditar extra ✅ (Modal con placeholders)
- [x] Se cuenta como Quest completado ✅ (Crea challenge y marca como completed)
- [x] Otorga XP y QC proporcional ✅ (15-25 XP base + bonus por descripción)
- [x] La IA aprende de estas actividades para futuras recomendaciones ✅ (Tag 'positive_activity' para futuro análisis)
- [x] Selector de pilar asociado ✅ (Grid de 6 pilares con emoji y color)
- [x] Descripción corta de la actividad ✅ (TextInput multiline, 300 chars max)

---

## 💎 Sistema de Rachas Perfectas (Perfect Streaks)

### Recompensas por Completar TODO Perfectamente
- [x] **Migration 035: Perfect Streaks System** ✅
- [x] **Tabla `perfect_days`**: Registra días donde completaste TODOS los quests ✅
- [x] **Tabla `perfect_streak_milestones`**: Guarda hitos alcanzados ✅
- [x] **Columnas en profiles**: `perfect_streak`, `best_perfect_streak` ✅
- [x] **Función `check_and_update_perfect_day()`**: Auto-verifica y premia ✅
- [x] **Trigger automático**: Se activa al completar quests ✅
- [x] **Bonuses por Hitos:** ✅
  - 7 días perfectos: +100 XP, +50 QC 🔥
  - 15 días perfectos: +250 XP, +100 QC ⭐
  - 30 días perfectos: +500 XP, +200 QC 💎
  - 60 días perfectos: +1000 XP, +400 QC 👑
  - 100 días perfectos: +2000 XP, +800 QC 🏆
  - 365 días perfectos: +10000 XP, +5000 QC 🌟 LEGENDARY!

### UI/UX (Pendiente)
- [ ] **Banner en HomeScreen**: "Racha perfecta: X días 🔥"
- [ ] **Modal de hito alcanzado**: Animación épica cuando llegas a 7, 15, 30, etc.
- [ ] **Stats screen**: Calendario con días perfectos marcados
- [ ] **Progress bar**: "23/30 días para el siguiente hito"
- [ ] **Quest AI mensaje**: Celebración especial en hitos
- [ ] **Badge system**: Badges por cada hito alcanzado
- [ ] **Social sharing**: "¡30 días perfectos! 💎" (opt-in)

---

## 🚫 Sistema de Malos Hábitos (Hábitos a Eliminar)

### Concepto Core
**Filosofía:** En lugar de "completar" un mal hábito, el objetivo es **NO hacerlo**. Cada día sin hacer el mal hábito = victoria 🏆

### Base de Datos (Migration 034) ✅
- [x] **Columna `habit_type`**: 'positive' (construir) o 'negative' (eliminar) ✅
- [x] **Campos específicos para malos hábitos:** ✅
  - `quit_reason` - Por qué quieres dejarlo
  - `triggers_identified` - Situaciones/emociones que lo provocan
  - `replacement_activity` - Actividad saludable para hacer en su lugar
- [x] **Tabla `bad_habit_slip_ups`**: Registra recaídas/deslices ✅
  - Fecha del desliz
  - Trigger identificado (qué lo causó)
  - Contexto (dónde, cuándo, estado emocional)
  - Lección aprendida
  - Severidad (1-5: menor → recaída mayor)
- [x] **Tabla `bad_habit_clean_days`**: Días limpios (sin hacerlo) ✅
  - Estrategia de afrontamiento usada
  - Nivel de dificultad para resistir (1-5)
  - Notas del día
- [x] **Función `mark_bad_habit_clean_day()`**: Marca día como limpio ✅
  - Incrementa racha
  - Otorga XP/QC
  - Bonus en hitos: 7 días (+50 XP), 30 días (+100 XP), 90 días (+200 XP), 365 días (+500 XP!)
- [x] **Función `record_bad_habit_slip()`**: Registra recaída ✅
  - Resetea racha (pero mantiene best_streak para motivar)
  - Aplica penalización de XP (proporcional a severidad)
  - Guarda contexto para análisis de patrones

### Mecánica del Juego
**Para Hábitos Buenos (positive):**
- ✅ Completar = ganar XP
- ❌ No completar = perder XP (50%)

**Para Hábitos Malos (negative):**
- 🏆 NO hacerlo = ganar XP (mayor recompensa que hábitos buenos)
- 💔 Hacerlo (slip-up) = perder racha + penalización XP
- 📈 Racha cuenta días **sin** el mal hábito
- 🎯 Hitos más celebrados (porque es más difícil)

### UI/UX (Pendiente Implementación)
- [ ] **HabitsScreen modificado:**
  - Tabs: "Hábitos Buenos" / "Hábitos a Eliminar"
  - O filtro toggle en header
- [ ] **Crear Mal Hábito:**
  - Modal/screen especial
  - Campo obligatorio: "¿Por qué quieres dejar esto?" (quit_reason)
  - Campo: "¿Qué te provoca hacerlo?" (triggers - multi-select o tags)
  - Campo: "¿Qué harás en su lugar?" (replacement_activity)
  - XP reward más alto que hábitos buenos (por defecto 20 XP vs 10 XP)
- [ ] **Card de Mal Hábito:**
  - Diseño diferente (rojo/naranja, icono ⚠️ o 🚫)
  - Botón: "Marqué Hoy Limpio 🎉" (verde)
  - Botón: "Tuve un desliz 💔" (rojo/gris)
  - Mostrar racha de días limpios prominentemente
  - Progress bar: "X días sin [mal hábito]"
- [ ] **Modal de Día Limpio:**
  - "¡Otro día sin [mal hábito]! 💪"
  - "¿Qué te ayudó hoy?" (opcional - coping strategy)
  - "¿Qué tan difícil fue?" (1-5 estrellas)
  - Botón "Confirmar Victoria"
  - Animación celebratoria + XP earned
- [ ] **Modal de Desliz (Slip-up):**
  - Tono empático, NO punitivo
  - "Está bien. Lo importante es levantarse 💙"
  - "¿Qué lo provocó?" (dropdown de triggers + custom)
  - "¿Dónde estabas? ¿Cómo te sentías?" (contexto)
  - "¿Qué aprendiste?" (optional text)
  - "Severidad del desliz" (1-5)
  - Mostrar: "Perdiste X racha pero tu récord de Y días sigue ahí"
  - Botón "Volver a Empezar 🚀"
- [ ] **Analytics de Mal Hábito:**
  - Calendario con días limpios (verdes) y slip-ups (rojos)
  - Gráfica de rachas over time
  - "Triggers más comunes" - lista con frecuencia
  - "Situaciones de riesgo" - basado en contexto de slip-ups
  - "Estrategias que funcionan" - basado en clean days con notas
- [ ] **Quest AI Integration:**
  - Preguntas sobre triggers en conversación
  - Sugerencias de replacement activities
  - Mensaje proactivo en hitos (7, 30, 90 días limpios)
  - Mensaje empático tras slip-up (no juzgar, motivar)
  - Detectar patrones: "Veo que los viernes son difíciles para ti..."

### Ejemplos de Malos Hábitos
- 🚬 Fumar
- 🍺 Beber alcohol en exceso
- 📱 Scroll infinito en redes sociales
- 🍫 Comer comida chatarra compulsivamente
- 😴 Dormir tarde / mal horario
- 🎮 Gaming excesivo
- 💅 Morderse las uñas
- 🤬 Reaccionar con ira
- 🛋️ Procrastinación
- 💸 Compras impulsivas

### Features Avanzadas (Futuro)
- [ ] **Buddy System:** Emparejar usuarios que quieren dejar el mismo hábito
- [ ] **Check-ins diarios:** Notificación para marcar día limpio
- [ ] **Temptation Blocker:** Botón de emergencia cuando hay tentación
  - Abre chat con Quest AI
  - Muestra motivación personalizada
  - Sugiere replacement activity
  - Muestra progreso y lo que perderías
- [ ] **Rewards escalados:** Desbloquear badges/items tras X días limpios
- [ ] **AI Pattern Detection:** Analizar slip-ups y sugerir prevención
- [ ] **Support Groups:** Mini-guilds de personas dejando mismo hábito

---

## 📚 Tutorial Completo

### Tutorial interactivo (opcional al inicio)
- [ ] Paso 1: Bienvenida y propósito de Quest
- [ ] Paso 2: Los 6 pilares explicados
- [ ] Paso 3: Cómo funcionan los Life Paths
- [ ] Paso 4: Hábitos diarios y tracking
- [ ] Paso 5: Quests y recompensas
- [ ] Paso 6: Quest AI - tu coach personal
- [ ] Paso 7: Tienda y personalización
- [ ] Paso 8: Social - amigos, guilds, duelos
- [ ] Paso 9: Agenda y planificación
- [ ] Paso 10: Premium vs Free
- [ ] Botón "Saltar tutorial" en cada paso

### Acceso desde Perfil
- [ ] Opción "Ver tutorial de nuevo" en configuración
- [ ] Secciones individuales del tutorial accesibles
- [ ] Tips y trucos adicionales

### Preview de funcionalidades futuras
- [ ] Guilds avanzados (como grupos de WhatsApp)
- [ ] Challenges grupales
- [ ] Torneos y competiciones
- [ ] Mentorías
- [ ] Marketplace de hábitos/quests
- [ ] Estadísticas avanzadas
- [ ] Integraciones con más apps
- [ ] Modo offline
- [ ] Widgets para el home screen

---

## 🛠️ Tareas Técnicas Pendientes

### Base de datos
- [ ] Tabla para eventos de agenda interna
- [ ] Tabla para tokens de Google Calendar
- [ ] Campo `deadline` en life_paths
- [ ] Campo `penalty_applied` en user_habits/user_quests
- [ ] Campo `ai_recommendations_enabled` en profiles
- [ ] Campo `tutorial_completed` en profiles

### Funciones RPC
- [ ] `apply_habit_penalty` - quitar XP por hábito fallido
- [ ] `apply_quest_penalty` - quitar XP por quest fallido
- [ ] `get_calendar_events` - obtener eventos de agenda

### Servicios
- [ ] GoogleCalendarService - manejo de OAuth y API
- [ ] AgendaService - agenda interna
- [ ] PenaltyService - sistema de penalizaciones
- [ ] TutorialService - tracking de progreso del tutorial

---

## 📊 Prioridades

### 🔴 Alta Prioridad
1. i18n - toda la app responsive al idioma
2. Límites de hábitos/quests para free users
3. Sistema de penalizaciones
4. Tiempo límite en Life Paths

### 🟡 Media Prioridad
5. Mensajes proactivos de la IA
6. Tutorial completo
7. Quests manuales positivos
8. Agenda interna básica

### 🟢 Baja Prioridad (requiere más tiempo)
9. Google Calendar integration
10. Recomendaciones AI para premium

---

## ✅ Completado (de sesiones anteriores)

- [x] Life Path genera milestones/habits/quests automáticamente
- [x] Quests personalizados por IA
- [x] Onboarding con IA hace preguntas (primera vez)
- [x] Life Path obligatorio al crear cuenta
- [x] Social tab: Coming Soon
- [x] Prompt de IA mejorado (conversacional, divertido)
- [x] Idioma en Perfil
- [x] Tabs centrados
- [x] Quitar mensaje "sabe toda tu info"
- [x] Tabs de navegación responsive (Home, Journey, Shop)
- [x] Creación manual de hábitos
- [x] BackButton component
- [x] Límite de pilares (2 free, 6 premium)

---

## 📬 NOTIFICACIONES, MALOS HÁBITOS, STREAKS Y QUEST AI EN GRUPOS (Migration 040)

### 1. Sistema de Notificaciones
- [x] **Backend:** Función `create_notification()` para crear notificaciones ✅
- [ ] **API:** `notifications.ts` con CRUD completo
- [ ] **UI:** NotificationsScreen.tsx con lista de notificaciones
- [ ] **UI:** Badge de notificaciones no leídas en tabs
- [ ] **Realtime:** Subscription a nuevas notificaciones
- [ ] **Push:** Integración con Expo Notifications
- Tipos soportados:
  - challenge, duel, raid, friend_request, guild_invite
  - achievement, streak, quest_message, bad_habit, system

### 2. Malos Hábitos (Bad Habits) 🚫
- [x] **Backend:** Tablas `bad_habits` y `bad_habit_logs` ✅
- [x] **Backend:** Función `log_bad_habit()` con penalizaciones automáticas ✅
- [ ] **API:** `badHabits.ts` con CRUD
- [ ] **UI:** BadHabitsScreen.tsx para gestionar malos hábitos
- [ ] **UI:** Modal para registrar caída en mal hábito
- [ ] **UI:** Estadísticas de evitación (X días sin caer)
- [ ] **Notificación:** Al registrar mal hábito → "⚠️ Perdiste X QC y Y XP"

**Features:**
- Tracking binario (sí/no) o por contador (veces al día)
- Penalizaciones configurables de QC y XP
- Notificación automática al aplicar penalización
- Un log por día por hábito (unique constraint)

### 3. Perfect Streaks (Rachas Perfectas) 🔥
- [x] **Backend:** Tabla `perfect_streaks` ✅
- [x] **Backend:** Función `update_perfect_streak()` ✅
- [ ] **API:** `perfectStreaks.ts` para obtener rachas
- [ ] **UI:** Icono en HomeScreen con días de racha
- [ ] **UI:** Modal animado al alcanzar milestone (7, 14, 30, 100 días)
- [ ] **UI:** StreaksScreen.tsx con historial completo
- [ ] **Cron Job:** Llamar a `update_perfect_streak()` diariamente
- [ ] **Notificación:** Milestone → "🔥 7 días perfectos! +50 QC"
- [ ] **Notificación:** Racha rota → "💔 Tu racha de X días ha terminado"

**Bonos:**
- 7 días: +50 QC, +100 XP
- 14 días: +100 QC, +200 XP
- 30 días: +300 QC, +500 XP
- 100 días: +1000 QC, +2000 XP

### 4. Quest AI como Miembro Virtual de Grupos 🤖
- [x] **Backend:** Columnas en `guilds` (quest_enabled, quest_personality, quest_auto_messages, quest_moderate) ✅
- [x] **Backend:** Tabla `guild_quest_messages` para mensajes programados ✅
- [x] **Backend:** Función `quest_analyze_guild_progress()` ✅
- [ ] **API:** `questAI.ts` con funciones de análisis y mensajes
- [ ] **UI:** GuildSettingsScreen.tsx → Toggle "Activar Quest AI"
- [ ] **UI:** Selector de personalidad (Motivador, Estricto, Gracioso, Analítico)
- [ ] **UI:** Quest aparece como mensaje especial en chat (con icono distintivo)
- [ ] **Cron Job:** Resumen diario a las 8 PM
- [ ] **Cron Job:** Reporte semanal los domingos
- [ ] **IA:** Quest responde menciones en chat (@Quest)
- [ ] **IA:** Quest modera contenido tóxico (si quest_moderate=true)
- [ ] **IA:** Quest sugiere retos grupales
- [ ] **IA:** Quest arbitraje de duelos con evidencia
- [ ] **IA:** Quest detecta burnout en miembros

**Personalidades:**
- 🌟 Motivacional: Mensajes de apoyo y celebración
- ⚔️ Estricto: Exige resultados, advierte bajo rendimiento
- 😂 Gracioso: Usa humor y memes
- 📊 Analítico: Datos, patrones, insights

**Funcionalidades:**
- Análisis de progreso del grupo (completitud, top performers, struggling members)
- Mensajes automáticos programados (diarios, semanales)
- Respuesta a menciones (@Quest comando/pregunta)
- Moderación de contenido con OpenAI Moderation API
- Generación de retos basados en contexto del grupo
- Verificación de evidencia en duelos
- Detección de burnout y ajuste de dificultad

### 5. Leaderboard Mejorado 🏆
- [x] **Backend:** Vista materializada `leaderboard_global` ✅
- [x] **Backend:** Vista `leaderboard_guilds` ✅
- [ ] **API:** `leaderboard.ts` con queries optimizados
- [ ] **UI:** LeaderboardScreen.tsx actualizado con tabs:
  - Global (por XP, Nivel, QC)
  - Friends
  - Guilds
  - Por Clase
  - Por Rachas
- [ ] **Cron Job:** Refresh de vista materializada cada hora
- [ ] **UI:** Animación al cambiar de posición en ranking
- [ ] **Notificación:** Cuando subes/bajas en ranking significativamente

**Métricas:**
- Total quests completados
- Total achievements
- Mejor racha (best_streak)
- Total días de rachas (suma de todas)
- Rankings: XP, Nivel, QC

### 6. Desafíos Grupales Mejorados (Raids) 🎯
- [x] **Backend:** Columnas en `raids` (penalty_type, penalty_description, auto_check_progress) ✅
- [x] **Backend:** Tabla `raid_penalty_votes` para votación de castigos ✅
- [ ] **API:** `raids.ts` actualizado con sistema de votación
- [ ] **UI:** RaidVotingScreen.tsx para proponer y votar castigos
- [ ] **UI:** Fase de proposición (12h) - miembros proponen castigos
- [ ] **UI:** Fase de votación (12h) - votar castigos propuestos
- [ ] **UI:** Resultado - mostrar castigo ganador
- [ ] **UI:** Verificación - subir evidencia de castigo cumplido
- [ ] **IA:** Quest verifica automáticamente si auto_check_progress=true
- [ ] **Notificación:** Inicio de votación
- [ ] **Notificación:** Castigo decidido
- [ ] **Notificación:** Recordatorio para cumplir castigo

**Tipos de castigos:**
- `vote`: El grupo vota democráticamente
- `fixed`: Definido al crear el raid (ej: -50 QC automático)
- `none`: Sin penalización, solo tracking

---

## 🔄 CRON JOBS NECESARIOS (Supabase Edge Functions)

1. **Daily Streak Check** (Medianoche)
   - Ejecutar `update_perfect_streak()` para todos los usuarios
   - Aplicar bonos de milestones
   - Enviar notificaciones de rachas

2. **Leaderboard Refresh** (Cada hora)
   - `REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_global`

3. **Quest Daily Summary** (8 PM)
   - Para cada guild con `quest_enabled=true`
   - Ejecutar `quest_analyze_guild_progress()`
   - Enviar mensaje en chat del grupo

4. **Quest Weekly Report** (Domingos 6 PM)
   - Reporte completo de la semana
   - Estadísticas, MVP, insights

5. **Raid Penalty Phases** (Según horarios)
   - Inicio de proposición (cuando raid termina)
   - Inicio de votación (12h después)
   - Cierre y resultado (24h después)

---

## 📚 DOCUMENTACIÓN CREADA

- [x] `MIGRATION_040_FEATURES.md` - Guía completa de todas las features ✅
- [x] Ejemplos de uso de cada función ✅
- [x] Ideas adicionales para Quest AI ✅
- [x] Implementación de UI sugerida ✅

---

> **Próximo paso sugerido:** Implementar APIs (notifications.ts, badHabits.ts, perfectStreaks.ts, questAI.ts) y luego crear las pantallas UI
