import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

interface AIActionModalProps {
  visible: boolean;
  onClose: () => void;
  action: 'creating' | 'modifying' | 'analyzing' | 'completed';
  itemsCreated?: Array<{
    id: string;
    type: 'task' | 'habit' | 'challenge' | 'life_path' | 'guild' | 'insight';
    title: string;
    onNavigate: () => void;
  }>;
  message?: string;
}

export default function AIActionModal({
  visible,
  onClose,
  action,
  itemsCreated = [],
  message,
}: AIActionModalProps) {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Animación de entrada con bounce
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animación de salida
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getActionConfig = () => {
    switch (action) {
      case 'creating':
        return {
          icon: '✨',
          title: 'Quest está creando...',
          color: '#8B5CF6',
          showLottie: true,
        };
      case 'modifying':
        return {
          icon: '🔧',
          title: 'Quest está modificando...',
          color: '#3B82F6',
          showLottie: true,
        };
      case 'analyzing':
        return {
          icon: '🔮',
          title: 'Quest está analizando...',
          color: '#06B6D4',
          showLottie: true,
        };
      case 'completed':
        return {
          icon: '🎉',
          title: '¡Listo!',
          color: '#10B981',
          showLottie: false,
        };
    }
  };

  const config = getActionConfig();

  const getItemIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      task: 'checkmark-circle',
      habit: 'repeat',
      challenge: 'trophy',
      life_path: 'map',
      guild: 'people',
      insight: 'bulb',
    };
    return iconMap[type] || 'star';
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Header con icono */}
          <View style={[styles.header, { backgroundColor: config.color }]}>
            <Text style={styles.headerIcon}>{config.icon}</Text>
            <Text style={styles.headerTitle}>{config.title}</Text>
          </View>

          {/* Lottie Animation durante proceso */}
          {config.showLottie && (
            <View style={styles.lottieContainer}>
              {/* Aquí iría el Lottie de "magic happening" */}
              <View style={styles.magicPlaceholder}>
                <Animated.View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: config.color + '20',
                    transform: [
                      {
                        rotate: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                />
              </View>
            </View>
          )}

          {/* Message */}
          {message && (
            <View style={styles.messageContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>
          )}

          {/* Items creados (solo en completed) */}
          {action === 'completed' && itemsCreated.length > 0 && (
            <View style={styles.itemsContainer}>
              <Text style={styles.itemsTitle}>
                {itemsCreated.length === 1
                  ? 'Creé esto para ti:'
                  : `Creé ${itemsCreated.length} cosas para ti:`}
              </Text>

              {itemsCreated.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => {
                    onClose();
                    item.onNavigate();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIconContainer}>
                    <Ionicons name={getItemIcon(item.type) as any} size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemType}>
                      {item.type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Close button (solo en completed) */}
          {action === 'completed' && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lottieContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  magicPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  itemsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
