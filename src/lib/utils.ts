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
