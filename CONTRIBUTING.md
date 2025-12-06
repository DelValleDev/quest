# Contributing to QUEST 🎮

First of all, thank you for your interest in contributing to QUEST! 💪

## 🤝 Code of Conduct

This project and all its participants are governed by our code of conduct. By participating, you are expected to uphold this code.

## 🚀 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report, please verify that a similar one doesn't already exist. When creating a report, include as many details as possible:

- **Clear and descriptive title**
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Device information** (model, OS, app version)

### 💡 Suggesting Enhancements

Suggestions are welcome! To propose an enhancement:

1. Open an issue with the `enhancement` tag
2. Clearly describe the functionality
3. Explain why it would be useful for users
4. If possible, include mockups or diagrams

### 📝 Pull Requests

1. Fork the repository
2. Create a branch from `develop`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Make your changes following the style guides
4. Make sure tests pass
5. Commit with clear messages:
   ```bash
   git commit -m "feat: add notification system"
   ```
6. Push to your fork
7. Open a Pull Request to `develop`

## 📋 Style Guides

### Code

- **TypeScript** is mandatory
- Use **ESLint** and **Prettier** (configured in the project)
- Variable and function names in **camelCase**
- React components in **PascalCase**
- Component files: `MyComponent.tsx`
- Hook files: `useMyHook.ts`

### Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Format changes (don't affect code)
- `refactor:` Code refactoring
- `test:` Add or modify tests
- `chore:` Maintenance tasks

### Branch Structure

- `main` - Stable production
- `develop` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

## 🏗️ Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/quest.git

# Navigate to app directory
cd quest/app

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run in development
npx expo start
```

## ❓ Questions?

If you have questions, open an issue with the `question` tag or contact the development team.

---

Thank you for helping make QUEST better! 🙏

---

---

# Contribuir a QUEST 🎮 (Español)

¡Primero que todo, gracias por tu interés en contribuir a QUEST! 💪

## 🤝 Código de Conducta

Este proyecto y todos sus participantes están regidos por nuestro código de conducta. Al participar, se espera que respetes este código.

## 🚀 ¿Cómo puedo contribuir?

### 🐛 Reportar Bugs

Antes de crear un reporte de bug, por favor verifica que no exista ya uno similar. Cuando crees un reporte, incluye todos los detalles posibles:

- **Título claro y descriptivo**
- **Pasos para reproducir** el problema
- **Comportamiento esperado** vs comportamiento actual
- **Screenshots** si aplica
- **Información del dispositivo** (modelo, OS, versión de la app)

### 💡 Sugerir Mejoras

Las sugerencias son bienvenidas. Para proponer una mejora:

1. Abre un issue con el tag `enhancement`
2. Describe claramente la funcionalidad
3. Explica por qué sería útil para los usuarios
4. Si es posible, incluye mockups o diagramas

### 📝 Pull Requests

1. Fork el repositorio
2. Crea una rama desde `develop`:
   ```bash
   git checkout -b feature/mi-nueva-feature
   ```
3. Haz tus cambios siguiendo las guías de estilo
4. Asegúrate de que los tests pasen
5. Commit con mensajes claros:
   ```bash
   git commit -m "feat: agregar sistema de notificaciones"
   ```
6. Push a tu fork
7. Abre un Pull Request hacia `develop`

## 📋 Guías de Estilo

### Código

- **TypeScript** es obligatorio
- Usa **ESLint** y **Prettier** (configurados en el proyecto)
- Nombres de variables y funciones en **camelCase**
- Componentes React en **PascalCase**
- Archivos de componentes: `MiComponente.tsx`
- Archivos de hooks: `useMiHook.ts`

### Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan código)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

### Estructura de Ramas

- `main` - Producción estable
- `develop` - Desarrollo activo
- `feature/*` - Nuevas funcionalidades
- `fix/*` - Correcciones de bugs
- `hotfix/*` - Correcciones urgentes en producción

## 🏗️ Setup de Desarrollo

```bash
# Clonar tu fork
git clone https://github.com/TU-USUARIO/quest.git

# Navegar al directorio de la app
cd quest/app

# Instalar dependencias
npm install

# Configurar environment
cp .env.example .env

# Correr en desarrollo
npx expo start
```

## ❓ ¿Preguntas?

Si tienes dudas, abre un issue con el tag `question` o contacta al equipo de desarrollo.

---

¡Gracias por ayudar a hacer QUEST mejor! 🙏
