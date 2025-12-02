# Contributing to QUEST 🎮

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

# Instalar dependencias
cd quest
npm install

# Configurar environment
cp .env.example .env

# Correr en desarrollo
npm run start
```

## ❓ ¿Preguntas?

Si tienes dudas, abre un issue con el tag `question` o contacta al equipo de desarrollo.

---

¡Gracias por ayudar a hacer QUEST mejor! 🙏
