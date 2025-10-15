import React, { useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'
import { useFocusManagement } from '../../hooks/useFocusManagement'
import { generateId } from '../../utils/accessibility'

const modalVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

const modalContentVariants = cva(
  'relative w-full rounded-lg bg-white shadow-lg animate-scale-in',
  {
    variants: {
      size: {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full max-h-[90vh] overflow-auto',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants> {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  initialFocus?: string | HTMLElement | null
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      size,
      open,
      onClose,
      title,
      description,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      initialFocus,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      children,
      ...props
    },
    ref
  ) => {
    const titleId = React.useMemo(() => generateId('modal-title'), [])
    const descriptionId = React.useMemo(() => generateId('modal-description'), [])
    
    const { containerRef } = useFocusManagement(open, {
      restoreFocus: true,
      trapFocus: true,
      initialFocus: initialFocus || (showCloseButton ? undefined : 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    })

    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape') {
          onClose()
        }
      }

      if (open) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
        // Announce modal opening to screen readers
        const announcement = document.createElement('div')
        announcement.setAttribute('aria-live', 'assertive')
        announcement.setAttribute('class', 'sr-only')
        announcement.textContent = `Modal opened${title ? `: ${title}` : ''}`
        document.body.appendChild(announcement)
        
        setTimeout(() => {
          document.body.removeChild(announcement)
        }, 1000)
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
      }
    }, [open, onClose, closeOnEscape, title])

    if (!open) return null

    const handleOverlayClick = (event: React.MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onClose()
      }
    }

    return (
      <div
        className={cn(modalVariants({ size }), className)}
        onClick={handleOverlayClick}
        {...props}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 animate-fade-in" />
        
        {/* Modal Content */}
        <div
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref) {
              ref.current = node
            }
            if (containerRef) {
              containerRef.current = node
            }
          }}
          className={cn(modalContentVariants({ size }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy || (title ? titleId : undefined)}
          aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 pb-4">
              <div>
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-semibold text-secondary-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id={descriptionId}
                    className="mt-1 text-sm text-secondary-600"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={cn('p-6', (title || showCloseButton) && 'pt-0')}>
            {children}
          </div>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'

const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
))

ModalHeader.displayName = 'ModalHeader'

const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
))

ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalFooter, modalVariants }