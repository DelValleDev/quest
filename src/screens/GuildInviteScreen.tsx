import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, Clipboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-native-qrcode-svg';

type GuildInviteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GuildInvite'>;
type GuildInviteScreenRouteProp = RouteProp<RootStackParamList, 'GuildInvite'>;

interface Props {
  navigation: GuildInviteScreenNavigationProp;
  route: GuildInviteScreenRouteProp;
}

interface Guild {
  id: string;
  name: string;
  icon: string;
  member_count: number;
  max_members: number;
}

export default function GuildInviteScreen({ navigation, route }: Props) {
  const { guildId } = route.params;
  const { user } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuildData();
    generateInviteCode();
  }, []);

  const fetchGuildData = async () => {
    try {
      const { data, error } = await supabase
        .from('guilds')
        .select(`
          id,
          name,
          icon,
          max_members,
          guild_members (count)
        `)
        .eq('id', guildId)
        .single();

      if (error) throw error;

      setGuild({
        id: data.id,
        name: data.name,
        icon: data.icon,
        member_count: data.guild_members[0]?.count || 0,
        max_members: data.max_members,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    try {
      // Verificar si ya existe un código de invitación activo
      const { data: existing } = await supabase
        .from('guild_invitations')
        .select('code')
        .eq('guild_id', guildId)
        .eq('created_by', user?.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existing) {
        setInviteCode(existing.code);
        return;
      }

      // Generar nuevo código (8 caracteres alfanuméricos)
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Guardar en base de datos
      const { error } = await supabase
        .from('guild_invitations')
        .insert({
          guild_id: guildId,
          code,
          created_by: user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
          max_uses: 50,
        });

      if (error) throw error;

      setInviteCode(code);
    } catch (error: any) {
      console.error('Error generating invite code:', error);
    }
  };

  const handleCopyLink = async () => {
    const inviteLink = `quest://guild/invite/${inviteCode}`;
    await Clipboard.setString(inviteLink);
    Alert.alert('¡Copiado!', 'El link de invitación ha sido copiado al portapapeles');
  };

  const handleShareLink = async () => {
    const inviteLink = `quest://guild/invite/${inviteCode}`;
    const message = `¡Únete a mi guild "${guild?.name}" ${guild?.icon} en Quest!\n\nCódigo: ${inviteCode}\nLink: ${inviteLink}`;

    try {
      await Share.share({
        message,
        title: `Invitación a ${guild?.name}`,
      });
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  if (loading || !guild) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitar al Guild</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Guild Info */}
        <View style={styles.guildCard}>
          <Text style={styles.guildIcon}>{guild.icon}</Text>
          <Text style={styles.guildName}>{guild.name}</Text>
          <Text style={styles.guildMembers}>
            {guild.member_count} / {guild.max_members} miembros
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={styles.sectionTitle}>Escanea el código QR</Text>
          <View style={styles.qrCode}>
            {inviteCode && (
              <QRCode
                value={`quest://guild/invite/${inviteCode}`}
                size={200}
                backgroundColor="white"
              />
            )}
          </View>
          <Text style={styles.qrDescription}>
            Pídele a tu amigo que escanee este código desde la app Quest
          </Text>
        </View>

        {/* Invite Code */}
        <View style={styles.codeContainer}>
          <Text style={styles.sectionTitle}>Código de invitación</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{inviteCode}</Text>
          </View>
          <Text style={styles.codeDescription}>
            Comparte este código. Válido por 7 días.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyLink}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>Copiar Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShareLink}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionText}>Compartir</Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 ¿Sabías que...?</Text>
          <Text style={styles.infoText}>
            • Los códigos expiran en 7 días{'\n'}
            • Máximo 50 personas pueden usar el mismo código{'\n'}
            • Los miembros nuevos pueden ver el historial del guild
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  guildCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 3,
  },
  guildIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  guildName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  guildMembers: {
    fontSize: 14,
    color: '#6c757d',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  qrCode: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    marginBottom: 12,
  },
  qrDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  codeBox: {
    backgroundColor: '#f0f2ff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    letterSpacing: 4,
  },
  codeDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
});
