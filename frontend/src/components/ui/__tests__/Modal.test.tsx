import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from '../Modal'

describe('Modal Component', () => {
  it('renders when open is true', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    
    render(
      <Modal open onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    
    render(
      <Modal open onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    const overlay = screen.getByTestId('modal-overlay')
    await user.click(overlay)
    
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside modal content', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    
    render(
      <Modal open onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    const content = screen.getByText('Modal content')
    await user.click(content)
    
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('closes when Escape key is pressed', () => {
    const handleClose = vi.fn()
    
    render(
      <Modal open onClose={handleClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on Escape when closeOnEscape is false', () => {
    const handleClose = vi.fn()
    
    render(
      <Modal open onClose={handleClose} title="Test Modal" closeOnEscape={false}>
        <p>Modal content</p>
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('does not close on overlay click when closeOnOverlayClick is false', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    
    render(
      <Modal open onClose={handleClose} title="Test Modal" closeOnOverlayClick={false}>
        <p>Modal content</p>
      </Modal>
    )
    
    const overlay = screen.getByTestId('modal-overlay')
    await user.click(overlay)
    
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('renders with description', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal" description="Modal description">
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.getByText('Modal description')).toBeInTheDocument()
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="Small Modal" size="sm">
        <p>Content</p>
      </Modal>
    )
    
    expect(screen.getByRole('dialog')).toHaveClass('max-w-md')
    
    rerender(
      <Modal open onClose={() => {}} title="Large Modal" size="lg">
        <p>Content</p>
      </Modal>
    )
    
    expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl')
    
    rerender(
      <Modal open onClose={() => {}} title="Full Modal" size="full">
        <p>Content</p>
      </Modal>
    )
    
    expect(screen.getByRole('dialog')).toHaveClass('max-w-7xl')
  })

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal" showCloseButton={false}>
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('renders custom footer', () => {
    const footer = (
      <div>
        <button>Cancel</button>
        <button>Save</button>
      </div>
    )
    
    render(
      <Modal open onClose={() => {}} title="Test Modal" footer={footer}>
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('traps focus within modal', async () => {
    const user = userEvent.setup()
    
    render(
      <Modal open onClose={() => {}} title="Test Modal">
        <input data-testid="first-input" />
        <input data-testid="second-input" />
        <button>Action</button>
      </Modal>
    )
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    const firstInput = screen.getByTestId('first-input')
    const secondInput = screen.getByTestId('second-input')
    const actionButton = screen.getByRole('button', { name: /action/i })
    
    // Focus should start on the first focusable element
    await waitFor(() => {
      expect(closeButton).toHaveFocus()
    })
    
    // Tab should cycle through focusable elements
    await user.tab()
    expect(firstInput).toHaveFocus()
    
    await user.tab()
    expect(secondInput).toHaveFocus()
    
    await user.tab()
    expect(actionButton).toHaveFocus()
    
    // Tab from last element should go back to first
    await user.tab()
    expect(closeButton).toHaveFocus()
    
    // Shift+Tab should go backwards
    await user.tab({ shift: true })
    expect(actionButton).toHaveFocus()
  })

  it('restores focus to trigger element when closed', async () => {
    const user = userEvent.setup()
    
    const TestComponent = () => {
      const [isOpen, setIsOpen] = React.useState(false)
      
      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Open Modal</button>
          <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
            <p>Content</p>
          </Modal>
        </div>
      )
    }
    
    render(<TestComponent />)
    
    const openButton = screen.getByRole('button', { name: /open modal/i })
    
    // Click to open modal
    await user.click(openButton)
    
    // Modal should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    
    // Focus should return to the open button
    await waitFor(() => {
      expect(openButton).toHaveFocus()
    })
  })

  it('has proper ARIA attributes', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal" description="Modal description">
        <p>Modal content</p>
      </Modal>
    )
    
    const dialog = screen.getByRole('dialog')
    
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(dialog).toHaveAttribute('aria-describedby')
    
    const title = screen.getByText('Test Modal')
    const description = screen.getByText('Modal description')
    
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id)
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id)
  })

  it('prevents body scroll when open', () => {
    const { rerender } = render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    )
    
    // Body should not have overflow hidden when modal is closed
    expect(document.body).not.toHaveStyle('overflow: hidden')
    
    rerender(
      <Modal open onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    )
    
    // Body should have overflow hidden when modal is open
    expect(document.body).toHaveStyle('overflow: hidden')
  })

  it('supports custom className', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal" className="custom-modal">
        <p>Content</p>
      </Modal>
    )
    
    expect(screen.getByRole('dialog')).toHaveClass('custom-modal')
  })

  it('handles loading state', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal" loading>
        <p>Content</p>
      </Modal>
    )
    
    expect(screen.getByTestId('modal-loading')).toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('animates in and out', async () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    )
    
    const dialog = screen.getByRole('dialog')
    
    // Should have enter animation classes
    expect(dialog).toHaveClass('animate-in')
    
    rerender(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        <p>Content</p>
      </Modal>
    )
    
    // Should animate out before unmounting
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})