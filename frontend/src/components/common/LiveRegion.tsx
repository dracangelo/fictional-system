import React, { useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'

interface LiveRegionProps {
  message: string
  priority?: 'polite' | 'assertive'
  atomic?: boolean
  id?: string
  className?: string
  clearAfter?: number // Clear message after X milliseconds
}

const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  atomic = true,
  id,
  className,
  clearAfter
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [currentMessage, setCurrentMessage] = React.useState(message)

  useEffect(() => {
    setCurrentMessage(message)

    if (clearAfter && message) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setCurrentMessage('')
      }, clearAfter)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, clearAfter])

  return (
    <div
      id={id}
      aria-live={priority}
      aria-atomic={atomic}
      className={cn(
        // Visually hidden but accessible to screen readers
        'absolute w-px h-px p-0 -m-px overflow-hidden',
        'whitespace-nowrap border-0',
        className
      )}
    >
      {currentMessage}
    </div>
  )
}

export { LiveRegion }
export type { LiveRegionProps }