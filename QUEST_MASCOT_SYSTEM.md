# 🐉 Sistema de Mascota Quest

## Resumen

Se ha implementado completamente el sistema de mascota Quest con:
- ✅ 5 etapas de evolución basadas en el nivel del usuario
- ✅ 6 personalidades configurables
- ✅ 20+ outfits, sombreros y accesorios con diferentes raridades
- ✅ Sistema de compra con Quest Coins (QC)
- ✅ Mensajes contextuales según eventos
- ✅ Animaciones y feedback visual

---

## Componentes Implementados

### 1. Base de Datos (030_quest_mascot_system.sql)

#### Tablas Creadas:

**`user_quest_mascot`**
- Configuración única por usuario
- Campos: name, personality, evolution_stage, current_outfit_id, mood, interaction_count
- Actualización automática de evolución al subir de nivel

**`quest_outfits`**
- 20 outfits predeterminados con seed
- Categorías: outfit, hat, accessory, theme
- Raridades: common, rare, epic, legendary
- Precios en QC desde 50 hasta 1200

**`user_quest_outfits`**
- Relación many-to-many entre usuarios y outfits desbloqueados

**`quest_interactions`**
- Historial de mensajes y eventos con Quest
- Tipos: greeting, celebration, motivation, reminder, advice, reaction

#### Funciones:

**`update_quest_evolution()`**
- Trigger automático que actualiza la etapa de evolución cuando el usuario sube de nivel
- Stage 1: Nivel 1-9 (Bebé) 🐣
- Stage 2: Nivel 10-19 (Aprendiz) 🐥
- Stage 3: Nivel 20-34 (Guerrero) 🦅
- Stage 4: Nivel 35-49 (Maestro) 🦉
- Stage 5: Nivel 50+ (Leyenda) 🐉

**`initialize_quest_mascot()`**
- Crea automáticamente la mascota cuando se crea un nuevo perfil
- Valores por defecto: name='Quest', personality='balanced', stage=1

**`get_quest_message(p_user_id, p_event_type, p_context)`**
- Genera mensajes personalizados según:
  - Personalidad del usuario (6 tipos)
  - Evento disparador (quest_completed, level_up, streak_milestone, morning_greeting, etc.)
  - Contexto adicional (nivel alcanzado, días de racha, etc.)
- Guarda automáticamente en `quest_interactions`

---

### 2. Servicio TypeScript (questMascot.ts)

#### Funciones Principales:

```typescript
// Obtener mascota del usuario
getUserQuestMascot(userId: string): Promise<QuestMascot | null>

// Actualizar configuración (nombre, personalidad, outfit, mood)
updateQuestMascot(userId: string, updates: Partial<QuestMascot>): Promise<boolean>

// Obtener outfits disponibles según nivel y premium
getAvailableOutfits(evolutionStage: number, isPremium: boolean): Promise<QuestOutfit[]>

// Ver outfits desbloqueados
getUserUnlockedOutfits(userId: string): Promise<string[]>

// Comprar y equipar outfit (deducción automática de QC)
purchaseAndEquipOutfit(userId: string, outfitId: string, qcPrice: number): Promise<{success, message}>

// Obtener mensaje contextual
getQuestMessage(userId: string, eventType: string, context?: object): Promise<string>

// Historial de interacciones
getQuestInteractions(userId: string, limit?: number): Promise<QuestInteraction[]>
```

#### Utilidades:

```typescript
// Calcular stage según nivel
getEvolutionStageForLevel(level: number): QuestEvolutionStage

// Descripciones de evolución (bilingüe)
getEvolutionDescription(stage: QuestEvolutionStage, language: 'en' | 'es'): string

// Colores temáticos de rareza
getRarityColor(rarity: 'common' | 'rare' | 'epic' | 'legendary'): string
```

---

### 3. Componente Visual (QuestMascotDisplay.tsx)

#### Características:

✨ **Animaciones:**
- Rebote suave continuo (1 segundo arriba, 1 segundo abajo)
- Efecto de pulso al tocar (escala 1 → 1.2 → 1)
- Transiciones suaves con Easing

🎨 **Tamaños:**
- Small: 60x60px (emoji 36px)
- Medium: 100x100px (emoji 64px) - Default
- Large: 150x150px (emoji 96px)

💬 **Speech Bubble:**
- Bocadillo de diálogo opcional
- Posición: Arriba de la mascota
- Estilo: Bordes redondeados, sombra, cola triangular

🎭 **Estados Visuales:**
- Emoji dinámico según stage (🐣→🐥→🦅→🦉→🐉)
- Modificadores de mood (✨ excited, 💧 sad, 😴 tired, 👑 proud, 💔 disappointed)

#### Props:

```typescript
interface QuestMascotDisplayProps {
  mascot: QuestMascot;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  onTap?: () => void;
  showMessage?: boolean;
  message?: string;
}
```

---

### 4. Pantalla de Personalización (QuestCustomizationScreen.tsx)

#### Secciones:

**1. Header**
- Mascota en tamaño large con animación
- Nombre editable (tap para cambiar)
- Balance de QC visible

