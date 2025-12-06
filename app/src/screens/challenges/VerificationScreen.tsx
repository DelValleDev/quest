import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

interface Props {
  route: {
    params: {
      challengeId: string;
      challengeName: string;
    };
  };
}

export default function VerificationScreen({ route }: Props) {
  const { user } = useAuthStore();
  const { challengeId, challengeName } = route.params;
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || locationPermission.status !== 'granted') {
      Alert.alert('Permisos', 'Se requieren permisos de cámara y ubicación');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        
        // Get location
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleUpload = async () => {
    if (!user || !image) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const response = await fetch(image);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-evidence')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification-evidence')
        .getPublicUrl(fileName);

      // Save verification record
      await supabase.from('verification_evidence').insert({
        user_id: user.id,
        challenge_id: challengeId,
        evidence_type: 'photo',
        file_url: urlData.publicUrl,
        metadata: {
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
          timestamp: new Date().toISOString()
        }
      });

      Alert.alert('✅ Subido', 'Verificación completada');
      setImage(null);
      setLocation(null);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo subir la evidencia');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Verificación</Text>
        <Text style={styles.subtitle}>{challengeName}</Text>
      </View>

      <View style={styles.content}>
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} />
            
            {location && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationText}>
                  📍 Ubicación verificada
                </Text>
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.retakeButton]}
                onPress={handleTakePhoto}
              >
                <Text style={styles.buttonText}>Tomar otra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.uploadButton]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Subir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <Text style={styles.cameraIcon}>📸</Text>
            <Text style={styles.cameraText}>Toma una foto para verificar</Text>
            
            <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
              <Text style={styles.cameraButtonText}>Abrir Cámara</Text>
            </TouchableOpacity>

            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>💡 Tips:</Text>
              <Text style={styles.tipText}>• Asegúrate de buena iluminación</Text>
              <Text style={styles.tipText}>• Muestra claramente la actividad</Text>
              <Text style={styles.tipText}>• La ubicación se registra automáticamente</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1E' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#9CA3AF' },
  content: { flex: 1, padding: 20 },
  cameraContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  cameraIcon: { fontSize: 80, marginBottom: 16 },
  cameraText: { fontSize: 18, color: '#9CA3AF', marginBottom: 32, textAlign: 'center' },
  cameraButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  cameraButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  tips: { marginTop: 40, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 20, width: '100%' },
  tipsTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  tipText: { fontSize: 14, color: '#9CA3AF', marginBottom: 8, lineHeight: 20 },
  previewContainer: { flex: 1 },
  preview: { width: '100%', height: '70%', borderRadius: 12, marginBottom: 16 },
  locationBadge: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignSelf: 'center', marginBottom: 16 },
  locationText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  buttons: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  retakeButton: { backgroundColor: '#374151' },
  uploadButton: { backgroundColor: '#8B5CF6' },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }
});
