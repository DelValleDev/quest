# Supabase Migrations / Migraciones de Supabase

## English

This folder contains all SQL migrations organized by functionality. Each file handles a single feature or table for better maintainability.

### Migration Files

| File | Description |
|------|-------------|
| `001_subscription_tiers.sql` | Subscription tier definitions (free/premium/ultimate) |
| `002_assessment_translations.sql` | English translation columns for assessment questions |
| `003_achievement_logs.sql` | User achievement tracking table |
| `004_rewards_functions.sql` | Helper functions for XP and coins |
| `005_chat_history.sql` | AI Coach chat history storage |
| `006_push_notifications.sql` | Push notification tokens table |
| `007_pillar_snapshots.sql` | Historical pillar score data |
| `008_premium_profile_columns.sql` | Premium-related columns in profiles |
| `009_subscription_history.sql` | Subscription change history |
| `010_premium_functions.sql` | Premium trial and status functions |
| `011_expense_categories.sql` | Expense categories table |
| `012_financial_transactions.sql` | Financial transactions table |
| `013_budget_goals.sql` | Budget/savings goals table |
| `014_monthly_budgets.sql` | Monthly budget settings |
| `015_guilds.sql` | User guilds/groups table |
| `016_guild_members.sql` | Guild membership table |
| `017_guild_ai_settings.sql` | Guild AI mentor configuration |
| `018_revenucat_purchases.sql` | RevenueCat purchase records |
| `019_weekly_reviews.sql` | Weekly progress reviews |
| `020_health_sync_data.sql` | HealthKit/Google Fit sync data |
| `021_life_paths.sql` | Long-term goal paths |
| `022_daily_agendas.sql` | AI-generated daily agendas |
| `023_user_habits.sql` | Habit tracking with streaks |
| `024_user_streaks.sql` | Streak tracking system |
| `025_rls_security.sql` | Row Level Security policies |

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or run individual files
supabase db reset
```

---

## Español

Esta carpeta contiene todas las migraciones SQL organizadas por funcionalidad. Cada archivo maneja una sola característica o tabla para mejor mantenibilidad.

### Archivos de Migración

| Archivo | Descripción |
|---------|-------------|
| `001_subscription_tiers.sql` | Definiciones de tiers de suscripción (free/premium/ultimate) |
| `002_assessment_translations.sql` | Columnas de traducción al inglés para preguntas |
| `003_achievement_logs.sql` | Tabla de seguimiento de logros |
| `004_rewards_functions.sql` | Funciones helper para XP y monedas |
| `005_chat_history.sql` | Almacenamiento de historial de chat con IA |
| `006_push_notifications.sql` | Tabla de tokens de notificaciones push |
| `007_pillar_snapshots.sql` | Datos históricos de puntajes de pilares |
| `008_premium_profile_columns.sql` | Columnas premium en perfiles |
| `009_subscription_history.sql` | Historial de cambios de suscripción |
| `010_premium_functions.sql` | Funciones de trial y estado premium |
| `011_expense_categories.sql` | Tabla de categorías de gastos |
| `012_financial_transactions.sql` | Tabla de transacciones financieras |
| `013_budget_goals.sql` | Tabla de metas de ahorro |
| `014_monthly_budgets.sql` | Configuración de presupuestos mensuales |
| `015_guilds.sql` | Tabla de guildas/grupos |
| `016_guild_members.sql` | Tabla de membresías de guildas |
| `017_guild_ai_settings.sql` | Configuración del mentor IA de guilda |
| `018_revenucat_purchases.sql` | Registros de compras de RevenueCat |
| `019_weekly_reviews.sql` | Revisiones semanales de progreso |
| `020_health_sync_data.sql` | Datos sincronizados de HealthKit/Google Fit |
| `021_life_paths.sql` | Caminos de metas a largo plazo |
| `022_daily_agendas.sql` | Agendas diarias generadas por IA |
| `023_user_habits.sql` | Seguimiento de hábitos con rachas |
| `024_user_streaks.sql` | Sistema de tracking de rachas |
| `025_rls_security.sql` | Políticas de Row Level Security |

### Ejecutar Migraciones

```bash
# Usando Supabase CLI
supabase db push

# O ejecutar archivos individuales
supabase db reset
```
