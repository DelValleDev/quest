import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function PrivacyExplanationScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacidad y Datos</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🔒</Text>
          <Text style={styles.sectionTitle}>Tu Privacidad es Importante</Text>
          <Text style={styles.text}>
            En Quest, respetamos tu privacidad y cumplimos con GDPR y todas las regulaciones de
            protección de datos aplicables.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📊</Text>
          <Text style={styles.sectionTitle}>Datos que Recopilamos</Text>
          <Text style={styles.text}>
            • Información de cuenta (email, username){'\n'}
            • Progreso de tareas y hábitos{'\n'}
            • Estadísticas de uso (nivel, XP, coins){'\n'}
            • Preferencias de la aplicación{'\n'}
            • Datos de interacción social (amigos, guilds)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🎯</Text>
          <Text style={styles.sectionTitle}>Cómo Usamos tus Datos</Text>
          <Text style={styles.text}>
            • Proporcionar funcionalidad de la app{'\n'}
            • Personalizar tu experiencia{'\n'}
            • Generar recomendaciones con IA{'\n'}
            • Mejorar nuestros servicios{'\n'}
            • Cumplir obligaciones legales
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🔐</Text>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <Text style={styles.text}>
            Utilizamos encriptación de grado empresarial y medidas de seguridad avanzadas para
            proteger tus datos. Todos los datos sensibles están encriptados en tránsito y en
            reposo.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🤖</Text>
          <Text style={styles.sectionTitle}>Quest AI</Text>
          <Text style={styles.text}>
            Nuestro asistente de IA procesa tus datos de forma segura para proporcionar
            recomendaciones personalizadas. Los datos se anonimizan cuando es posible y nunca se
            comparten con terceros sin tu consentimiento.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>👥</Text>
          <Text style={styles.sectionTitle}>Compartir Datos</Text>
          <Text style={styles.text}>
            NO vendemos tus datos personales. Solo compartimos información cuando:{'\n'}
            • Tú nos das permiso explícito{'\n'}
            • Es requerido por ley{'\n'}
            • Es necesario para proveer el servicio
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>⚖️</Text>
          <Text style={styles.sectionTitle}>Tus Derechos (GDPR)</Text>
          <Text style={styles.text}>
            • Derecho de acceso a tus datos{'\n'}
            • Derecho de rectificación{'\n'}
            • Derecho al olvido (eliminación){'\n'}
            • Derecho a portabilidad de datos{'\n'}
            • Derecho a oponerte al procesamiento{'\n'}
            • Derecho a retirar consentimiento
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📥</Text>
          <Text style={styles.sectionTitle}>Exportar tus Datos</Text>
          <Text style={styles.text}>
            Puedes solicitar una copia completa de todos tus datos en cualquier momento. La
            exportación incluye:{'\n'}
            • Perfil y configuración{'\n'}
            • Tareas y hábitos{'\n'}
            • Progreso y estadísticas{'\n'}
            • Historial de actividad
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🗑️</Text>
          <Text style={styles.sectionTitle}>Eliminar tu Cuenta</Text>
          <Text style={styles.text}>
            Puedes eliminar tu cuenta permanentemente en cualquier momento. Esta acción:{'\n'}
            • Es irreversible{'\n'}
            • Elimina todos tus datos{'\n'}
            • Cancela suscripciones activas{'\n'}
            • Toma hasta 30 días en completarse
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>🍪</Text>
          <Text style={styles.sectionTitle}>Cookies y Tracking</Text>
          <Text style={styles.text}>
            Utilizamos cookies esenciales para funcionalidad básica. No usamos cookies de
            terceros para publicidad o tracking sin tu consentimiento explícito.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionIcon}>📧</Text>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <Text style={styles.text}>
            Para ejercer tus derechos o hacer preguntas sobre privacidad:{'\n\n'}
            Email: privacy@quest.app{'\n'}
            Tiempo de respuesta: 30 días máximo
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Última actualización: Diciembre 2025</Text>
          <Text style={styles.footerText}>Versión 1.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
});
