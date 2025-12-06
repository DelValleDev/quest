import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Friend {
  id: string;
  username: string;
  display_name: string;
  level: number;
  avatar_url?: string;
  status: 'pending' | 'accepted';
}

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, []);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('friendships')
        .select(`
          friend:friend_id (
            id,
            username,
            display_name,
            level,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      setFriends(data?.map(f => ({ ...f.friend, status: 'accepted' as const })) || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('friendships')
        .select(`
          user:user_id (
            id,
            username,
            display_name,
            level,
            avatar_url
          )
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      setPendingRequests(data?.map(f => ({ ...f.user, status: 'pending' as const })) || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !searchUsername.trim()) {
      Alert.alert('Error', 'Ingresa un username');
      return;
    }

    try {
      // Buscar usuario por username
      const { data: targetUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', searchUsername.trim())
        .single();

      if (!targetUser) {
        Alert.alert('Error', 'Usuario no encontrado');
        return;
      }

      // Crear amistad
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUser.id,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Éxito', 'Solicitud de amistad enviada');
      setSearchUsername('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const acceptRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) throw error;

      Alert.alert('Éxito', 'Solicitud aceptada');
      fetchFriends();
      fetchPendingRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const rejectRequest = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error) throw error;

      fetchPendingRequests();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Amigos ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Solicitudes ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.tabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>
            + Agregar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Friends List */}
        {activeTab === 'friends' && (
          <View>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>No tienes amigos aún. ¡Agrega algunos!</Text>
            ) : (
              friends.map(friend => (
                <View key={friend.id} style={styles.friendCard}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {friend.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.display_name}</Text>
                    <Text style={styles.friendUsername}>@{friend.username}</Text>
                    <Text style={styles.friendLevel}>Nivel {friend.level}</Text>
                  </View>
                  <TouchableOpacity style={styles.messageButton}>
                    <Text style={styles.messageButtonText}>💬</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Pending Requests */}
        {activeTab === 'pending' && (
          <View>
            {pendingRequests.length === 0 ? (
              <Text style={styles.emptyText}>No tienes solicitudes pendientes</Text>
            ) : (
              pendingRequests.map(request => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {request.display_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{request.display_name}</Text>
                    <Text style={styles.friendUsername}>@{request.username}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => acceptRequest(request.id)}
                    >
                      <Text style={styles.acceptButtonText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => rejectRequest(request.id)}
                    >
                      <Text style={styles.rejectButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Add Friend */}
        {activeTab === 'add' && (
          <View>
            <Text style={styles.addTitle}>Buscar por username</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Ej: john_doe"
              value={searchUsername}
              onChangeText={setSearchUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendFriendRequest}>
              <Text style={styles.sendButtonText}>Enviar Solicitud</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 También puedes agregar amigos escaneando su código QR desde su perfil
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  tabTextActive: {
    color: '#667eea',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    paddingVertical: 40,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  friendLevel: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 20,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  addTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  infoText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
});
