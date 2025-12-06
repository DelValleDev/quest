import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Budget {
  id: string;
  name: string;
  category: string;
  limit_amount: number;
  spent: number;
  alert_threshold: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  emoji: string;
  target_date: string;
}

export default function FinancesScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    if (!user) return;

    try {
      // Fetch accounts balance
      const { data: accounts } = await supabase
        .from('financial_accounts')
        .select('balance')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      const balance = accounts?.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0) || 0;
      setTotalBalance(balance);

      // Fetch recent transactions
      const { data: txData } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(20);
      setTransactions(txData || []);

      // Fetch budgets
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      setBudgets(budgetData || []);

      // Fetch savings goals
      const { data: goalsData } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false);
      setSavingsGoals(goalsData || []);

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (type: 'income' | 'expense', category: string, amount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('add_transaction', {
        p_user_id: user.id,
        p_account_id: 'default_account_id', // TODO: seleccionar cuenta
        p_type: type,
        p_category: category,
        p_amount: amount,
      });

      if (error) throw error;
      Alert.alert('Éxito', 'Transacción agregada');
      fetchFinancialData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando finanzas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header - Balance Total */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance Total</Text>
        <Text style={styles.balanceAmount}>${totalBalance.toFixed(2)}</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.incomeButton}>
            <Text style={styles.actionButtonText}>+ Ingreso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.expenseButton}>
            <Text style={styles.actionButtonText}>- Gasto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budgets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Presupuestos</Text>
        {budgets.length === 0 ? (
          <Text style={styles.emptyText}>No tienes presupuestos configurados</Text>
        ) : (
          budgets.map(budget => {
            const percentage = (budget.spent / budget.limit_amount) * 100;
            const isOverBudget = percentage >= 100;
            const isWarning = percentage >= budget.alert_threshold * 100;

            return (
              <View key={budget.id} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <Text style={styles.budgetName}>{budget.name}</Text>
                  <Text style={[styles.budgetAmount, isOverBudget && { color: '#dc3545' }]}>
                    ${budget.spent} / ${budget.limit_amount}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: isOverBudget ? '#dc3545' : isWarning ? '#ffc107' : '#28a745'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.budgetPercentage}>{percentage.toFixed(0)}% usado</Text>
              </View>
            );
          })
        )}
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Agregar Presupuesto</Text>
        </TouchableOpacity>
      </View>

      {/* Savings Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Metas de Ahorro</Text>
        {savingsGoals.length === 0 ? (
          <Text style={styles.emptyText}>No tienes metas de ahorro</Text>
        ) : (
          savingsGoals.map(goal => {
            const percentage = (goal.current_amount / goal.target_amount) * 100;
            
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalAmount}>
                      ${goal.current_amount} / ${goal.target_amount}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: '#667eea' }]} />
                </View>
                <View style={styles.goalFooter}>
                  <Text style={styles.goalPercentage}>{percentage.toFixed(0)}%</Text>
                  {goal.target_date && (
                    <Text style={styles.goalDate}>Meta: {new Date(goal.target_date).toLocaleDateString()}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nueva Meta</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Transacciones Recientes</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No hay transacciones</Text>
        ) : (
          transactions.slice(0, 10).map(tx => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionCategory}>{tx.category}</Text>
                {tx.description && (
                  <Text style={styles.transactionDescription}>{tx.description}</Text>
                )}
              </View>
              <Text style={[
                styles.transactionAmount,
                { color: tx.type === 'income' ? '#28a745' : '#dc3545' }
              ]}>
                {tx.type === 'income' ? '+' : '-'}${tx.amount}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  incomeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  expenseButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    paddingVertical: 20,
  },
  budgetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  budgetAmount: {
    fontSize: 14,
    color: '#6c757d',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  budgetPercentage: {
    fontSize: 12,
    color: '#6c757d',
  },
  goalCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 14,
    color: '#6c757d',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  goalDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 16,
  },
});
