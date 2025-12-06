import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  category: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category_id: string;
}

export default function SupportScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'contact'>('faq');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqItems, setFAQItems] = useState<FAQItem[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');

  const categories = [
    { value: 'bug', label: '🐛 Bug' },
    { value: 'feature_request', label: '💡 Feature Request' },
    { value: 'payment', label: '💳 Pago' },
    { value: 'account', label: '👤 Cuenta' },
    { value: 'general', label: '❓ General' },
  ];

  const mockFAQ = [
    {
      id: '1',
      question: '¿Cómo funciona el sistema de XP?',
      answer: 'Ganas XP completando tareas, manteniendo rachas y participando en guilds. Cada 1000 XP subes de nivel.',
      category_id: '1'
    },
    {
      id: '2',
      question: '¿Qué incluye Quest Premium?',
      answer: 'Premium incluye: Quest AI ilimitado, Quest Finanzas, análisis avanzado, Guild Wars, sistema de clases, 500 QC al mes y mucho más.',
      category_id: '2'
    },
    {
      id: '3',
      question: '¿Quest AI puede ver mis mensajes privados?',
      answer: 'No. Quest AI solo analiza mensajes en guilds donde está activado. Tus mensajes privados están protegidos con end-to-end encryption.',
      category_id: '3'
    },
  ];

  const handleSubmitTicket = async () => {
    if (!user || !subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_user_id: user.id,
        p_subject: subject,
        p_category: category,
        p_description: description,
      });

      if (error) throw error;

      Alert.alert('Éxito', 'Tu ticket ha sido creado. Te responderemos pronto.');
      setSubject('');
      setDescription('');
      setActiveTab('tickets');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.tabActive]}
          onPress={() => setActiveTab('faq')}
        >
          <Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>
            FAQ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.tabActive]}
          onPress={() => setActiveTab('tickets')}
        >
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>
            Mis Tickets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
          onPress={() => setActiveTab('contact')}
        >
          <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
            Contacto
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <View>
            <Text style={styles.title}>❓ Preguntas Frecuentes</Text>
            {mockFAQ.map(item => (
              <View key={item.id} style={styles.faqCard}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <View>
            <Text style={styles.title}>🎫 Mis Tickets de Soporte</Text>
            {tickets.length === 0 ? (
              <Text style={styles.emptyText}>No tienes tickets abiertos</Text>
            ) : (
              tickets.map(ticket => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                  <View style={styles.ticketFooter}>
                    <Text style={styles.ticketStatus}>{ticket.status}</Text>
                    <Text style={styles.ticketDate}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <View>
            <Text style={styles.title}>📩 Crear Ticket de Soporte</Text>
            
            <Text style={styles.label}>Categoría</Text>
            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    category === cat.value && styles.categoryButtonActive
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    category === cat.value && styles.categoryButtonTextActive
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Asunto</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: No puedo completar una tarea"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe tu problema en detalle..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTicket}>
              <Text style={styles.submitButtonText}>Enviar Ticket</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Respondemos tickets en menos de 24 horas. Para emergencias, contáctanos en support@questapp.com
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  faqCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    paddingVertical: 40,
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketStatus: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  ticketDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  categoryButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f2ff',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#6c757d',
  },
  categoryButtonTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
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