**2. Personalidades** (6 opciones)
- ⚖️ Equilibrado: Mensajes normales y amigables
- ⚡ Energético: ¡MUY EMOCIONADO! ¡TODO EN MAYÚSCULAS!
- 🧘 Calmado: Mensajes zen y tranquilos
- 😏 Sarcástico: Humor ácido pero motivador
- 💪 Motivacional: ¡TÚ PUEDES! ¡ERES INCREÍBLE!
- 🦉 Sabio: Frases filosóficas y profundas

**3. Tienda de Outfits**
- Tabs: Outfit | Hat | Accessory
- Grid 2 columnas
- Estados:
  - Equipado: Badge verde "Equipado"
  - Desbloqueado: Badge azul "Desbloqueado"
  - Bloqueado: Precio en QC (deshabilitado si no alcanza)
- Bordes de color según rareza
- Tap para equipar (si está desbloqueado) o comprar

---

## Outfits Seed

### Outfits Comunes (Stage 1+)
- 👕 Default Adventure (0 QC) - Gratis
- 👕 Casual Hoodie (100 QC)
- 👕 Gym Outfit (150 QC)
- 🧢 Baseball Cap (50 QC)
- 🕶️ Sunglasses (75 QC)
- 🎒 Backpack (100 QC)

### Outfits Raros (Stage 2+)
- 👘 Ninja Suit (300 QC)
- 📚 Scholar Robe (300 QC)
- 👔 Business Suit (350 QC)
- 🎩 Wizard Hat (200 QC)

### Outfits Épicos (Stage 3+)
- ⚔️ Knight Armor (500 QC)
- 🧙 Wizard Robes (500 QC)
- 🚀 Astronaut Suit (600 QC, Premium)
- 👑 Crown (400 QC)
- 🦋 Energy Wings (600 QC, Premium)

### Outfits Legendarios (Stage 4-5)
- 🐲 Dragon Knight (1000 QC, Premium, Stage 4+)
- 🌟 Archmage Robes (1000 QC, Premium, Stage 4+)
- 🌌 Galaxy Explorer (1200 QC, Premium, Stage 5)
- 😇 Halo (800 QC, Premium, Stage 4+)
- 🔥 Phoenix Wings (1000 QC, Premium, Stage 5)

---

## Integración con el Sistema

### Eventos Disparadores de Mensajes

```typescript
// Ejemplo de uso
import { getQuestMessage } from '../lib/questMascot';

// Al completar quest
const message = await getQuestMessage(userId, 'quest_completed', {
  title: 'Ejercicio 30 min'
});

// Al subir de nivel
const message = await getQuestMessage(userId, 'level_up', {
  level: 15
});

// Al alcanzar hito de racha
const message = await getQuestMessage(userId, 'streak_milestone', {
  days: 30
});

// Saludo matutino
const message = await getQuestMessage(userId, 'morning_greeting');
```

### Mostrar Mascota en Pantallas

```tsx
import QuestMascotDisplay from '../components/QuestMascotDisplay';
import { getUserQuestMascot } from '../lib/questMascot';

// En HomeScreen, ProfileScreen, etc.
const [mascot, setMascot] = useState<QuestMascot | null>(null);

useEffect(() => {
  const load = async () => {
    const data = await getUserQuestMascot(user.id);
    setMascot(data);
  };
  load();
}, []);

// Renderizar
{mascot && (
  <QuestMascotDisplay
    mascot={mascot}
    size="small"
    animated
    onTap={() => navigation.navigate('QuestCustomization')}
    showMessage={hasNewMessage}
    message="¡Buen trabajo hoy!"
  />
)}
```

---

## Próximos Pasos (Opcional)

### Mejoras Futuras:

1. **Animaciones Avanzadas**
   - Librería Lottie para animaciones complejas
   - Diferentes animaciones por mood (saltar cuando excited, dormir cuando tired)
   - Transiciones entre stages más elaboradas

2. **Más Outfits**
   - Colaboraciones con marcas (Nike, Adidas, etc.)
   - Outfits estacionales (Halloween, Navidad, etc.)
   - Outfits desbloqueables por logros específicos

3. **Interacciones Avanzadas**
   - Minijuegos con Quest (piedra/papel/tijera, etc.)
   - Sistema de afecto/amistad que desbloquea contenido
   - Quest puede "acompañarte" a hacer tareas (timer visual)

4. **IA Generativa**
   - Generar mensajes con GPT-4 en tiempo real
   - Personalidad que evoluciona según interacciones
   - Voz sintetizada para mensajes de audio

5. **Merchandising**
   - Peluches de Quest
   - Figuras coleccionables de cada stage
   - Stickers y emojis personalizados

---

## Conclusión

✅ **Sistema de Mascota Quest 100% funcional**

- Base de datos: 4 tablas + 3 funciones + triggers automáticos
- Frontend: 1 componente reutilizable + 1 pantalla completa
- Backend: 12+ funciones TypeScript
- Seed: 20 outfits con diferentes raridades
- Integración: Lista para usar en toda la app

**Próxima tarea:** Según el checklist, seguiría la **FASE 6: Sistema QC** que ya está completa, así que la siguiente pendiente es **FASE 7: Gamificación** (títulos según nivel, animaciones de desbloqueo).
