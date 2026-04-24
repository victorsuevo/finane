export interface Transaction {
  id?: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
}

export interface Goal {
  id?: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
}
