# 🎮 QUEST

**"Your life is the Quest. Your AI Coach guides you. Your friends are your allies."**

<div align="center">

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-orange.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

</div>

---

## 🚀 What is QUEST?

**QUEST** is the best app for transforming your life. An AI coach that truly knows you—analyzing who you are today and who you want to become—creating a personalized day-by-day plan to get you there.

### Why QUEST is the Best App for Personal Growth

- 🧠 **AI that actually understands you** - Not generic advice. Your coach learns from your assessment, habits, and progress
- 🎮 **Makes self-improvement fun** - Daily quests, streaks, XP, levels, and rewards that keep you engaged
- 👥 **Social accountability that works** - Challenge friends, form guilds, and grow together
- 📊 **Holistic approach** - 6 life pillars ensure balanced growth, not just one area
- 🎯 **Personalized difficulty** - Challenges adapt to YOUR level and schedule
- 🏆 **Real progress tracking** - See your transformation with visual analytics

### 🎯 Our Mission

Help you become the best version of yourself—not by overwhelming you with tasks, but by guiding you one quest at a time. Complete daily missions, maintain epic streaks, challenge your friends, and literally level up your life.

---

## ✨ Main Features

### 🤖 AI Personal Coach
- **Personalized transformation plan** based on your assessment
- **Adaptive daily challenges** that fit your routine
- **Pattern analysis** and intelligent progress tracking  
- **24/7 conversational chat** - ask anything, get personalized guidance

### 📊 Multidimensional System (6 Pillars)
- 💪 **PHYSICAL**: Exercise, nutrition, sleep, health
- 🧠 **MENTAL**: Learning, focus, productivity, mindfulness
- ❤️ **SOCIAL**: Relationships, communication, community
- 💼 **PROFESSIONAL**: Career, projects, skills, goals
- ✨ **SPIRITUAL**: Inner peace, purpose, gratitude
- 🎨 **CREATIVE**: Art, hobbies, self-expression

### ⚔️ Challenge System
- **Personal challenges** with streak system
- **1v1 Duels** with real stakes
- **Group challenges** (competitive and cooperative)
- **Voting system** for creative punishments

### 💎 Internal Economy (Quest Coins)
- Earn **QC** by completing challenges
- Spend on **customization** (150+ items)
- **Boosts and power-ups**
- **Transfers** between friends

### 🎮 Deep Gamification
- **Independent level system** per pillar (1-200)
- **50+ unlockable achievements**
- **Temporary badges** (daily, weekly, monthly)
- **Visual hexagon** of personal development

### 🛤️ Life Paths
- **Long-term goals** (1-2 years)
- Divided into **small phases** (atomic habits)
- Examples: "Sedentary → Marathon Runner", "Beginner → Bilingual"
- **Progress tracking** with milestones

### 🔒 Anti-Cheat Verification
- **Auto-verification** with HealthKit/Google Fit
- **Photo/video verification** when needed
- **Trust Score** per user

---

## 🏗️ Tech Stack

### Frontend
- **React Native** + Expo (SDK 54)
- **TypeScript**
- React Query + Zustand
- Reanimated (60fps animations)

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- Real-time subscriptions
- Storage for verifications
- Integrated Auth

### AI/ML
- **OpenAI GPT-4** API
- Intelligent caching
- Smart rate limiting

### Integrations
- HealthKit (iOS) / Google Fit (Android)
- Google Calendar / Apple Calendar
- OneSignal (Push Notifications)

---

## 📱 Current Development Status

> ⚠️ **This project is in active development**

### ✅ Completed
- Core authentication system
- Assessment questionnaire (40 questions)
- 6-pillar system with levels
- Daily challenges system
- Social system (friends, groups)
- Shop with 150+ items
- 1v1 duels and group raids
- AI Coach integration
- HealthKit/Google Fit integration
- RevenueCat payment system
- Internationalization (EN/ES)

### 🚧 In Progress
- **Visual polish and UI refinements**
- User experience improvements
- Additional animations
- App Store/Play Store submission preparation

### 📋 Upcoming
- Global community features
- Brand collaborations
- Public API
- Web app

---

## 🛠️ Installation and Development

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account
- OpenAI API account

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/DelValleDev/quest.git

# Navigate to app directory
cd quest/app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Run in development
npx expo start
```

### Project Structure

```
quest/
├── app/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── screens/        # App screens
│   │   ├── services/       # APIs and services
│   │   ├── utils/          # Utilities
│   │   ├── hooks/          # Custom hooks
│   │   ├── store/          # Global state (Zustand)
│   │   └── types/          # TypeScript types
│   └── assets/             # Images, fonts
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
└── docs/                   # Documentation
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Process
1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is **proprietary software**. See [LICENSE](./LICENSE) for more details.

**⚠️ IMPORTANT:** This code is for visualization/demonstration purposes only. Copying, modifying, distributing, or using this software without written authorization is not permitted.

---

## 📞 Contact

