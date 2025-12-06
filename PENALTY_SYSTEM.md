# Sistema de Penalizaciones - Quest App

## 📋 Resumen

El sistema de penalizaciones automáticamente deduce XP de los usuarios que no completan sus hábitos o quests diarios. **Las Quest Coins nunca se pierden**, solo XP.

## 🎯 Características Implementadas

### 1. Base de Datos (Migration 028)
- **Tabla `penalty_logs`**: Registra todas las penalizaciones aplicadas
- **Columnas en `profiles`**:
  - `total_penalties`: Contador total de penalizaciones
  - `penalty_xp_lost`: XP total perdido por penalizaciones
- **Función SQL `apply_daily_penalties()`**: Aplica penalizaciones automáticamente
- **Función SQL `get_user_penalties()`**: Obtiene historial de penalizaciones

### 2. Servicio TypeScript (`penalties.ts`)
- `getUserPenaltyStats()`: Obtiene estadísticas de penalizaciones del usuario
- `checkPendingPenalties()`: Verifica tareas incompletas actuales
- `applyDailyPenalties()`: Trigger manual (para testing)

### 3. Componentes UI

#### PenaltyNotification (Modal)
- Se muestra cuando el usuario tiene penalizaciones del día actual
- Lista hasta 3 penalizaciones más recientes
- Muestra XP total perdido
- Educativo: recuerda que las QC no se pierden

#### PenaltyWarningBanner (Banner)
- Se muestra después de las 6 PM si hay tareas incompletas
- Indica cuántos hábitos/quests faltan
- Muestra XP potencial que se perdería
- Actualiza cada 30 minutos
- Desaparece si se completan todas las tareas

### 4. Integración en HomeScreen
- Banner de advertencia en la parte superior
- Modal de notificación al inicio del día si hay penalizaciones de ayer
- Se ejecuta automáticamente al cargar la pantalla

## 🔧 Configuración del Cron Job

Para que las penalizaciones se apliquen automáticamente cada día, necesitas configurar un **Cron Job** en Supabase.

### ✅ Opción 1: Usar Migration 029 (MÁS FÁCIL)

**Ya está incluida en el proyecto:**

1. **Ejecutar las migraciones**:
   ```bash
   cd supabase
   supabase db push
   ```

2. La migración `029_pg_cron_setup.sql` automáticamente:
   - Habilita la extensión `pg_cron`
   - Configura el job diario a las 00:30 UTC
   - Ejecuta `apply_daily_penalties()` todos los días

3. **Verificar que el job esté activo**:
   ```sql
   -- En SQL Editor de Supabase
   SELECT * FROM cron.job;
   ```
   Deberías ver: `apply-daily-penalties` con schedule `30 0 * * *`

4. **Ver logs de ejecución**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'apply-daily-penalties')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

### Opción 2: Configuración Manual (si la migration falla)

Si Supabase no tiene pg_cron habilitado o necesitas configurarlo manualmente:

1. **En el Dashboard de Supabase**:
   - Ve a Database → Extensions
   - Busca y habilita `pg_cron`

2. **En SQL Editor, ejecuta**:
   ```sql
   SELECT cron.schedule(
     'apply-daily-penalties',
     '30 0 * * *',
     'SELECT apply_daily_penalties();'
   );
   ```

### Opción 2: Supabase Edge Function (Alternativa)

Si no tienes acceso a pg_cron, puedes usar una Edge Function:

1. **Crear Edge Function**:
   ```typescript
   // supabase/functions/apply-penalties/index.ts
   import { createClient } from '@supabase/supabase-js';

   Deno.serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     );

     const { error } = await supabase.rpc('apply_daily_penalties');

     if (error) {
       return new Response(JSON.stringify({ error: error.message }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' },
       });
     }

     return new Response(JSON.stringify({ success: true }), {
       headers: { 'Content-Type': 'application/json' },
     });
   });
   ```

2. **Desplegar la función**:
   ```bash
   supabase functions deploy apply-penalties
   ```

