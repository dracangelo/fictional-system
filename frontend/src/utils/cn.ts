import { clsx, type ClassValue } from 'clsx'

/**
 * Utility function to merge class names with clsx
 * @param inputs - Class names to merge
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}