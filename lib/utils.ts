import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the base URL for the application
 * Uses NEXT_PUBLIC_APP_URL if set, otherwise falls back to window.location.origin
 * This is important for QR codes to work on mobile devices
 * Ensures URL always starts with http:// or https://
 */
export function getAppUrl(): string {
  let url: string
  
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  } else {
    // Client-side: prefer environment variable, fallback to window.location.origin
    url = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  }
  
  // Ensure URL starts with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }
  
  // Remove trailing slash if present
  url = url.replace(/\/$/, '')
  
  return url
}

