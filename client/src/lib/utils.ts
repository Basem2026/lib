import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * تنسيق التاريخ بصيغة DD/MM/YYYY
 * @param date - التاريخ (Date object أو string)
 * @returns التاريخ بصيغة DD/MM/YYYY
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // التحقق من صحة التاريخ
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * تنسيق الوقت بصيغة HH:MM
 * @param date - التاريخ (Date object أو string)
 * @returns الوقت بصيغة HH:MM
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // التحقق من صحة التاريخ
  if (isNaN(d.getTime())) return '-';
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * تنسيق التاريخ والوقت معاً
 * @param date - التاريخ (Date object أو string)
 * @returns التاريخ والوقت بصيغة DD/MM/YYYY - HH:MM
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  return `${formatDate(date)} - ${formatTime(date)}`;
}
export function formatCurrency(amount: number, currency: string = 'LYD'): string {
  return `${amount.toLocaleString('ar-LY')} ${currency}`;
}