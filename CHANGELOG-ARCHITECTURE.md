# 📋 QUEST - CHANGELOG DE ARQUITECTURA

**Última actualización:** Diciembre 2024

---

## 🔄 CAMBIOS MAYORES DE DISEÑO

### 1. ENFOQUE PRINCIPAL: DE QUESTS A HÁBITOS

**ANTES:**
- Quests (misiones) eran el foco principal
- Hábitos eran secundarios
- Sistema basado en completar misiones diarias

**AHORA:**
- **Hábitos diarios son el FOCO PRINCIPAL** ✨
- Quests usan el TIEMPO LIBRE restante
- Sistema de checklist de hábitos como vista principal
- Quests son opcionales y se asignan al tiempo disponible

**Archivos afectados:**
- `database/habits_system.sql` - Nuevo sistema de hábitos
- `app/src/screens/main/HabitsScreen.tsx` - Pantalla principal de hábitos
- `database/agenda_system.sql` - Sistema de agenda integrada

---

### 2. SISTEMA DE CLASES DINÁMICAS

**ANTES:**
- El usuario ELEGÍA su clase manualmente
- Clases fijas basadas en lo que ERES

**AHORA:**
- Clases se CALCULAN AUTOMÁTICAMENTE ✨
- Basadas en respuestas del assessment
- Enfocadas en lo que QUIERES SER (aspiraciones)
- Cada clase muestra el porcentaje de afinidad
- El mayor porcentaje define tu clase primaria

**Clases disponibles:**
| Clase | Icono | Pilar Principal | Color |
|-------|-------|-----------------|-------|
| Guerrero | 💪 | Físico | #EF4444 |
| Sabio | 🧠 | Mental | #3B82F6 |
| Conector | ❤️ | Social | #EC4899 |
| Creador | 🎨 | Creativo | #F97316 |
| Achiever | 💼 | Profesional | #10B981 |
| Monje | 🕉️ | Espiritual | #8B5CF6 |

**Archivos afectados:**
- `database/dynamic_class_system.sql` - Nuevo sistema dinámico
- `database/assessment_updates.sql` - Preguntas de aspiración añadidas

---

### 3. NUEVO PILAR: CUIDADO PERSONAL (Self-Care)

**Añadido nuevo pilar:** 🧴 Cuidado Personal

**Incluye hábitos como:**
- Rutina de skincare
- Higiene dental
- Hacer la cama
- Tomar vitaminas
- Organización del espacio

**Archivos afectados:**
- `database/habits_system.sql` - Pilar y preset habits añadidos
- `database/assessment_updates.sql` - Preguntas de self-care

---

### 4. SISTEMA DE AGENDA INTEGRADA

**Nuevo sistema que conecta TODO:**
- 📋 Hábitos del día (prioridad)
- 📅 Eventos del calendario sincronizado
- 🎯 Quests asignadas a tiempo libre
- ⏰ Vista unificada del día

**Funciones principales:**
```sql
generate_daily_agenda(user_id, date)     -- Genera agenda del día
calculate_free_time(user_id, date)       -- Calcula tiempo libre
suggest_quests_for_free_time(user_id)    -- Sugiere quests
complete_agenda_item(user_id, item_id)   -- Completa items
get_agenda_summary(user_id, date)        -- Resumen del día
```

**Archivos afectados:**
- `database/agenda_system.sql` - Nuevo sistema
- `app/src/screens/main/AgendaScreen.tsx` - Nueva pantalla

---

### 5. SELECCIÓN DE PILARES ANTES DEL ASSESSMENT

**Nuevo flujo de onboarding:**
1. ✅ Pantalla de bienvenida
2. ✅ Registro/Login
3. ✅ Setup inicial (nombre, avatar, idioma)
4. **✅ NUEVO: Selección de pilares** 
5. ✅ Assessment (filtrado por pilares seleccionados)
6. ✅ Resultados y clase asignada

**Opciones de longitud del assessment:**
| Tipo | Preguntas por pilar | Duración estimada |
|------|---------------------|-------------------|
| Corto | 2-3 (core) | ~5 min |
| Medio | 4-5 (core + extended) | ~10 min |
| Completo | 6-7 (todas) | ~15 min |

