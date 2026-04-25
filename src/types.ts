export interface Transaction {
  id?: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
  installments?: number;        // número de parcelas (1 = à vista)
  installment_ref?: number;     // referência ao id da transação original (parcela pai)
  installment_num?: number;     // número da parcela (ex: 2/6)
  goal_id?: number | null;      // se for contribuição para meta, qual meta
  investment_id?: number | null; // se for aporte para investimento, qual investimento
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

export interface Investment {
  id?: number;
  name: string;
  type: string; // 'renda_fixa', 'renda_variavel', 'cripto', 'reserva'
  current_amount: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  is_manager?: boolean;
}
