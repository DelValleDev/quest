# 🚫 Sistema de Malos Hábitos - Documentación Completa

**"Breaking bad habits is harder than building good ones. We make it a game."**

---

## 📋 Índice

1. [Filosofía y Psicología](#filosofía-y-psicología)
2. [Cómo Funciona](#cómo-funciona)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Flujos de Usuario](#flujos-de-usuario)
5. [Diferencias vs Hábitos Buenos](#diferencias-vs-hábitos-buenos)
6. [Quest AI Integration](#quest-ai-integration)
7. [Gamificación](#gamificación)
8. [Casos de Uso](#casos-de-uso)

---

## 1. Filosofía y Psicología

### Principios Core

**1. Inversión del Concepto**
- Hábitos buenos: Hacer algo = éxito
- Malos hábitos: **NO hacer algo = éxito**
- La victoria está en la RESISTENCIA, no en la acción

**2. Enfoque en Streaks (Rachas)**
- Cada día sin el mal hábito cuenta
- Las rachas largas son más valiosas (XP escalado)
- Hitos celebrados: 7, 30, 90, 365 días

**3. Empatía en Recaídas**
- Los slip-ups son ESPERADOS, no fallas
- No punitivo: aprende del desliz
- Mantener best_streak para motivar ("Ya lo hiciste antes")

**4. Identificación de Triggers**
- Fundamental saber QUÉ provoca el mal hábito
- Contexto: dónde, cuándo, con quién, estado emocional
- Patrones = prevención

**5. Replacement Activities**
- No solo quitar, sino REEMPLAZAR
- "Cuando sientas X, haz Y en lugar de Z"
- Ejemplo: Scroll infinito → Leer 5 páginas de libro

### Psicología del Diseño

**Por qué funciona:**

1. **Recompensa Inmediata:** Marcar día limpio = XP instantáneo
2. **Progreso Visible:** Racha creciente es dopamina pura
3. **Aversion to Loss:** No quieres perder tu racha de 29 días
4. **Identity Shift:** "Soy alguien que ya lleva X días sin [mal hábito]"
5. **Datos, No Culpa:** Slip-up no es falla moral, es data para mejorar

---

## 2. Cómo Funciona

### Para el Usuario

#### Crear Mal Hábito
```
1. Usuario va a Habits → "Agregar Hábito a Eliminar"
2. Formulario:
   - Título: "Fumar" / "Scroll en Instagram" / "Comer azúcar"
   - ¿Por qué quieres dejarlo? (quit_reason)
     - Opciones: Salud, Dinero, Tiempo, Relaciones, Auto-estima, Otro
   - ¿Qué lo provoca? (triggers)
     - Multi-select: Estrés, Aburrimiento, Soledad, Ansiedad, 
                     Alcohol, Ciertos lugares, Ciertas personas, Custom
   - ¿Qué harás en su lugar? (replacement_activity)
     - Sugerencias AI basadas en triggers
   - XP por día limpio: 20 (default, más alto que hábitos buenos)
```

#### Cada Día

**Opción A: Día Limpio 🎉**
```
Usuario abre app → Ve card del mal hábito
Card muestra: "5 días sin fumar 🔥"
Usuario toca: "Marqué Hoy Limpio"
  ↓
Modal:
  - "¡Otro día de victoria! 💪"
  - "¿Qué te ayudó hoy?" 
    - Botones rápidos: "Ejercicio", "Meditación", "Apoyo amigos", "Otro"
  - "¿Qué tan difícil fue resistir?"
    - 1 ⭐ (Fácil) → 5 ⭐ (Muy difícil)
  - Botón: "Confirmar Victoria"
  ↓
Sistema:
  - Llama mark_bad_habit_clean_day()
  - Incrementa racha: 5 → 6 días
  - Otorga 20 XP + 5 QC
  - Si es hito (7 días): +50 XP bonus!
  - Guarda coping strategy para analytics
  ↓
Animación: "+20 XP ⭐" con confetti
Toast: "¡6 días sin fumar! Sigue así, campeón 🏆"
```

**Opción B: Slip-up 💔**
```
Usuario tuvo una recaída → Abre app
Toca: "Tuve un desliz"
  ↓
Modal (Tono empático):
  - "Está bien. Todos tenemos días difíciles 💙"
  - "Lo importante es que volviste. Eso requiere coraje."
  - 
  - "¿Qué lo provocó?" (dropdown de sus triggers)
  - "¿Dónde estabas? ¿Cómo te sentías?" (texto libre)
  - "Severidad" (1-5):
    - 1: Slip menor (una vez)
    - 3: Recaída moderada
    - 5: Recaída total (todo el día)
  - "¿Qué aprendiste?" (opcional)
  - 
  - Info: "Perdiste tu racha de 5 días, pero tu récord de 12 días sigue ahí"
  - Botón: "Volver a Empezar 🚀"
  ↓
Sistema:
  - Llama record_bad_habit_slip()
  - Guarda trigger + context en DB
  - Reset streak: 5 → 0 (pero best_streak = 12)
  - Penalización XP: 20 * severidad (ej: 60 XP si severidad=3)
  - Log en penalty_logs
  ↓
Quest AI mensaje:
  "Veo que tuviste un desliz. No te definas por este momento.
   Veo que el trigger fue 'estrés'. ¿Qué tal si la próxima vez
   que estés estresado intentas [replacement_activity]?
   Recuerda: ya lograste 12 días seguidos. Puedes volver a hacerlo. 💪"
```

---

## 3. Arquitectura Técnica

### Database Schema (Migration 034)

**Tabla: `habits`** (Extendida)
```sql
habit_type TEXT DEFAULT 'positive' -- 'positive' o 'negative'
quit_reason TEXT -- Por qué quiere dejarlo
triggers_identified TEXT[] -- ['stress', 'boredom', 'alcohol']
replacement_activity TEXT -- "Salir a caminar 10 minutos"
```

**Tabla: `bad_habit_slip_ups`**
```sql
id UUID
habit_id UUID → habits.id
user_id UUID → profiles.id
slipped_at TIMESTAMPTZ
slip_date DATE
trigger_identified TEXT -- Qué causó este slip específico
context TEXT -- Contexto completo (dónde, cuándo, cómo)
learned_lesson TEXT -- Qué aprendió
severity INTEGER (1-5) -- Gravedad
```

**Tabla: `bad_habit_clean_days`**
```sql
id UUID
habit_id UUID → habits.id
user_id UUID → profiles.id
clean_date DATE
notes TEXT
coping_strategy_used TEXT -- "Ejercicio", "Llamé a un amigo", etc.
difficulty_level INTEGER (1-5) -- Qué tan difícil fue resistir
```

### Functions

**`mark_bad_habit_clean_day(p_user_id, p_habit_id, p_coping_strategy, p_difficulty)`**
```typescript
Returns: {
  success: true,
  new_streak: 6,
  xp_earned: 70, // 20 base + 50 por hito de 7 días
  coins_earned: 5,
  milestone_reached: true
}

Logic:
1. Verifica que sea un bad habit (habit_type='negative')
2. Check si ya marcó hoy (UNIQUE constraint)
3. Insert en bad_habit_clean_days
4. Update streak: current_streak + 1
5. Update best_streak si supera
6. Calcula XP con bonuses por hitos:
   - 7 días: +50 XP
   - 30 días: +100 XP
   - 90 días: +200 XP
   - 365 días: +500 XP!!!
7. Award XP y coins
8. Update pillar XP con source='bad_habit_resist'
```

**`record_bad_habit_slip(p_user_id, p_habit_id, p_trigger, p_context, p_severity)`**
```typescript
Returns: {
  success: true,
  streak_lost: 5,
  xp_penalty: 60, // xp_reward * severity
  message: "It's okay to slip. What matters is getting back up."
}

Logic:
1. Verifica que sea un bad habit
2. Insert/Update en bad_habit_slip_ups (UPSERT por fecha)
3. Delete clean_day si existe para hoy
4. Reset current_streak a 0 (pero mantiene best_streak)
5. Aplica penalty: total_xp - (xp_reward * severity)
6. Log en penalty_logs
7. Return contexto para UI empático
```

---

## 4. Flujos de Usuario

### Flujo Completo: Dejar de Fumar

**Día 1 - Setup:**
```
Usuario: "Quiero dejar de fumar"
  ↓
HabitsScreen → "Agregar Hábito a Eliminar"
  ↓
Form:
  - Hábito: "Fumar"
  - ¿Por qué? "Salud + Dinero"
  - Triggers: [Estrés, Alcohol, Después de comer]
  - Reemplazo: "Masticar chicle sin azúcar"
  - XP: 25 (aumentado porque es difícil)
  ↓
Hábito creado con current_streak = 0
```

**Días 2-7 (Primera Semana):**
```
Cada día:
  - Usuario resiste fumar
  - Marca día limpio
  - Gana 25 XP
  - Racha crece: 1→2→3→4→5→6

Día 7:
  - Marca día limpio
  - Sistema detecta hito de 7 días
  - Gana 25 + 50 = 75 XP!
  - Quest AI: "🎉 ¡UNA SEMANA SIN FUMAR! Esto es ENORME.
               Tu cuerpo ya está sanando. ¡Sigue así!"
  - Badge desbloqueado: "Primera Semana Limpio 🏆"
```

**Día 15 (Slip-up):**
```
Usuario está en fiesta, hay alcohol, fuma un cigarro
  ↓
Se siente mal pero registra el desliz honestamente
  ↓
App:
  - Tono empático (NO "Fallaste")
  - "Está bien. Llevabas 14 días, eso no se borra."
  - "¿Qué pasó?" → Trigger: "Alcohol"
  - "¿Dónde?" → "Fiesta con amigos"
  - Severidad: 1 (solo un cigarro)
  ↓
Sistema:
  - Reset streak: 14 → 0
  - Mantiene best_streak: 14
  - Penalty: -25 XP
  - Guarda: trigger=alcohol, context=fiesta
  ↓
Quest AI:
  "Veo que el alcohol fue el trigger. No es falla, es INFORMACIÓN.
   Ahora sabes que cuando bebas, el riesgo es mayor.
   ¿Qué tal evitar fiestas por un tiempo? O tener tu chicle a mano?
   Recuerda: lograste 14 días. Puedes volver a ese número y más. 💪"
```

**Días 16-30 (Vuelta al Camino):**
```
Usuario usa la info del slip-up
  - Evita alcohol por 2 semanas
  - Siempre lleva chicle
  - Marca días limpios: racha 1→2→...→15

Día 30 (desde el slip):
  - Nueva racha de 15 días
  - Best streak sigue en 14, pero lo supera!
  - Día 31: best_streak = 15 (nuevo récord personal)
  - Gana badge: "Volviste Más Fuerte 💪"
```

**Día 90:**
```
Racha actual: 75 días
Best streak: 75 días
  ↓
Marca día limpio
  ↓
Sistema: HITO DE 90 DÍAS (3 MESES)
  - 25 XP base + 200 XP bonus = 225 XP total!
  - Badge épico: "Dragón Domado 🐉" (3 meses limpio)
  - Quest AI mensaje especial
  - Posible post en social feed (con permiso)
  ↓
Stats:
  - Días limpios: 75/90 (83%)
  - Slip-ups totales: 3
  - Trigger más común: Alcohol (66%)
  - Estrategia que funciona: Chicle + Ejercicio
  - Dinero ahorrado: $675 (25 cigarros/día * $0.30 * 90 días)
  - Tiempo ahorrado: 37.5 horas (25 cigarros * 5 min * 90 días)
```

---

## 5. Diferencias vs Hábitos Buenos

| Aspecto | Hábitos Buenos ✅ | Malos Hábitos 🚫 |
|---------|------------------|------------------|
| **Objetivo** | Hacer algo | NO hacer algo |
| **Acción diaria** | "Completar" | "Marcar día limpio" |
| **Racha** | Días completados | Días SIN hacer |
| **XP Base** | 10-15 XP | 20-30 XP (mayor) |
| **Penalty por falla** | -50% XP | Severity-based (1-5x) |
| **Hitos** | 7, 30, 100 días | 7, 30, 90, 365 días |
| **UI Color** | Verde/Azul | Rojo/Naranja |
| **Datos extra** | Notas, mood | Triggers, context, severity |
| **Reemplazo** | N/A | Replacement activity |
| **Analytics** | Consistency | Slip-up patterns |
| **AI Tone** | Motivacional | Empático + Analítico |

---

## 6. Quest AI Integration

### Conversación Inicial
```
User: "Quiero dejar de fumar"

AI: "Eso requiere valor. 💪 Dejar de fumar es de las cosas más difíciles,
     pero también más transformadoras.
     
     Cuéntame, ¿qué te hace querer dejarlo ahora? ¿Qué pasó?"
     
[User responde]

AI: "Entiendo. Esas son razones poderosas. 
     Ahora, sé honesto conmigo: ¿en qué situaciones es más difícil resistir?
     ¿Cuándo sientes más ganas de fumar?"
     
[User: "Cuando estoy estresado" o "Con café" o "En fiestas"]

AI: "Perfecto. Esas son tus TRIGGERS. Ahora que las conocemos, podemos
     prepararnos.
     
     Voy a crear un hábito a eliminar para ti. Cada día que NO fumes,
     lo marcas y ganas 25 XP. Pero más importante: vas a ver tu racha
     crecer. 1 día, 2 días, 7 días, 30 días...
     
     Y cuando sientas [trigger], en lugar de fumar, ¿qué tal si [replacement]?
     
     ¿Listo para empezar hoy mismo? 🚀"
```

### Mensajes Proactivos

**Después de marcar día limpio:**
```typescript
// En proactiveAI.ts, nuevo tipo: 'bad_habit_clean_day'

if (context.type === 'bad_habit_clean_day') {
  if (context.data?.streak === 7) {
    return "🎉 ¡UNA SEMANA SIN [habit]! Cada día te haces más fuerte.";
  } else if (context.data?.streak === 30) {
    return "🌟 ¡UN MES! En serio, esto es increíble. Ya no eres quien eras hace 30 días.";
  } else if (context.data?.streak === 90) {
    return "🏆 ¡3 MESES! Oficialmente has roto el patrón. Esto ya es parte de tu identidad.";
  } else {
    return `💪 Día ${context.data?.streak}. Paso a paso construyes una vida mejor.`;
  }
}
```

**Después de slip-up:**
```typescript
if (context.type === 'bad_habit_slip') {
  const message = generateEmpathicSlipMessage(context);
  // Tone: NO JUZGAR. Aprender.
  return `${message}
          
          Veo que el trigger fue ${context.data?.trigger}.
          Recuerda: ya lograste ${context.data?.bestStreak} días.
          Mañana es un nuevo día para empezar de nuevo. 💙`;
}
```

### Pattern Analysis (AI avanzado)
```typescript
// Después de 3+ slip-ups, AI analiza patrones

AI: "He notado algo. Tus últimos 3 deslices fueron:
     - Viernes noche (alcohol)
     - Sábado tarde (fiesta)
     - Domingo noche (aburrimiento después de salir)
     
     Parece que los fines de semana son tu zona de riesgo.
     ¿Qué tal si planificamos alternativas para los próximos viernes/sábados?
     
     Ideas:
     - Ir al cine (no puedes fumar adentro)
     - Gym en la tarde (después del gym nunca dan ganas)
     - Llamar a un amigo que no fume
     
     ¿Cuál probamos este fin de semana?"
```

---

## 7. Gamificación

### XP Escalado
```typescript
Base XP per clean day: 20-30 (configurable)

Milestone Bonuses:
- 7 days:   +50 XP   (Total: 70-80 XP ese día)
- 30 days:  +100 XP  (Total: 120-130 XP)
- 90 days:  +200 XP  (Total: 220-230 XP)
- 365 days: +500 XP! (Total: 520-530 XP) 🏆

Why?
- Reflects difficulty
- Motivates long streaks
- Makes milestones feel EPIC
```

### Badges Especiales
```
🏆 Badges para Malos Hábitos:

- "Primera Victoria" - 1 día limpio
- "Semana Fuerte" - 7 días
- "Mes Imparable" - 30 días  
- "Trimestre Titán" - 90 días
- "Año Legendario" - 365 días!!!

- "Dragón Domado" - 90 días sin [hábito muy difícil]
- "Fénix Renacido" - Volver después de slip-up y superar best streak
- "Patrón Roto" - Identificar y evitar trigger 10 veces
- "Maestro del Reemplazo" - Usar replacement activity 50 veces
```

### Leaderboards (Con privacidad)
```
Opción de compartir progreso (opt-in):
- "30 días sin [categoría genérica]"
- NO especifica el mal hábito exacto
- Ejemplo: "30 días mejorando salud 💪" (no dice "sin fumar")

Guild Challenges:
- "Marzo Limpio" - Todos los miembros intentan 30 días
- Support cada día en chat
- Bonus XP si TODOS lo logran
```

---

## 8. Casos de Uso

### Caso 1: Scroll Infinito en Redes Sociales
```
Setup:
- Hábito: "Scroll infinito en Instagram"
- Quit reason: "Pierdo horas, me comparo con otros, me siento mal"
- Triggers: Aburrimiento, Procrastinación, Antes de dormir
- Replacement: "Leer 5 páginas de un libro"
- XP: 20

Daily:
- Usuario instala bloqueador de apps
- Cuando siente impulso de abrir Instagram, abre libro
- Al final del día, marca "Día Limpio"
- Guarda coping strategy: "Bloqueador + libro en mesita de noche"

After 30 days:
- Ha leído 2 libros completos (150 páginas)
- Durmehora mejor (no phone before bed)
- Analytics: Trigger más fuerte = "procrastinación" (60%)
- AI sugiere: Técnica Pomodoro para trabajar sin Instagram como premio
```

### Caso 2: Comer Comida Chatarra
```
Setup:
- Hábito: "Comer comida chatarra por ansiedad"
- Quit reason: "Salud, me siento mal después"
- Triggers: Ansiedad, Aburrimiento, Ver TV
- Replacement: "Fruta + agua o caminata de 10 min"
- XP: 25

Daily:
- Usuario prepara frutas cortadas en la mañana
- Cuando siente impulso, agarra la fruta
- O sale a caminar 10 minutos
- Marca día limpio + guarda qué strategy usó

Slip-up (Día 12):
- Estrés extremo del trabajo → Come papas fritas en la noche
- Registra: Trigger = "Estrés laboral extremo", Severity = 2
- Context: "Reunión difícil, llegué cansado, no preparé fruta"
- Learned: "Necesito preparar snacks aunque esté cansado"
- Reset streak pero best_streak = 11

Recovery:
- Siguiente semana: compra contenedores para prep de frutas
- Marca 14 días seguidos
- Supera best_streak
- Badge: "Fénix Renacido"
```

### Caso 3: Dejar de Beber Alcohol
```
Setup:
- Hábito: "Beber alcohol"
- Quit reason: "Salud, relaciones, trabajo"
- Triggers: Social pressure, Estrés, Viernes/Sábados
- Replacement: "Bebida sin alcohol, Early exit de fiestas"
- XP: 30 (muy alto porque es muy difícil)

Journey:
- Día 1-7: Evita bares, rechaza invites
- Día 8-14: Va a fiesta pero toma Coca-Cola, sale temprano
- Día 15: Slip-up (cedió a presión social)
- Registra trigger: "Amigos insistiendo"
- AI: "La presión social es real. ¿Qué tal si la próxima
       llevas tu propia bebida sin alcohol? O practicas 
       decir 'No gracias, estoy bien así' sin dar explicaciones?"
- Día 16-30: Usa estrategia de AI, funciona
- Día 30: Hito de 1 mes → +100 XP bonus
- Badge + maybe post en social: "30 días mejorando salud 💪"
```

---

## 🎯 Resumen de Implementación

### Backend (✅ Completado)
- [x] Migration 034 aplicada
- [x] Tables: habits extension, bad_habit_slip_ups, bad_habit_clean_days
- [x] Functions: mark_bad_habit_clean_day, record_bad_habit_slip
- [x] RLS policies
- [x] Indexes

### Frontend (⏳ Pendiente)
- [ ] HabitsScreen: Tab/toggle para "Hábitos a Eliminar"
- [ ] Create Bad Habit form/modal
- [ ] Bad Habit Card UI (diseño distinto)
- [ ] Mark Clean Day modal
- [ ] Record Slip-up modal
- [ ] Analytics view con calendar y patterns
- [ ] Quest AI integration para bad habits

### Features Opcionales (🔮 Futuro)
- [ ] Temptation Blocker (botón de emergencia)
- [ ] Buddy System (pares de accountability)
- [ ] Support Groups (mini-guilds)
- [ ] ML Pattern Detection
- [ ] Integration con apps externas (Screen Time, etc.)

---

**¿Próximo paso?** Implementar el UI en HabitsScreen para crear y manejar malos hábitos. 🚀