**Archivos afectados:**
- `app/src/screens/onboarding/PillarSelectionScreen.tsx`
- `database/assessment_updates.sql` - Función get_assessment_questions

---

### 6. PREGUNTA PROFESIONAL: MÚLTIPLE OPCIÓN

**ANTES:**
```sql
question_type = 'single_choice'
options = '["Estudiante", "Empleado", "Freelancer", ...]'
```

**AHORA:**
```sql
question_type = 'multiple_choice'
options = '["Estudiante", "Empleado tiempo completo", "Empleado medio tiempo", "Freelancer", "Emprendedor", "Desempleado", "Ama de casa", "Retirado", "Entre trabajos", "Otro"]'
```

---

## 📁 ARCHIVOS NUEVOS CREADOS

| Archivo | Propósito |
|---------|-----------|
| `database/habits_system.sql` | Sistema completo de hábitos |
| `database/dynamic_class_system.sql` | Clases calculadas por assessment |
| `database/agenda_system.sql` | Sistema de agenda integrada |
| `database/assessment_updates.sql` | Actualizaciones al assessment |
| `screens/main/HabitsScreen.tsx` | Pantalla de checklist de hábitos |
| `screens/main/AgendaScreen.tsx` | Pantalla de agenda diaria |
| `screens/onboarding/PillarSelectionScreen.tsx` | Selección de pilares |

---

## 📊 NUEVAS TABLAS DE BASE DE DATOS

### Hábitos
```sql
habits                  -- Hábitos del usuario
habit_logs              -- Registro de completados
preset_habits           -- Hábitos predefinidos (~40)
user_pillar_focus       -- Pilares seleccionados
```

### Clases Dinámicas
```sql
user_class_affinities   -- Porcentajes por clase
-- Campos: warrior_pct, sage_pct, connector_pct, etc.
```

### Agenda
```sql
daily_agenda_items      -- Items del día
user_free_time_slots    -- Espacios libres
quest_time_assignments  -- Quests asignadas
```

---

## 🔧 FUNCIONES SQL NUEVAS

### Hábitos
```sql
complete_habit(habit_id, user_id, notes, mood)
get_today_habits(user_id)
```

### Clases
```sql
calculate_class_from_assessment(user_id)
get_user_class_profile(user_id)
```

### Agenda
```sql
generate_daily_agenda(user_id, date)
calculate_free_time(user_id, date)
suggest_quests_for_free_time(user_id, date, max_quests)
complete_agenda_item(user_id, item_id)
get_agenda_summary(user_id, date)
```

### Assessment
```sql
get_assessment_questions(pillars[], length)
calculate_assessment_length(pillars[], length)
```

---

## 💡 NOTAS SOBRE EL NOMBRE DE LA APP

El nombre "Quest" sigue siendo apropiado porque:
- Representa la "búsqueda" de mejora personal
- Los hábitos son los pasos del camino
- Las quests son objetivos extras opcionales

**Alternativas consideradas (no adoptadas):**
- Forge (forjar tu mejor versión)
- Rise (ascender)
- Pathway (camino)

---

## 🚀 PRÓXIMOS PASOS

1. [ ] Integrar nueva navegación en App.tsx
2. [ ] Conectar AgendaScreen a bottom tabs
3. [ ] Implementar flujo completo de onboarding con PillarSelection
4. [ ] Crear UI para añadir hábitos desde preset_habits
5. [ ] Sincronizar calendario con Google/Apple Calendar

---

## 📝 HISTORIAL DE CAMBIOS

| Fecha | Cambio |
|-------|--------|
| Dic 2024 | Cambio de enfoque: Quests → Hábitos |
| Dic 2024 | Sistema de clases dinámicas |
| Dic 2024 | Pilar Self-Care añadido |
| Dic 2024 | Sistema de agenda integrada |
| Dic 2024 | Pregunta profesional → múltiple opción |
| Dic 2024 | Selección de pilares pre-assessment |
