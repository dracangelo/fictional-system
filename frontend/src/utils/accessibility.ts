/**
 * Accessibility utility functions
 */

/**
 * Generate a unique ID for accessibility purposes
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Announce text to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.setAttribute('class', 'sr-only')
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ]

  return focusableSelectors.some(selector => element.matches(selector))
}

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ')

  return Array.from(container.querySelectorAll(focusableSelector))
}

/**
 * Check if reduced motion is preferred
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check color contrast ratio (simplified version)
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  // This is a simplified implementation
  // In a real app, you'd want to use a proper color contrast library
  const getLuminance = (color: string): number => {
    // Convert hex to RGB and calculate luminance
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast meets WCAG guidelines
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const ratio = getContrastRatio(foreground, background)
  
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7
  }
  
  return size === 'large' ? ratio >= 3 : ratio >= 4.5
}

/**
 * Create a live region for dynamic content announcements
 */
export const createLiveRegion = (id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
  let liveRegion = document.getElementById(id)
  
  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.id = id
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
  }
  
  return liveRegion
}

/**
 * Update live region content
 */
export const updateLiveRegion = (id: string, message: string): void => {
  const liveRegion = document.getElementById(id)
  if (liveRegion) {
    liveRegion.textContent = message
  }
}

/**
 * Debounced live region update to prevent spam
 */
let liveRegionTimeout: NodeJS.Timeout | null = null

export const debouncedLiveRegionUpdate = (id: string, message: string, delay: number = 500): void => {
  if (liveRegionTimeout) {
    clearTimeout(liveRegionTimeout)
  }
  
  liveRegionTimeout = setTimeout(() => {
    updateLiveRegion(id, message)
  }, delay)
}

/**
 * Format number for screen readers
 */
export const formatNumberForScreenReader = (num: number): string => {
  if (num === 1) return 'one'
  if (num === 2) return 'two'
  if (num === 3) return 'three'
  if (num === 4) return 'four'
  if (num === 5) return 'five'
  if (num === 6) return 'six'
  if (num === 7) return 'seven'
  if (num === 8) return 'eight'
  if (num === 9) return 'nine'
  if (num === 10) return 'ten'
  return num.toString()
}

/**
 * Format price for screen readers
 */
export const formatPriceForScreenReader = (price: number, currency: string = 'USD'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  })
  
  return formatter.format(price).replace('$', 'dollars ')
}