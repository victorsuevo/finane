import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  const currency = typeof window !== 'undefined' ? localStorage.getItem('app_currency') || 'BRL' : 'BRL';
  const rate = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('app_currency_rate') || '1') : 1;
  const convertedValue = value / rate;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
  }).format(convertedValue);
}

/**
 * Calcula Juros Simples
 * @param p Principal (valor inicial)
 * @param i Taxa de juros (em porcentagem, ex: 5 para 5%)
 * @param t Tempo (em períodos)
 */
export function calculateSimpleInterest(p: number, i: number, t: number) {
  return p * (i / 100) * t;
}

/**
 * Calcula o Retorno sobre Investimento (ROI)
 * @param initial Investimento inicial
 * @param current Valor atual/final
 */
export function calculateROI(initial: number, current: number) {
  if (initial === 0) return 0;
  return ((current - initial) / initial) * 100;
}
