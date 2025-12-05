import { I18n } from "i18n-js";
import * as Localization from "expo-localization";

// Translations
const translations = {
  en: {
    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      done: "Done",
      retry: "Retry",
      search: "Search",
      noResults: "No results found",
      seeAll: "See all",
      setup: "Setup",
    },

    // Auth
    auth: {
      welcome: "Welcome to Quest",
      signIn: "Sign In",
      signUp: "Sign Up",
      signOut: "Sign Out",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      forgotPassword: "Forgot Password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      continueWithGoogle: "Continue with Google",
      continueWithApple: "Continue with Apple",
      orContinueWith: "Or continue with",
    },

    // Onboarding
    onboarding: {
      welcome: {
        title: "Your Life is the Quest",
        subtitle:
          "Transform your goals into an epic adventure with your AI Coach",
      },
      slides: {
        slide1: {
          title: "Your Life is the Quest",
          subtitle:
            "Transform your daily habits into an epic adventure. Level up every aspect of your life.",
        },
        slide2: {
          title: "AI Coach Guides You",
          subtitle:
            "Quest, your personal AI companion, creates a custom plan to become your best self.",
        },
        slide3: {
          title: "Friends Are Your Allies",
          subtitle:
            "Challenge friends, join raids, and hold each other accountable with real stakes.",
        },
      },
      pillars: {
        title: "Build Your Character",
        subtitle:
          "Develop 6 pillars of your life: Physical, Mental, Social, Professional, Emotional, and Spiritual",
        chooseFocus: "Choose Your Focus",
        selectAreas:
          "Select the areas of your life you want to improve. You can change this later.",
        selected: "selected",
        minAssessment: "min assessment",
        eg: "e.g.",
        morePillars:
          "More pillars = More potential points! Each pillar adds habits and rewards.",
        selectAtLeastOne: "Select at least 1 pillar",
        tip: "💡 Tip: Start with 2-3 pillars and add more later",
      },
      challenges: {
        title: "Accept Challenges",
        subtitle: "Complete daily quests, challenge friends, and earn rewards",
      },
      getStarted: "Get Started",
      skip: "Skip",
    },

    // Assessment
    assessment: {
      title: "Personality Assessment",
      subtitle: "Help Quest understand you better",
      question: "Question",
      of: "of",
      physical: "Physical",
      mental: "Mental",
      social: "Social",
      professional: "Professional",
      emotional: "Emotional",
      spiritual: "Spiritual",
      complete: "Complete Assessment",
      analyzing: "Analyzing your responses...",
      answerRequired: "Answer Required",
      selectOption: "Please select an option",
      analyzingAI: "🤖 Analyzing your answers with AI...",
      savingProfile: "💾 Saving your profile...",
      creatingQuests: "🎯 Creating your first quests...",
      designingPaths: "🗺️ Designing your life paths...",
      settingHabits: "📅 Setting up your habits...",
      organizingHabits: "📅 Organizing your habits...",
      completedTitle: "Assessment Complete! 🎉",
      assignedClass: "Your assigned class",
      letsGo: "Let's Go!",
    },

    // Aspirations
    aspirations: {
      failedToLoad: "Failed to load questions",
      failedToSave: "Failed to save your aspirations",
      skipTitle: "Skip Aspirations?",
      skipMessage: "You can always set your goals later from Settings.",
      skip: "Skip",
      loadingJourney: "Loading your journey...",
      noQuestions: "No aspirational questions available",
      title: "Your Aspirations",
      question: "ASPIRATION",
      placeholder: "Type your answer...",
      selectAll: "Select all that apply",
      complete: "Complete 🎉",
    },

    // Home
    home: {
      greeting: {
        morning: "Good morning",
        afternoon: "Good afternoon",
        evening: "Good evening",
      },
      level: "Level",
      dailyQuests: "Daily Quests",
      activeRaids: "Active Raids",
      friendActivity: "Friend Activity",
      quickActions: "Quick Actions",
      checkIn: "Daily Check-in",
      viewAll: "View All",
      noQuests: "No quests for today",
      questsCompleted: "quests completed",
    },

    // Daily Quests
    quests: {
      title: "Daily Quests",
      generateWithAI: "Generate with AI",
      regenerate: "Regenerate",
      howAreYouFeeling: "How are you feeling today?",
      mood: {
        great: "Great",
        good: "Good",
        okay: "Okay",
        bad: "Bad",
        terrible: "Terrible",
      },
      difficulty: {
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        legendary: "Legendary",
      },
      xpReward: "XP Reward",
      complete: "Complete",
      completed: "Completed",
      timeLeft: "Time left",
      streak: "Streak",
      days: "days",
    },

    // Quest Coach (AI)
    coach: {
      title: "Quest Coach",
      placeholder: "Ask Quest anything...",
      thinking: "Thinking...",
      greeting:
        "Hey! I'm Quest, your personal AI coach. How can I help you today?",
      suggestions: {
        motivation: "I need motivation",
        plan: "Help me plan my day",
        advice: "Give me advice",
        progress: "Show my progress",
      },
    },

    // Challenges
    challenges: {
      title: "Challenges",
      create: "Create Challenge",
      active: "Active",
      completed: "Completed",
      failed: "Failed",
      personal: "Personal",
      vsFreinds: "1v1 Duels",
      group: "Group Raids",
      stake: "Stake",
      duration: "Duration",
      participants: "Participants",
      join: "Join",
      leave: "Leave",
    },

    // Duels
    duels: {
      title: "Duels",
      challenge: "Challenge Friend",
      pending: "Pending",
      active: "Active",
      won: "Won",
      lost: "Lost",
      vs: "VS",
      waiting: "Waiting for opponent...",
      yourTurn: "Your turn",
      theirTurn: "Their turn",
    },

    // Raids
    raids: {
      title: "Raids",
      create: "Create Raid",
      join: "Join Raid",
      participants: "Participants",
      goal: "Goal",
      progress: "Progress",
      deadline: "Deadline",
      bossHealth: "Boss Health",
    },

    // Social
    social: {
      title: "Friends",
      addFriend: "Add Friend",
      friendCode: "Friend Code",
      yourCode: "Your Code",
      copyCode: "Copy Code",
      codeCopied: "Code copied!",
      pending: "Pending",
      requests: "Requests",
      accept: "Accept",
      decline: "Decline",
      remove: "Remove Friend",
      noFriends: "No friends yet",
      searchPlaceholder: "Search by username or code...",
    },

    // Leaderboard
    leaderboard: {
      title: "Leaderboard",
      weekly: "Weekly",
      monthly: "Monthly",
      allTime: "All Time",
      rank: "Rank",
      you: "You",
      xp: "XP",
      streak: "Streak",
    },

    // Profile
    profile: {
      title: "Profile",
      editProfile: "Edit Profile",
      stats: "Stats",
      achievements: "Achievements",
      settings: "Settings",
      class: "Class",
      joinedOn: "Joined on",
      totalXP: "Total XP",
      questsCompleted: "Quests Completed",
      longestStreak: "Longest Streak",
    },

    // Shop
    shop: {
      title: "Shop",
      balance: "Balance",
      qc: "QC",
      buy: "Buy",
      owned: "Owned",
      equip: "Equip",
      equipped: "Equipped",
      categories: {
        all: "All",
        avatars: "Avatars",
        themes: "Themes",
        boosts: "Boosts",
        cosmetics: "Cosmetics",
      },
    },

    // Achievements
    achievements: {
      title: "Achievements",
      unlocked: "Unlocked",
      locked: "Locked",
      progress: "Progress",
      rarity: {
        common: "Common",
        rare: "Rare",
        epic: "Epic",
        legendary: "Legendary",
      },
    },

    // Agenda
    agenda: {
      title: "Agenda",
      connectCalendar: "Connect Calendar",
      googleCalendar: "Google Calendar",
      appleCalendar: "Apple Calendar",
      noEvents: "No events today",
      freeTime: "Free time slots",
      scheduledQuests: "Scheduled Quests",
    },

    // Settings
    settings: {
      title: "Settings",
      account: "Account",
      notifications: "Notifications",
      appearance: "Appearance",
      language: "Language",
      darkMode: "Dark Mode",
      privacy: "Privacy",
      help: "Help & Support",
      about: "About",
      version: "Version",
      deleteAccount: "Delete Account",
    },

    // Classes
    classes: {
      warrior: {
        name: "Warrior",
        description: "Focused on physical challenges and discipline",
      },
      sage: {
        name: "Sage",
        description: "Dedicated to knowledge and mental growth",
      },
      connector: {
        name: "Connector",
        description: "Masters of social skills and relationships",
      },
      creator: {
        name: "Creator",
        description: "Artists and innovators who build new things",
      },
      achiever: {
        name: "Achiever",
        description: "Goal-oriented professionals who get things done",
      },
      monk: {
        name: "Monk",
        description: "Seekers of inner peace and spiritual growth",
      },
    },

    // Pillars
    pillars: {
      physical: "Physical",
      mental: "Mental",
      social: "Social",
      professional: "Professional",
      emotional: "Emotional",
      spiritual: "Spiritual",
    },

    // Errors
    errors: {
      generic: "Something went wrong",
      network: "Network error. Check your connection.",
      auth: "Authentication failed",
      notFound: "Not found",
      unauthorized: "Unauthorized access",
      invalidEmail: "Invalid email address",
      weakPassword: "Password is too weak",
      emailInUse: "Email already in use",
      loadQuestions: "Failed to load assessment questions",
    },
  },

  es: {
    // Common
    common: {
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      cancel: "Cancelar",
      save: "Guardar",
      delete: "Eliminar",
      edit: "Editar",
      close: "Cerrar",
      confirm: "Confirmar",
      back: "Atrás",
      next: "Siguiente",
      done: "Listo",
      retry: "Reintentar",
      search: "Buscar",
      noResults: "No se encontraron resultados",
      seeAll: "Ver todo",
      setup: "Configuración",
    },

    // Auth
    auth: {
      welcome: "Bienvenido a Quest",
      signIn: "Iniciar Sesión",
      signUp: "Registrarse",
      signOut: "Cerrar Sesión",
      email: "Correo electrónico",
      password: "Contraseña",
      confirmPassword: "Confirmar Contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      continueWithGoogle: "Continuar con Google",
      continueWithApple: "Continuar con Apple",
      orContinueWith: "O continuar con",
    },

    // Onboarding
    onboarding: {
      welcome: {
        title: "Tu Vida es la Quest",
        subtitle:
          "Transforma tus metas en una aventura épica con tu Coach de IA",
      },
      slides: {
        slide1: {
          title: "Tu Vida es la Quest",
          subtitle:
            "Transforma tus hábitos diarios en una aventura épica. Sube de nivel cada aspecto de tu vida.",
        },
        slide2: {
          title: "Tu Coach de IA te Guía",
          subtitle:
            "Quest, tu compañero personal de IA, crea un plan personalizado para convertirte en tu mejor versión.",
        },
        slide3: {
          title: "Los Amigos son tus Aliados",
          subtitle:
            "Reta a amigos, únete a raids y manténganse responsables con apuestas reales.",
        },
      },
      pillars: {
        title: "Construye tu Personaje",
        subtitle:
          "Desarrolla 6 pilares de tu vida: Físico, Mental, Social, Profesional, Emocional y Espiritual",
        chooseFocus: "Elige Tu Enfoque",
        selectAreas:
          "Selecciona las áreas de tu vida que quieres mejorar. Puedes cambiar esto después.",
        selected: "seleccionados",
        minAssessment: "min evaluación",
        eg: "ej.",
        morePillars:
          "¡Más pilares = Más puntos potenciales! Cada pilar añade hábitos y recompensas.",
        selectAtLeastOne: "Selecciona al menos 1 pilar",
        tip: "💡 Tip: Empieza con 2-3 pilares y añade más después",
      },
      challenges: {
        title: "Acepta Desafíos",
        subtitle: "Completa misiones diarias, reta a amigos y gana recompensas",
      },
      getStarted: "Comenzar",
      skip: "Omitir",
    },

    // Assessment
    assessment: {
      title: "Evaluación de Personalidad",
      subtitle: "Ayuda a Quest a conocerte mejor",
      question: "Pregunta",
      of: "de",
      physical: "Físico",
      mental: "Mental",
      social: "Social",
      professional: "Profesional",
      emotional: "Emocional",
      spiritual: "Espiritual",
      complete: "Completar Evaluación",
      analyzing: "Analizando tus respuestas...",
      answerRequired: "Respuesta requerida",
      selectOption: "Por favor selecciona una opción",
      analyzingAI: "🤖 Analizando tus respuestas con IA...",
      savingProfile: "💾 Guardando tu perfil...",
      creatingQuests: "🎯 Creando tus primeras misiones...",
      designingPaths: "🗺️ Diseñando tus caminos de vida...",
      settingHabits: "📅 Configurando tus hábitos...",
      organizingHabits: "📅 Organizando tus hábitos...",
      completedTitle: "¡Assessment Completado! 🎉",
      assignedClass: "Tu clase asignada",
      letsGo: "¡Comenzar!",
    },

    // Aspirations
    aspirations: {
      failedToLoad: "Error al cargar las preguntas",
      failedToSave: "Error al guardar tus aspiraciones",
      skipTitle: "¿Saltar aspiraciones?",
      skipMessage:
        "Siempre puedes definir tus metas después desde Configuración.",
      skip: "Saltar",
      loadingJourney: "Cargando tu viaje...",
      noQuestions: "No hay preguntas de aspiraciones disponibles",
      title: "Tus Aspiraciones",
      question: "ASPIRACIÓN",
      placeholder: "Escribe tu respuesta...",
      selectAll: "Selecciona todas las que apliquen",
      complete: "Completar 🎉",
    },

    // Home
    home: {
      greeting: {
        morning: "Buenos días",
        afternoon: "Buenas tardes",
        evening: "Buenas noches",
      },
      level: "Nivel",
      dailyQuests: "Misiones Diarias",
      activeRaids: "Raids Activas",
      friendActivity: "Actividad de Amigos",
      quickActions: "Acciones Rápidas",
      checkIn: "Check-in Diario",
      viewAll: "Ver Todo",
      noQuests: "No hay misiones para hoy",
      questsCompleted: "misiones completadas",
    },

    // Daily Quests
    quests: {
      title: "Misiones Diarias",
      generateWithAI: "Generar con IA",
      regenerate: "Regenerar",
      howAreYouFeeling: "¿Cómo te sientes hoy?",
      mood: {
        great: "Genial",
        good: "Bien",
        okay: "Regular",
        bad: "Mal",
        terrible: "Terrible",
      },
      difficulty: {
        easy: "Fácil",
        medium: "Medio",
        hard: "Difícil",
        legendary: "Legendario",
      },
      xpReward: "Recompensa XP",
      complete: "Completar",
      completed: "Completada",
      timeLeft: "Tiempo restante",
      streak: "Racha",
      days: "días",
    },

    // Quest Coach (AI)
    coach: {
      title: "Quest Coach",
      placeholder: "Pregúntale a Quest lo que sea...",
      thinking: "Pensando...",
      greeting:
        "¡Hola! Soy Quest, tu coach personal de IA. ¿Cómo puedo ayudarte hoy?",
      suggestions: {
        motivation: "Necesito motivación",
        plan: "Ayúdame a planear mi día",
        advice: "Dame un consejo",
        progress: "Muestra mi progreso",
      },
    },

    // Challenges
    challenges: {
      title: "Desafíos",
      create: "Crear Desafío",
      active: "Activos",
      completed: "Completados",
      failed: "Fallidos",
      personal: "Personal",
      vsFreinds: "Duelos 1v1",
      group: "Raids Grupales",
      stake: "Apuesta",
      duration: "Duración",
      participants: "Participantes",
      join: "Unirse",
      leave: "Salir",
    },

    // Duels
    duels: {
      title: "Duelos",
      challenge: "Retar a Amigo",
      pending: "Pendientes",
      active: "Activos",
      won: "Ganados",
      lost: "Perdidos",
      vs: "VS",
      waiting: "Esperando al oponente...",
      yourTurn: "Tu turno",
      theirTurn: "Su turno",
    },

    // Raids
    raids: {
      title: "Raids",
      create: "Crear Raid",
      join: "Unirse a Raid",
      participants: "Participantes",
      goal: "Objetivo",
      progress: "Progreso",
      deadline: "Fecha límite",
      bossHealth: "Salud del Jefe",
    },

    // Social
    social: {
      title: "Amigos",
      addFriend: "Agregar Amigo",
      friendCode: "Código de Amigo",
      yourCode: "Tu Código",
      copyCode: "Copiar Código",
      codeCopied: "¡Código copiado!",
      pending: "Pendientes",
      requests: "Solicitudes",
      accept: "Aceptar",
      decline: "Rechazar",
      remove: "Eliminar Amigo",
      noFriends: "Aún no tienes amigos",
      searchPlaceholder: "Buscar por usuario o código...",
    },

    // Leaderboard
    leaderboard: {
      title: "Clasificación",
      weekly: "Semanal",
      monthly: "Mensual",
      allTime: "Histórico",
      rank: "Posición",
      you: "Tú",
      xp: "XP",
      streak: "Racha",
    },

    // Profile
    profile: {
      title: "Perfil",
      editProfile: "Editar Perfil",
      stats: "Estadísticas",
      achievements: "Logros",
      settings: "Configuración",
      class: "Clase",
      joinedOn: "Se unió el",
      totalXP: "XP Total",
      questsCompleted: "Misiones Completadas",
      longestStreak: "Racha Más Larga",
    },

    // Shop
    shop: {
      title: "Tienda",
      balance: "Saldo",
      qc: "QC",
      buy: "Comprar",
      owned: "Adquirido",
      equip: "Equipar",
      equipped: "Equipado",
      categories: {
        all: "Todo",
        avatars: "Avatares",
        themes: "Temas",
        boosts: "Mejoras",
        cosmetics: "Cosméticos",
      },
    },

    // Achievements
    achievements: {
      title: "Logros",
      unlocked: "Desbloqueados",
      locked: "Bloqueados",
      progress: "Progreso",
      rarity: {
        common: "Común",
        rare: "Raro",
        epic: "Épico",
        legendary: "Legendario",
      },
    },

    // Agenda
    agenda: {
      title: "Agenda",
      connectCalendar: "Conectar Calendario",
      googleCalendar: "Google Calendar",
      appleCalendar: "Apple Calendar",
      noEvents: "No hay eventos hoy",
      freeTime: "Espacios libres",
      scheduledQuests: "Misiones Programadas",
    },

    // Settings
    settings: {
      title: "Configuración",
      account: "Cuenta",
      notifications: "Notificaciones",
      appearance: "Apariencia",
      language: "Idioma",
      darkMode: "Modo Oscuro",
      privacy: "Privacidad",
      help: "Ayuda y Soporte",
      about: "Acerca de",
      version: "Versión",
      deleteAccount: "Eliminar Cuenta",
    },

    // Classes
    classes: {
      warrior: {
        name: "Guerrero",
        description: "Enfocado en desafíos físicos y disciplina",
      },
      sage: {
        name: "Sabio",
        description: "Dedicado al conocimiento y crecimiento mental",
      },
      connector: {
        name: "Conector",
        description: "Maestro de habilidades sociales y relaciones",
      },
      creator: {
        name: "Creador",
        description: "Artistas e innovadores que construyen cosas nuevas",
      },
      achiever: {
        name: "Triunfador",
        description: "Profesionales orientados a metas que logran resultados",
      },
      monk: {
        name: "Monje",
        description: "Buscadores de paz interior y crecimiento espiritual",
      },
    },

    // Pillars
    pillars: {
      physical: "Físico",
      mental: "Mental",
      social: "Social",
      professional: "Profesional",
      emotional: "Emocional",
      spiritual: "Espiritual",
    },

    // Errors
    errors: {
      generic: "Algo salió mal",
      network: "Error de red. Verifica tu conexión.",
      auth: "Error de autenticación",
      notFound: "No encontrado",
      unauthorized: "Acceso no autorizado",
      invalidEmail: "Correo electrónico inválido",
      weakPassword: "La contraseña es muy débil",
      emailInUse: "El correo ya está en uso",
      loadQuestions: "Error al cargar las preguntas",
    },
  },
};

// Create i18n instance
const i18n = new I18n(translations);

// Set the locale to device locale, fallback to 'en'
const getDeviceLocale = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0].languageCode) {
      return locales[0].languageCode;
    }
    return "en";
  } catch {
    return "en";
  }
};

i18n.locale = getDeviceLocale();
i18n.enableFallback = true;
i18n.defaultLocale = "en";

// Helper function to change language manually
export const setLanguage = (lang: "en" | "es") => {
  i18n.locale = lang;
};

// Helper function to get current language
export const getCurrentLanguage = (): string => {
  return i18n.locale;
};

// Shorthand for translations
export const t = (key: string, options?: object): string => {
  return i18n.t(key, options);
};

export default i18n;
