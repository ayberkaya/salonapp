import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the base URL for the application
 * Uses NEXT_PUBLIC_APP_URL if set, otherwise falls back to window.location.origin
 * This is important for QR codes to work on mobile devices
 */
export function getAppUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }
  
  // Client-side: prefer environment variable, fallback to window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || window.location.origin
}

