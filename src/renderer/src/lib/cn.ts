import { clsx, type ClassValue } from 'clsx'

/** Joins class names, dropping falsy values. Components append `className` last. */
export function cn(...values: ClassValue[]): string {
  return clsx(values)
}