3. **Configurar cron externo** (GitHub Actions, Vercel Cron, etc.):
   ```yaml
   # .github/workflows/daily-penalties.yml
   name: Apply Daily Penalties
   on:
     schedule:
       - cron: '30 0 * * *'  # 00:30 UTC diario
   
   jobs:
     apply-penalties:
       runs-on: ubuntu-latest
       steps:
         - name: Call Supabase Function
           run: |
             curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/apply-penalties \
               -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
   ```

### Opción 3: Testing Manual

Para probar la función manualmente:

```typescript
// En tu app o en un script de testing
import { PenaltyService } from './src/lib/penalties';

const result = await PenaltyService.applyDailyPenalties();
console.log(result); // { success: true, message: '...' }
```

## 📊 Cálculo de Penalizaciones

### Hábitos
- **Base XP**:
  - Diario: 20 XP
  - Semanal: 50 XP
  - Custom: 30 XP
- **Penalización**: 50% del Base XP
- **Ejemplo**: Hábito diario no completado = -10 XP

### Quests
- **Base XP**: `xp_reward` del quest
- **Penalización**: 50% del `xp_reward`
- **Ejemplo**: Quest de 40 XP no completado = -20 XP

### Protecciones
- El XP nunca baja de 0
- El nivel mínimo es 1
- Las Quest Coins **NUNCA** se pierden
- Solo se penalizan tareas que existían antes de ayer

## 🔍 Monitoreo

### Ver penalizaciones de un usuario
```sql
SELECT * FROM penalty_logs 
WHERE user_id = 'USER_UUID'
ORDER BY penalty_date DESC 
LIMIT 20;
```

### Estadísticas globales
```sql
SELECT 
  penalty_date,
  COUNT(*) as total_penalties,
  SUM(xp_lost) as total_xp_lost,
  penalty_type
FROM penalty_logs
WHERE penalty_date >= CURRENT_DATE - 30
GROUP BY penalty_date, penalty_type
ORDER BY penalty_date DESC;
```

### Usuarios más penalizados
```sql
SELECT 
  p.display_name,
  pr.total_penalties,
  pr.penalty_xp_lost
FROM profiles pr
JOIN profiles p ON p.id = pr.id
WHERE pr.total_penalties > 0
ORDER BY pr.total_penalties DESC
LIMIT 10;
```

## 🚨 Importante

1. **Configurar el Cron Job** es esencial para que funcione en producción
2. **Zona horaria**: Ajusta el horario del cron según tu timezone
3. **Testing**: Prueba primero con `applyDailyPenalties()` manualmente
4. **Logs**: Monitorea los logs de Supabase para detectar errores

## 📱 UX/UI

### Flujo del Usuario

1. **Durante el día (antes de 6 PM)**:
   - Usuario ve sus hábitos/quests normales
   - Sin avisos de penalización

2. **Final del día (después de 6 PM)**:
   - Aparece banner amarillo si hay tareas incompletas
   - Banner muestra XP potencial que se perdería
   - Banner desaparece si completa todas las tareas

3. **Al día siguiente (mañana)**:
   - Si hubo penalizaciones ayer, modal rojo al abrir app
   - Modal muestra lista de tareas incompletas y XP perdido
   - Usuario ve su XP reducido en el perfil

### Ejemplo de Mensaje
```
⚠️ Penalización Aplicada
Tareas incompletas de ayer

-30 XP

🎯 Meditar 10 minutos (-10 XP)
⚔️ Hacer ejercicio (-15 XP)
🎯 Leer 20 páginas (-5 XP)

Completa tus hábitos y quests para evitar perder XP.
¡Las Quest Coins nunca se pierden!
```

## 🎯 Próximos Pasos

- [ ] Implementar notificaciones push antes de medianoche
- [ ] Dashboard de estadísticas de penalizaciones
- [ ] Sistema de "perdón" (skip días sin penalización) para Premium
- [ ] Análisis de patrones de incumplimiento para coaching personalizado
