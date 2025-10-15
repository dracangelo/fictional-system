import React from 'react'
import { cn } from '../../utils/cn'

interface ScreenReaderOnlyProps {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
}

const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({ 
  children, 
  as: Component = 'span',
  className 
}) => {
  return (
    <Component
      className={cn(
        // Visually hidden but accessible to screen readers
        'absolute w-px h-px p-0 -m-px overflow-hidden',
        'whitespace-nowrap border-0',
        // Alternative approach using clip-path
        // 'sr-only',
        className
      )}
    >
      {children}
    </Component>
  )
}

export { ScreenReaderOnly }
export type { ScreenReaderOnlyProps }