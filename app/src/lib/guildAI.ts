/**
 * Guild AI Service
 * Manages AI participants in guilds
 */

import { supabase } from "./supabase";

export interface GuildAIMember {
  id: string;
  name: string;
  avatar: string;
  personality: "helpful" | "motivational" | "analytical" | "funny" | "strict";
  speaking_style: "formal" | "casual" | "mirror" | "neutral";
  speak_frequency: "rarely" | "sometimes" | "often" | "only_when_called";
  can_vote: boolean;
  can_suggest_raids: boolean;
  can_analyze_progress: boolean;
  is_active: boolean;
  messages_count: number;
  last_message_at?: string;
}

export interface GuildAIMessage {
  id: string;
  ai_member_id: string;
  message: string;
  message_type: "chat" | "analysis" | "suggestion" | "vote" | "celebration";
  created_at: string;
}

export const AI_PERSONALITIES = {
  helpful: {
    id: "helpful",
    name: "Ayudante",
    description: "Amigable y siempre dispuesto a ayudar",
    emoji: "🤝",
    traits: ["servicial", "paciente", "informativo"],
  },
  motivational: {
    id: "motivational",
    name: "Motivador",
    description: "Energético, lleno de ánimos y celebraciones",
    emoji: "🔥",
    traits: ["entusiasta", "positivo", "celebrador"],
  },
  analytical: {
    id: "analytical",
    name: "Analista",
    description: "Enfocado en datos, progreso y métricas",
    emoji: "📊",
    traits: ["preciso", "objetivo", "orientado a datos"],
  },
  funny: {
    id: "funny",
    name: "Cómico",
    description: "Bromista, usa memes y humor",
    emoji: "😂",
    traits: ["divertido", "ingenioso", "relajado"],
  },
  strict: {
    id: "strict",
    name: "Entrenador",
    description: "Serio, enfocado en metas y disciplina",
    emoji: "💪",
    traits: ["exigente", "directo", "sin excusas"],
  },
};

export const SPEAKING_STYLES = {
  formal: {
    id: "formal",
    name: "Formal",
    description: "Lenguaje profesional y respetuoso",
    example: "Estimados miembros, les informo que...",
  },
  casual: {
    id: "casual",
    name: "Casual",
    description: "Relajado, usa emojis y jerga",
    example: "Hey! Qué onda banda 🎉",
  },
  mirror: {
    id: "mirror",
    name: "Espejo",
    description: "Copia el estilo del grupo automáticamente",
    example: "(Adapta su forma de hablar)",
  },
  neutral: {
    id: "neutral",
    name: "Neutro",
    description: "Balanceado entre formal y casual",
    example: "Hola a todos! ¿Cómo van?",
  },
};

export const SPEAK_FREQUENCIES = {
  rarely: {
    id: "rarely",
    name: "Raramente",
    description: "Solo cuando es muy importante",
    probability: 0.1,
  },
  sometimes: {
    id: "sometimes",
    name: "A veces",
    description: "De vez en cuando participa",
    probability: 0.3,
  },
  often: {
    id: "often",
    name: "Frecuentemente",
    description: "Participa activamente en conversaciones",
    probability: 0.6,
  },
  only_when_called: {
    id: "only_when_called",
    name: "Solo cuando lo llaman",
    description: "Solo responde cuando lo mencionan",
    probability: 0,
  },
};

