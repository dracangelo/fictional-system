import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Modal } from '../Modal'

expect.extend(toHaveNoViolations)

describe('Modal Accessibility', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    description: 'This is a test modal'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <Modal {...defaultProps}>
        <p>Modal content</p>
      </Modal>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes', () => {
    render(
      <Modal {...defaultProps}>
        <p>Modal content</p>
      </Modal>
    )
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(dialog).toHaveAttribute('aria-describedby')
  })

  it('should focus management work correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <div>
        <button>Outside button</button>
        <Modal {...defaultProps}>
          <button>Inside button 1</button>
          <button>Inside button 2</button>
        </Modal>
      </div>
    )
    
    // First focusable element should be focused (close button)
    const closeButton = screen.getByRole('button', { name: /close modal/i })
    expect(closeButton).toHaveFocus()
    
    // Tab should move to next focusable element
    await user.tab()
    const insideButton1 = screen.getByRole('button', { name: 'Inside button 1' })
    expect(insideButton1).toHaveFocus()
    
    // Tab should move to next focusable element
    await user.tab()
    const insideButton2 = screen.getByRole('button', { name: 'Inside button 2' })
    expect(insideButton2).toHaveFocus()
    
    // Tab should wrap back to first focusable element
    await user.tab()
    expect(closeButton).toHaveFocus()
  })

  it('should trap focus within modal', async () => {
    const user = userEvent.setup()
    
    render(
      <div>
        <button>Outside button</button>
        <Modal {...defaultProps}>
          <button>Inside button</button>
        </Modal>
      </div>
    )
    
    const outsideButton = screen.getByRole('button', { name: 'Outside button' })
    const insideButton = screen.getByRole('button', { name: 'Inside button' })
    
    // Outside button should not be focusable
    expect(outsideButton).not.toHaveFocus()
    
    // Focus should be trapped inside modal
    await user.tab()
    expect(insideButton).toHaveFocus()
  })

  it('should close on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    render(
      <Modal {...defaultProps} onClose={onClose}>
        <p>Modal content</p>
      </Modal>
    )
    
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should not close on Escape when disabled', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    render(
      <Modal {...defaultProps} onClose={onClose} closeOnEscape={false}>
        <p>Modal content</p>
      </Modal>
    )
    
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('should announce modal opening to screen readers', () => {
    const { container } = render(
      <Modal {...defaultProps}>
        <p>Modal content</p>
      </Modal>
    )
    
    // Check if announcement element was created
    const announcement = container.querySelector('[aria-live="assertive"]')
    expect(announcement).toBeInTheDocument()
  })

  it('should have proper heading structure', () => {
    render(
      <Modal {...defaultProps}>
        <p>Modal content</p>
      </Modal>
    )
    
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Test Modal')
  })

  it('should support custom aria-labelledby and aria-describedby', () => {
    render(
      <Modal 
        {...defaultProps} 
        aria-labelledby="custom-title"
        aria-describedby="custom-description"
      >
        <h2 id="custom-title">Custom Title</h2>
        <p id="custom-description">Custom description</p>
      </Modal>
    )
    
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'custom-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'custom-description')
  })

  it('should restore focus when closed', async () => {
    const user = userEvent.setup()
    
    const TestComponent = () => {
      const [isOpen, setIsOpen] = React.useState(false)
      
      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Open Modal</button>
          <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Test">
            <button onClick={() => setIsOpen(false)}>Close</button>
          </Modal>
        </div>
      )
    }
    
    render(<TestComponent />)
    
    const openButton = screen.getByRole('button', { name: 'Open Modal' })
    
    // Focus and click the open button
    await user.click(openButton)
    
    // Modal should be open and focused
    const closeButton = screen.getByRole('button', { name: 'Close' })
    await user.click(closeButton)
    
    // Focus should return to the open button
    expect(openButton).toHaveFocus()
  })

  it('should work without title and description', async () => {
    const { container } = render(
      <Modal open={true} onClose={vi.fn()}>
        <p>Modal content without title</p>
      </Modal>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})