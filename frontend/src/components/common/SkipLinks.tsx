import React from 'react'
import { cn } from '../../utils/cn'

interface SkipLink {
  href: string
  label: string
}

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#search', label: 'Skip to search' },
  { href: '#footer', label: 'Skip to footer' }
]

const SkipLinks: React.FC<SkipLinksProps> = ({ 
  links = defaultLinks, 
  className 
}) => {
  return (
    <div className={cn('skip-links', className)}>
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className={cn(
            // Hidden by default, visible on focus
            'absolute left-0 top-0 z-[9999] px-4 py-2',
            'bg-primary-600 text-white font-medium',
            'transform -translate-y-full opacity-0',
            'focus:translate-y-0 focus:opacity-100',
            'transition-all duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-primary-300',
            // Ensure it's above everything else
            'focus:relative focus:z-[10000]'
          )}
          onFocus={(e) => {
            // Ensure the link is visible when focused
            e.currentTarget.style.position = 'fixed'
            e.currentTarget.style.top = '0'
            e.currentTarget.style.left = '0'
          }}
          onBlur={(e) => {
            // Reset position when focus is lost
            e.currentTarget.style.position = 'absolute'
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export { SkipLinks }
export type { SkipLinksProps, SkipLink }