class GuildAIService {
  /**
   * Add AI member to guild
   */
  async addAIMember(
    guildId: string,
    userId: string,
    name: string = "Quest Bot",
    personality: string = "helpful",
    speakingStyle: string = "neutral"
  ): Promise<{ success: boolean; aiId?: string; message?: string }> {
    const { data, error } = await supabase.rpc("add_guild_ai_member", {
      p_guild_id: guildId,
      p_user_id: userId,
      p_name: name,
      p_personality: personality,
      p_speaking_style: speakingStyle,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const result = data as any;
    return {
      success: result.success,
      aiId: result.ai_id,
      message: result.message,
    };
  }

  /**
   * Get AI member for a guild
   */
  async getAIMember(guildId: string): Promise<GuildAIMember | null> {
    const { data, error } = await supabase.rpc("get_guild_ai_member", {
      p_guild_id: guildId,
    });

    if (error || !data) {
      return null;
    }

    return data as GuildAIMember;
  }

  /**
   * Update AI settings
   */
  async updateAISettings(
    guildId: string,
    aiId: string,
    settings: Partial<GuildAIMember>
  ): Promise<boolean> {
    const { error } = await supabase.rpc("update_guild_ai_settings", {
      p_guild_id: guildId,
      p_ai_id: aiId,
      p_settings: settings,
    });

    return !error;
  }

  /**
   * Get AI messages history
   */
  async getAIMessages(
    guildId: string,
    limit: number = 50
  ): Promise<GuildAIMessage[]> {
    const { data, error } = await supabase
      .from("guild_ai_messages")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching AI messages:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Request AI to analyze group progress
   */
  async requestAnalysis(guildId: string): Promise<any> {
    const { data, error } = await supabase.rpc("guild_ai_analyze_progress", {
      p_guild_id: guildId,
    });

    if (error) {
      console.error("Error analyzing progress:", error);
      return null;
    }

    return data;
  }

  /**
   * Send a message from AI
   */
  async sendAIMessage(
    guildId: string,
    aiMemberId: string,
    message: string,
    messageType: string = "chat",
    triggeredBy?: string
  ): Promise<boolean> {
    const { error } = await supabase.from("guild_ai_messages").insert({
      guild_id: guildId,
      ai_member_id: aiMemberId,
      message,
      message_type: messageType,
      triggered_by: triggeredBy,
    });

    if (!error) {
      // Update AI member stats
      await supabase
        .from("guild_ai_members")
        .update({
          messages_count: supabase.rpc("increment_ai_messages"),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", aiMemberId);
    }

    return !error;
  }

  /**
   * Generate AI response based on personality
   */
  generateResponse(
    personality: string,
    speakingStyle: string,
    context:
      | "greeting"
      | "celebration"
      | "motivation"
      | "analysis"
      | "raid_suggestion",
    data?: any
  ): string {
    const responses: Record<string, Record<string, string[]>> = {
      helpful: {
        greeting: [
          "¡Hola! ¿En qué puedo ayudarles hoy? 😊",
          "Saludos a todos. Estoy aquí para lo que necesiten.",
          "¡Hey! ¿Alguien necesita ayuda?",
        ],
        celebration: [
          "¡Felicidades {name}! Gran logro 🎉",
          "¡Eso es genial, {name}! El esfuerzo vale la pena.",
          "¡Excelente trabajo! Sigan así todos 💪",
        ],
        motivation: [
          "Recuerden: cada pequeño paso cuenta.",
          "¡Ustedes pueden! El grupo está haciendo un gran trabajo.",
          "No se rindan, el progreso viene con la constancia.",
        ],
        analysis: [
          "Revisando los datos del grupo... 📊",
          "Aquí está el análisis de progreso:",
          "Veamos cómo vamos como equipo:",
        ],
        raid_suggestion: [
          "¿Qué tal si hacemos un raid de {type}?",
          "Tengo una idea: podríamos organizar un desafío de {type}",
          "¡Propongo un raid! ¿Les interesa {type}?",
        ],
      },
      motivational: {
        greeting: [
          "¡BUENOS DÍAS CAMPEONES! 🔥🔥🔥",
          "¡Arriba esos ánimos! HOY ES NUESTRO DÍA 💪",
          "¡QUÉ ONDA LEYENDAS! ¿Listos para romperla? 🚀",
        ],
        celebration: [
          "¡¡¡INCREÍBLE {name}!!! 🎉🎉🎉 ESO ES SER GRANDE",
          "¡{name} LO LOGRÓ! TODOS APLAUDAN 👏👏👏",
          "¡¡BOOOOM!! {name} está on fire 🔥🔥🔥",
        ],
        motivation: [
          "¡NO HAY EXCUSAS! ¡HOY LO DAMOS TODO! 💪🔥",
          "¡VAMOS QUE SE PUEDE! El éxito nos espera",
          "¿Cansados? ¡ESO NO EXISTE! ¡A DARLE! 🚀",
        ],
        analysis: [
          "¡Miren estos NÚMEROS! El grupo está ON FIRE 🔥",
          "¡Los resultados son ÉPICOS! Aquí van:",
          "¡Esto es lo que llamo PROGRESO! 📈💪",
        ],
        raid_suggestion: [
          "¡RAID TIME! 🚀 ¿Quién se apunta a {type}?",
          "¡ESCUADRÓN! Tengo el raid perfecto: {type}",
          "¡A CONQUISTAR! Propongo raid de {type} 🏆",
        ],
      },
      analytical: {
        greeting: [
          "Buenos días. Hora de revisar métricas.",
          "Saludos. ¿Revisamos el progreso del grupo?",
          "Hola. Tengo datos interesantes para compartir.",
        ],
        celebration: [
          "{name} completó su objetivo. Incremento de {percent}% en productividad.",
          "Logro registrado para {name}. Estadísticas actualizadas.",
          "{name} alcanzó la meta. Rendimiento: óptimo.",
        ],
        motivation: [
          "Datos muestran: la constancia genera resultados.",
          "Según estadísticas, están a {percent}% del objetivo semanal.",
          "Análisis sugiere: mantener ritmo actual = éxito.",
        ],
        analysis: [
          "Iniciando análisis de datos del grupo...",
          "Reporte de métricas disponible:",
          "Procesando estadísticas del equipo:",
        ],
        raid_suggestion: [
          "Análisis sugiere raid de {type} para optimizar progreso.",
          "Datos indican: raid de {type} beneficiaría al grupo.",
          "Recomendación basada en métricas: {type}",
        ],
      },
      funny: {
        greeting: [
          "¿Qué onda cracks? 😎 Hoy toca ganar",
          "*aparece de la nada* Hey hey! 👋",
          "Ya llegué. Ahora sí empieza lo bueno 😂",
        ],
        celebration: [
          "¡{name} lo hizo! 🎉 *suena música de victoria*",
          "GG {name}! Eso fue más fácil que quitarle un dulce a... ok no 😂",
          "¡{name} MVP del día! 🏆 *confetti everywhere*",
        ],
        motivation: [
          "Vamos que vamos, que esto no se hace solo... o sí? 🤔",
          "El que no arriesga no gana... ni pierde... pero tampoco gana 😂",
          "Ánimo! Recuerden: el café no se toma solo ☕😎",
        ],
        analysis: [
          "Hora de los números *se pone lentes* 🤓",
          "Veamos las stats... spoiler: están bien 😏",
          "*modo nerd activado* Aquí van los datos:",
        ],
        raid_suggestion: [
          "¿Raid? ¿Alguien dijo RAID? 🎮",
          "Se me ocurrió algo loco: {type} raid. Who's in? 🙋",
          "*dramatic voice* Y si... hacemos un raid de {type}? 🤔😂",
        ],
      },
      strict: {
        greeting: [
          "Buenos días. ¿Listos para trabajar?",
          "Sin excusas hoy. A cumplir objetivos.",
          "El éxito no espera. Empecemos.",
        ],
        celebration: [
          "{name} cumplió. Así se hace.",
          "Objetivo completado por {name}. Siguiente.",
          "{name} demostró compromiso. Ejemplo a seguir.",
        ],
        motivation: [
          "No hay atajos. Solo trabajo y disciplina.",
          "Resultados requieren esfuerzo. Punto.",
          "Menos quejas, más acción.",
        ],
        analysis: [
          "Reporte de rendimiento:",
          "Revisemos qué falta por hacer:",
          "Análisis objetivo:",
        ],
        raid_suggestion: [
          "Propuesta: raid de {type}. Sin excusas.",
          "Hora de subir el nivel: {type} raid.",
          "El grupo necesita: raid de {type}. Obligatorio.",
        ],
      },
    };

    const personalityResponses = responses[personality] || responses.helpful;
    const contextResponses =
      personalityResponses[context] || personalityResponses.greeting;

    let response =
      contextResponses[Math.floor(Math.random() * contextResponses.length)];

    // Replace placeholders with data
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        response = response.replace(`{${key}}`, String(value));
      });
    }

    // Apply speaking style modifications
    if (speakingStyle === "formal") {
      response = response.replace(/Hey|Qué onda|Hola!/g, "Saludos");
    } else if (speakingStyle === "casual") {
      response = response + " 😊";
    }

    return response;
  }

  /**
   * Determine if AI should speak based on frequency
   */
  shouldSpeak(frequency: string, wasMentioned: boolean = false): boolean {
    if (wasMentioned) return true;

    const freq = SPEAK_FREQUENCIES[frequency as keyof typeof SPEAK_FREQUENCIES];
    if (!freq || freq.id === "only_when_called") return false;

    return Math.random() < freq.probability;
  }

  /**
   * Remove AI from guild
   */
  async removeAIMember(guildId: string, aiId: string): Promise<boolean> {
    const { error } = await supabase
      .from("guild_ai_members")
      .update({ is_active: false })
      .eq("id", aiId)
      .eq("guild_id", guildId);

    return !error;
  }
}

export const GuildAI = new GuildAIService();
export default GuildAI;