For questions, feedback, or collaboration:
- **Email**: samuelrestrepodev@gmail.com
- **GitHub**: [@DelValleDev](https://github.com/DelValleDev)

---

<div align="center">

**Made with 💪🧠❤️ for those who want to level up their lives.**

</div>

---

---

# 🎮 QUEST (Español)

**"Tu vida es la Quest. Tu IA Coach te guía. Tus amigos son tus aliados."**

---

## 🚀 ¿Qué es QUEST?

**QUEST** es la mejor app para transformar tu vida. Un coach de IA que realmente te conoce—analiza quién eres hoy y quién quieres ser—creando un plan personalizado día a día para llegar ahí.

### Por qué QUEST es la Mejor App para Crecer

- 🧠 **IA que realmente te entiende** - No consejos genéricos. Tu coach aprende de tu evaluación, hábitos y progreso
- 🎮 **Hace divertido el auto-mejoramiento** - Quests diarias, rachas, XP, niveles y recompensas que te mantienen enganchado
- 👥 **Responsabilidad social que funciona** - Reta a amigos, forma guildas, y crezcan juntos
- 📊 **Enfoque holístico** - 6 pilares de vida aseguran crecimiento equilibrado
- 🎯 **Dificultad personalizada** - Los retos se adaptan a TU nivel y horario
- 🏆 **Progreso real medible** - Ve tu transformación con análisis visuales

### 🎯 Nuestra Misión

Ayudarte a convertirte en la mejor versión de ti mismo—no abrumándote con tareas, sino guiándote una quest a la vez. Completa misiones diarias, mantén rachas épicas, reta a tus amigos, y literalmente sube de nivel tu vida.

---

## ✨ Características Principales

### 🤖 IA Coach Personal
- **Plan de transformación personalizado** basado en tu evaluación
- **Desafíos diarios adaptativos** que se ajustan a tu rutina
- **Análisis de patrones** y seguimiento inteligente de progreso
- **Chat conversacional 24/7** - pregunta lo que sea, recibe guía personalizada

### 📊 Sistema Multidimensional (6 Pilares)
- 💪 **FÍSICO**: Ejercicio, nutrición, sueño, salud
- 🧠 **MENTAL**: Aprendizaje, enfoque, productividad, mindfulness
- ❤️ **SOCIAL**: Relaciones, comunicación, comunidad
- 💼 **PROFESIONAL**: Carrera, proyectos, habilidades, metas
- ✨ **ESPIRITUAL**: Paz interior, propósito, gratitud
- 🎨 **CREATIVO**: Arte, hobbies, expresión personal

### ⚔️ Sistema de Retos
- **Retos personales** con sistema de rachas
- **Duelos 1v1** con stakes reales
- **Retos grupales** (competitivos y cooperativos)
- **Sistema de votación** para castigos creativos

### 💎 Economía Interna (Quest Coins)
- Gana **QC** completando retos
- Gasta en **personalización** (150+ items)
- **Boosts y power-ups**
- **Transferencias** entre amigos

### 🎮 Gamificación Profunda
- **Sistema de niveles independiente** por pilar (1-200)
- **50+ logros** desbloqueables
- **Badges temporales** (diarios, semanales, mensuales)
- **Hexágono visual** del desarrollo personal

### 🛤️ Life Paths
- **Metas de largo plazo** (1-2 años)
- Divididas en **fases pequeñas** (hábitos atómicos)
- Ejemplos: "Sedentario → Maratonista", "Principiante → Bilingüe"
- **Tracking de progreso** con milestones

### 🔒 Verificación Anti-Trampa
- **Auto-verificación** con HealthKit/Google Fit
- **Verificación por foto/video** cuando es necesario
- **Trust Score** por usuario

---

## 🏗️ Stack Técnico

### Frontend
- **React Native** + Expo (SDK 54)
- **TypeScript**
- React Query + Zustand
- Reanimated (animaciones 60fps)

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- Subscripciones en tiempo real
- Storage para verificaciones
- Auth integrado

### IA/ML
- **OpenAI GPT-4** API
- Caching inteligente
- Rate limiting inteligente

### Integraciones
- HealthKit (iOS) / Google Fit (Android)
- Google Calendar / Apple Calendar
- OneSignal (Push Notifications)

---

## 📱 Estado Actual del Desarrollo

> ⚠️ **Este proyecto está en desarrollo activo**

### ✅ Completado
- Sistema de autenticación
- Cuestionario de assessment (40 preguntas)
- Sistema de 6 pilares con niveles
- Sistema de desafíos diarios
- Sistema social (amigos, grupos)
- Tienda con 150+ items
- Duelos 1v1 y raids grupales
- Integración de AI Coach
- Integración HealthKit/Google Fit
- Sistema de pagos RevenueCat
- Internacionalización (EN/ES)

### 🚧 En Progreso
- **Pulido visual y refinamientos de UI**
- Mejoras en experiencia de usuario
- Animaciones adicionales
- Preparación para App Store/Play Store

### 📋 Próximamente
- Comunidad global
- Colaboraciones con marcas
- API pública
- Web app

---

## 🛠️ Instalación y Desarrollo

### Requisitos Previos
- Node.js 18+
- Expo CLI
- Cuenta en Supabase
- Cuenta en OpenAI API

### Setup Inicial

```bash
# Clonar el repositorio
git clone https://github.com/DelValleDev/quest.git

# Navegar al directorio de la app
cd quest/app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# Correr en desarrollo
npx expo start
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles.

---

## 📄 Licencia

Este proyecto es **software propietario**. Ver [LICENSE](./LICENSE) para más detalles.

---

## 📞 Contacto

Para preguntas, feedback o colaboración:
- **Email**: samuelrestrepodev@gmail.com
- **GitHub**: [@DelValleDev](https://github.com/DelValleDev)

---

<div align="center">

**Hecho con 💪🧠❤️ para quienes quieren subir de nivel en la vida.**

</div>
