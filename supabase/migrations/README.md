# 📁 Database Migrations

This folder contains all database migrations for the Quest app.

## Initial Setup

For a **fresh database setup**, run these files first in the Supabase SQL Editor:

1. `../database/00_MASTER_SCHEMA.sql` - Complete database schema (tables, indexes, RLS)
2. `../database/01_ASSESSMENT_QUESTIONS.sql` - Assessment questions seed data

## Migrations

After the initial setup, apply these migrations **in order**:

| # | File | Description |
|---|------|-------------|
| 001 | `001_life_paths_subscription_limits.sql` | Add Life Paths limits to subscription tiers |
| 002 | `002_fix_assessment_questions.sql` | Clean up and reorganize assessment questions |
| 003 | `003_guild_functions.sql` | Guild/group helper functions |
| 004 | `004_restore_aspirational_questions.sql` | Add aspirational questions to assessment |
| 005 | `005_achievement_logs_and_questions.sql` | Achievement logging table and helper functions |
| 006 | `006_fix_questions_and_translations.sql` | Add English translations to questions |
| 007 | `007_chat_history.sql` | AI chat history storage |
| 008 | `008_remove_self_care_pillar.sql` | Remove self-care pillar (merged into physical) |
| 009 | `009_push_notifications.sql` | Push notification preferences and tokens |
| 010 | `010_pillar_snapshots.sql` | Historical snapshots of pillar progress |
| 011 | `011_premium_system.sql` | Premium subscription tracking |
| 012 | `012_quest_finanzas.sql` | Personal finance tracking module |
| 013 | `013_guild_ai_system.sql` | AI mentor for guilds |
| 014 | `014_payments_system.sql` | Payment processing tables |
| 015 | `015_limits_and_premium_features.sql` | Feature limits by subscription tier |
| 016 | `016_balanced_pricing.sql` | Balanced pricing configuration |
| 017 | `017_revenucat_webhooks.sql` | RevenueCat webhook handling |
| 018 | `018_guilds_system.sql` | Extended guilds/groups system |
| 019 | `019_fix_rls_warnings.sql` | Fix Row Level Security warnings |
| 020 | `020_fix_rls_performance.sql` | Optimize RLS policies for performance |
| 021 | `021_fix_function_search_path.sql` | Security: Set search_path for functions |
| 022 | `022_weekly_review_health_tables.sql` | Weekly review and health sync tables |
| 023 | `023_generate_daily_agenda.sql` | Daily agenda generation function |

## Notes

- ⚠️ Always run migrations in order
- ⚠️ Each migration is idempotent (safe to run multiple times)
- ⚠️ Backup your database before running migrations in production

---

# 📁 Migraciones de Base de Datos (Español)

Esta carpeta contiene todas las migraciones de base de datos para la app Quest.

## Setup Inicial

Para un **setup de base de datos nuevo**, ejecuta estos archivos primero en el SQL Editor de Supabase:

1. `../database/00_MASTER_SCHEMA.sql` - Esquema completo (tablas, índices, RLS)
2. `../database/01_ASSESSMENT_QUESTIONS.sql` - Preguntas del assessment

## Migraciones

Después del setup inicial, aplica estas migraciones **en orden**:

| # | Archivo | Descripción |
|---|---------|-------------|
| 001 | `001_life_paths_subscription_limits.sql` | Límites de Life Paths por suscripción |
| 002 | `002_fix_assessment_questions.sql` | Reorganizar preguntas del assessment |
| 003 | `003_guild_functions.sql` | Funciones auxiliares de guilds |
| 004 | `004_restore_aspirational_questions.sql` | Preguntas aspiracionales |
| 005 | `005_achievement_logs_and_questions.sql` | Tabla de logs de logros |
| 006 | `006_fix_questions_and_translations.sql` | Traducciones al inglés |
| 007 | `007_chat_history.sql` | Historial de chat con IA |
| 008 | `008_remove_self_care_pillar.sql` | Eliminar pilar self-care |
| 009 | `009_push_notifications.sql` | Notificaciones push |
| 010 | `010_pillar_snapshots.sql` | Snapshots históricos de pilares |
| 011 | `011_premium_system.sql` | Sistema de suscripción premium |
| 012 | `012_quest_finanzas.sql` | Módulo de finanzas personales |
| 013 | `013_guild_ai_system.sql` | Mentor IA para guilds |
| 014 | `014_payments_system.sql` | Tablas de procesamiento de pagos |
| 015 | `015_limits_and_premium_features.sql` | Límites por nivel de suscripción |
| 016 | `016_balanced_pricing.sql` | Configuración de precios |
| 017 | `017_revenucat_webhooks.sql` | Webhooks de RevenueCat |
| 018 | `018_guilds_system.sql` | Sistema extendido de guilds |
| 019 | `019_fix_rls_warnings.sql` | Arreglar warnings de RLS |
| 020 | `020_fix_rls_performance.sql` | Optimizar políticas RLS |
| 021 | `021_fix_function_search_path.sql` | Seguridad: search_path en funciones |
| 022 | `022_weekly_review_health_tables.sql` | Tablas de revisión semanal y salud |
| 023 | `023_generate_daily_agenda.sql` | Función de generación de agenda diaria |

## Notas

- ⚠️ Siempre ejecuta las migraciones en orden
- ⚠️ Cada migración es idempotente (seguro ejecutar múltiples veces)
- ⚠️ Haz backup antes de ejecutar en producción
