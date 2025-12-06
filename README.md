# 🎮 QUEST

**"Your life is the Quest. Your AI Coach guides you. Your friends are your allies."**

<div align="center">

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![Status](https://img.shields.io/badge/status-in%20development-orange.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

</div>

---

## 🚀 What is QUEST?

**QUEST** is a gamified personal coach that transforms your goals into a multiplayer game. An AI analyzes who you are today and who you want to become, creating a day-by-day plan to get you there.

It's **Duolingo + Strava + Habitica + Personal Coach**, but for **YOUR ENTIRE LIFE**.

### 🎯 Elevator Pitch

Complete daily missions, challenge your friends with real stakes, maintain epic streaks, and literally become a better version of yourself. Not just tracking—it's **guided transformation**.

---

## ✨ Main Features

### 🤖 AI Personal Coach
- **Personalized transformation plan** (180 days)
- **Adaptive daily challenges** based on your routine
- **Pattern analysis** and progress tracking
- **24/7 conversational chat** with your AI coach

### 📊 Multidimensional System (6 Pillars)
- 💪 **PHYSICAL**: Exercise, nutrition, health
- 🧠 **MENTAL**: Learning, productivity
- ❤️ **SOCIAL**: Relationships, community
- 💼 **PROFESSIONAL**: Career, projects
- 🕉️ **SPIRITUAL**: Inner peace, purpose
- 🎨 **CREATIVE**: Art, hobbies

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

**QUEST** es un coach personal gamificado que transforma tus metas en un juego multijugador. Una IA analiza quién eres hoy y quién quieres ser, creando un plan día a día para llegar ahí.

Es **Duolingo + Strava + Habitica + Coach Personal**, pero para **TODA tu vida**.

### 🎯 Elevator Pitch

Completa misiones diarias, reta a tus amigos con stakes reales, mantén rachas épicas, y conviértete literalmente en una mejor versión de ti mismo. No solo tracking—es **transformación guiada**.

---

## ✨ Características Principales

### 🤖 IA Coach Personal
- **Plan de transformación personalizado** (180 días)
- **Desafíos diarios adaptativos** basados en tu rutina
- **Análisis de patrones** y seguimiento de progreso
- **Chat conversacional 24/7** con tu coach IA

### 📊 Sistema Multidimensional (6 Pilares)
- 💪 **FÍSICO**: Ejercicio, nutrición, salud
- 🧠 **MENTAL**: Aprendizaje, productividad
- ❤️ **SOCIAL**: Relaciones, comunidad
- 💼 **PROFESIONAL**: Carrera, proyectos
- 🕉️ **ESPIRITUAL**: Paz interior, propósito
- 🎨 **CREATIVO**: Arte, hobbies

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
