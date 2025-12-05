/**
 * Quest Finanzas Service
 * Personal finance management with AI assistance
 */

import { supabase } from "./supabase";

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  budget_limit?: number;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  category_id?: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  currency: string;
  description: string;
  notes?: string;
  date: string;
  is_recurring: boolean;
  recurring_frequency?: string;
  category?: ExpenseCategory;
}

export interface BudgetGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  icon: string;
  color: string;
  category?: string;
  is_completed: boolean;
  progress: number;
}

export interface FinancialSummary {
  month: string;
  total_income: number;
  total_expenses: number;
  balance: number;
  budget?: number;
  savings_goal_percent: number;
  categories: CategorySpending[];
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  budget_limit?: number;
  percent_used: number;
}

export interface FinancialInsight {
  id: string;
  type: "warning" | "tip" | "achievement" | "trend";
  title: string;
  message: string;
  priority: number;
  is_read: boolean;
}

class QuestFinanzasService {
  /**
   * Get expense categories
   */
  async getCategories(userId: string): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order");

    if (error) {
      console.error("Error fetching categories:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Initialize default categories for user
   */
  async initializeCategories(userId: string): Promise<void> {
    const { error } = await supabase.rpc("init_default_expense_categories", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error initializing categories:", error);
    }
  }

  /**
   * Add an expense
   */
  async addExpense(
    userId: string,
    amount: number,
    description: string,
    categoryId?: string,
    date?: string,
    notes?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase.rpc("add_expense", {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_category_id: categoryId || null,
      p_date: date || new Date().toISOString().split("T")[0],
      p_notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  }

  /**
   * Add income
   */
  async addIncome(
    userId: string,
    amount: number,
    description: string,
    date?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase.rpc("add_income", {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_date: date || new Date().toISOString().split("T")[0],
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  }

  /**
   * Get transactions for a period
   */
  async getTransactions(
    userId: string,
    startDate?: string,
    endDate?: string,
    type?: "expense" | "income" | "all"
  ): Promise<Transaction[]> {
    let query = supabase
      .from("financial_transactions")
      .select(
        `
        *,
        category:expense_categories(id, name, icon, color)
      `
      )
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get financial summary for a month
   */
  async getFinancialSummary(
    userId: string,
    month?: string
  ): Promise<FinancialSummary | null> {
    const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01";

    const { data, error } = await supabase.rpc("get_financial_summary", {
      p_user_id: userId,
      p_month: targetMonth,
    });

    if (error) {
      console.error("Error fetching summary:", error);
      return null;
    }

    return data as FinancialSummary;
  }

  /**
   * Get spending trends
   */
  async getSpendingTrends(userId: string): Promise<any[]> {
    const { data, error } = await supabase.rpc("get_spending_trends", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching trends:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Get budget goals
   */
  async getBudgetGoals(userId: string): Promise<BudgetGoal[]> {
    const { data, error } = await supabase
      .from("budget_goals")
      .select("*")
      .eq("user_id", userId)
      .order("deadline", { ascending: true });

    if (error) {
      console.error("Error fetching goals:", error);
      return [];
    }

    return (data || []).map((goal) => ({
      ...goal,
      progress:
        goal.target_amount > 0
          ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
          : 0,
    }));
  }

  /**
   * Create a budget goal
   */
  async createBudgetGoal(
    userId: string,
    name: string,
    targetAmount: number,
    deadline?: string,
    icon?: string,
    color?: string,
    category?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from("budget_goals")
      .insert({
        user_id: userId,
        name,
        target_amount: targetAmount,
        deadline,
        icon: icon || "🎯",
        color: color || "#10B981",
        category,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  }

  /**
   * Add money to a budget goal
   */
  async addToGoal(
    goalId: string,
    amount: number
  ): Promise<{ success: boolean; completed?: boolean }> {
    const { data: goal, error: fetchError } = await supabase
      .from("budget_goals")
      .select("current_amount, target_amount")
      .eq("id", goalId)
      .single();

    if (fetchError || !goal) {
      return { success: false };
    }

    const newAmount = goal.current_amount + amount;
    const isCompleted = newAmount >= goal.target_amount;

    const { error } = await supabase
      .from("budget_goals")
      .update({
        current_amount: newAmount,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", goalId);

    if (error) {
      return { success: false };
    }

    return { success: true, completed: isCompleted };
  }

  /**
   * Get financial insights (AI generated)
   */
  async getInsights(userId: string): Promise<FinancialInsight[]> {
    const { data, error } = await supabase
      .from("financial_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("priority", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching insights:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Generate AI insights based on spending
   */
  async generateInsights(userId: string): Promise<void> {
    const summary = await this.getFinancialSummary(userId);
    if (!summary) return;

    const insights: Partial<FinancialInsight>[] = [];

    // Check if spending exceeds income
    if (
      summary.total_expenses > summary.total_income &&
      summary.total_income > 0
    ) {
      insights.push({
        type: "warning",
        title: "⚠️ Gastos exceden ingresos",
        message: `Este mes has gastado $${(
          summary.total_expenses - summary.total_income
        ).toFixed(2)} más de lo que has ganado. Considera revisar tus gastos.`,
        priority: 10,
      });
    }

    // Check savings rate
    if (summary.total_income > 0) {
      const savingsRate =
        ((summary.total_income - summary.total_expenses) /
          summary.total_income) *
        100;
      if (savingsRate >= 20) {
        insights.push({
          type: "achievement",
          title: "🎉 ¡Excelente ahorro!",
          message: `Estás ahorrando el ${savingsRate.toFixed(
            0
          )}% de tus ingresos. ¡Sigue así!`,
          priority: 5,
        });
      } else if (savingsRate < 10 && savingsRate >= 0) {
        insights.push({
          type: "tip",
          title: "💡 Tip de ahorro",
          message: `Intenta ahorrar al menos el 20% de tus ingresos. Actualmente ahorras el ${savingsRate.toFixed(
            0
          )}%.`,
          priority: 7,
        });
      }
    }

    // Check category overspending
    for (const cat of summary.categories || []) {
      if (cat.budget_limit && cat.percent_used > 100) {
        insights.push({
          type: "warning",
          title: `${cat.category_icon} Límite excedido`,
          message: `Has gastado $${cat.total.toFixed(2)} en ${
            cat.category_name
          }, un ${cat.percent_used.toFixed(0)}% de tu límite.`,
          priority: 8,
        });
      }
    }

    // Insert insights
    if (insights.length > 0) {
      await supabase
        .from("financial_insights")
        .insert(insights.map((i) => ({ ...i, user_id: userId })));
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string): Promise<boolean> {
    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", transactionId);

    return !error;
  }

  /**
   * Get quick stats for widget/home
   */
  async getQuickStats(userId: string): Promise<{
    todaySpent: number;
    weekSpent: number;
    monthSpent: number;
    topCategory?: { name: string; icon: string; amount: number };
  }> {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const monthStart = new Date().toISOString().slice(0, 7) + "-01";

    const { data: transactions } = await supabase
      .from("financial_transactions")
      .select("amount, date, category:expense_categories(name, icon)")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", monthStart);

    if (!transactions) {
      return { todaySpent: 0, weekSpent: 0, monthSpent: 0 };
    }

    let todaySpent = 0;
    let weekSpent = 0;
    let monthSpent = 0;
    const categoryTotals: Record<
      string,
      { name: string; icon: string; amount: number }
    > = {};

    for (const t of transactions) {
      monthSpent += t.amount;
      if (t.date >= weekAgo) weekSpent += t.amount;
      if (t.date === today) todaySpent += t.amount;

      // category comes as an array from Supabase join, get first item
      const category = Array.isArray(t.category) ? t.category[0] : t.category;
      if (category) {
        const key = category.name;
        if (!categoryTotals[key]) {
          categoryTotals[key] = {
            name: category.name,
            icon: category.icon,
            amount: 0,
          };
        }
        categoryTotals[key].amount += t.amount;
      }
    }

    const topCategory = Object.values(categoryTotals).sort(
      (a, b) => b.amount - a.amount
    )[0];

    return { todaySpent, weekSpent, monthSpent, topCategory };
  }
}

export const QuestFinanzas = new QuestFinanzasService();
export default QuestFinanzas;
