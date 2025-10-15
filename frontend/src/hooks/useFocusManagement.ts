import { useEffect, useRef, useCallback } from 'react'

interface FocusManagementOptions {
  restoreFocus?: boolean
  trapFocus?: boolean
  initialFocus?: string | HTMLElement | null
}

export const useFocusManagement = (
  isActive: boolean,
  options: FocusManagementOptions = {}
) => {
  const { restoreFocus = true, trapFocus = true, initialFocus } = options
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Store the previously focused element when component becomes active
  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [isActive])

  // Focus management when component becomes active/inactive
  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    // Set initial focus
    const setInitialFocus = () => {
      let elementToFocus: HTMLElement | null = null

      if (typeof initialFocus === 'string') {
        elementToFocus = container.querySelector(initialFocus)
      } else if (initialFocus instanceof HTMLElement) {
        elementToFocus = initialFocus
      } else {
        // Find first focusable element
        elementToFocus = container.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      }

      if (elementToFocus) {
        elementToFocus.focus()
      }
    }

    // Trap focus within container
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!trapFocus || event.key !== 'Tab') return

      const focusableElements = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    setInitialFocus()
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus when component becomes inactive
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, trapFocus, initialFocus, restoreFocus])

  const focusFirst = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const firstFocusable = container.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement

    firstFocusable?.focus()
  }, [])

  const focusLast = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

    lastFocusable?.focus()
  }, [])

  return {
    containerRef,
    focusFirst,
    focusLast
  }
}