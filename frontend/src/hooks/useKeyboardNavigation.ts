import { useEffect, useCallback } from 'react'

interface KeyboardNavigationOptions {
  onEscape?: () => void
  onEnter?: () => void
  onSpace?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onHome?: () => void
  onEnd?: () => void
  onPageUp?: () => void
  onPageDown?: () => void
  preventDefault?: boolean
  stopPropagation?: boolean
}

export const useKeyboardNavigation = (
  isActive: boolean,
  options: KeyboardNavigationOptions = {}
) => {
  const {
    onEscape,
    onEnter,
    onSpace,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault = false,
    stopPropagation = false
  } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive) return

      let handled = false

      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            onEscape()
            handled = true
          }
          break
        case 'Enter':
          if (onEnter) {
            onEnter()
            handled = true
          }
          break
        case ' ':
        case 'Space':
          if (onSpace) {
            onSpace()
            handled = true
          }
          break
        case 'ArrowUp':
          if (onArrowUp) {
            onArrowUp()
            handled = true
          }
          break
        case 'ArrowDown':
          if (onArrowDown) {
            onArrowDown()
            handled = true
          }
          break
        case 'ArrowLeft':
          if (onArrowLeft) {
            onArrowLeft()
            handled = true
          }
          break
        case 'ArrowRight':
          if (onArrowRight) {
            onArrowRight()
            handled = true
          }
          break
        case 'Home':
          if (onHome) {
            onHome()
            handled = true
          }
          break
        case 'End':
          if (onEnd) {
            onEnd()
            handled = true
          }
          break
        case 'PageUp':
          if (onPageUp) {
            onPageUp()
            handled = true
          }
          break
        case 'PageDown':
          if (onPageDown) {
            onPageDown()
            handled = true
          }
          break
      }

      if (handled) {
        if (preventDefault) {
          event.preventDefault()
        }
        if (stopPropagation) {
          event.stopPropagation()
        }
      }
    },
    [
      isActive,
      onEscape,
      onEnter,
      onSpace,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onHome,
      onEnd,
      onPageUp,
      onPageDown,
      preventDefault,
      stopPropagation
    ]
  )

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, handleKeyDown])

  return { handleKeyDown }
}