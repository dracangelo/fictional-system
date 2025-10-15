import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFocusManagement } from '../useFocusManagement'

const TestComponent: React.FC<{
  isActive: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
  initialFocus?: string
}> = ({ isActive, trapFocus = true, restoreFocus = true, initialFocus }) => {
  const { containerRef, focusFirst, focusLast } = useFocusManagement(isActive, {
    trapFocus,
    restoreFocus,
    initialFocus
  })

  return (
    <div>
      <button>Outside Button</button>
      <div ref={containerRef} data-testid="focus-container">
        <button>First Button</button>
        <input placeholder="Input field" />
        <button>Last Button</button>
        <button onClick={focusFirst}>Focus First</button>
        <button onClick={focusLast}>Focus Last</button>
      </div>
    </div>
  )
}

describe('useFocusManagement', () => {
  it('should focus first element when activated', () => {
    render(<TestComponent isActive={true} />)
    
    const firstButton = screen.getByRole('button', { name: 'First Button' })
    expect(firstButton).toHaveFocus()
  })

  it('should not manage focus when inactive', () => {
    render(<TestComponent isActive={false} />)
    
    const firstButton = screen.getByRole('button', { name: 'First Button' })
    expect(firstButton).not.toHaveFocus()
  })

  it('should trap focus within container', async () => {
    const user = userEvent.setup()
    render(<TestComponent isActive={true} />)
    
    const firstButton = screen.getByRole('button', { name: 'First Button' })
    const lastButton = screen.getByRole('button', { name: 'Focus Last' })
    
    // Start at first button
    expect(firstButton).toHaveFocus()
    
    // Tab to last focusable element
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(lastButton).toHaveFocus()
    
    // Tab should wrap to first element
    await user.tab()
    expect(firstButton).toHaveFocus()
  })

  it('should handle shift+tab for reverse navigation', async () => {
    const user = userEvent.setup()
    render(<TestComponent isActive={true} />)
    
    const firstButton = screen.getByRole('button', { name: 'First Button' })
    const lastButton = screen.getByRole('button', { name: 'Focus Last' })
    
    // Start at first button
    expect(firstButton).toHaveFocus()
    
    // Shift+Tab should wrap to last element
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(lastButton).toHaveFocus()
  })

  it('should focus custom initial element', () => {
    render(<TestComponent isActive={true} initialFocus="input" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
  })

  it('should provide focusFirst and focusLast functions', async () => {
    const user = userEvent.setup()
    render(<TestComponent isActive={true} />)
    
    const focusFirstButton = screen.getByRole('button', { name: 'Focus First' })
    const focusLastButton = screen.getByRole('button', { name: 'Focus Last' })
    const firstButton = screen.getByRole('button', { name: 'First Button' })
    const lastButton = screen.getByRole('button', { name: 'Focus Last' })
    
    // Click focus last
    await user.click(focusLastButton)
    expect(lastButton).toHaveFocus()
    
    // Click focus first
    await user.click(focusFirstButton)
    expect(firstButton).toHaveFocus()
  })

  it('should not trap focus when trapFocus is false', async () => {
    const user = userEvent.setup()
    render(<TestComponent isActive={true} trapFocus={false} />)
    
    const outsideButton = screen.getByRole('button', { name: 'Outside Button' })
    
    // Should be able to focus outside elements
    await user.click(outsideButton)
    expect(outsideButton).toHaveFocus()
  })

  it('should restore focus when deactivated', () => {
    const TestWrapper = () => {
      const [isActive, setIsActive] = React.useState(false)
      
      return (
        <div>
          <button onClick={() => setIsActive(true)}>Activate</button>
          <TestComponent isActive={isActive} />
          <button onClick={() => setIsActive(false)}>Deactivate</button>
        </div>
      )
    }
    
    render(<TestWrapper />)
    
    const activateButton = screen.getByRole('button', { name: 'Activate' })
    const deactivateButton = screen.getByRole('button', { name: 'Deactivate' })
    
    // Focus activate button and click it
    activateButton.focus()
    expect(activateButton).toHaveFocus()
    
    // Activate focus management
    activateButton.click()
    
    // Focus should move to first element in container
    const firstButton = screen.getByRole('button', { name: 'First Button' })
    expect(firstButton).toHaveFocus()
    
    // Deactivate focus management
    deactivateButton.click()
    
    // Focus should restore to activate button
    expect(activateButton).toHaveFocus()
  })

  it('should handle containers with no focusable elements', () => {
    const EmptyContainer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
      const { containerRef } = useFocusManagement(isActive)
      
      return (
        <div>
          <button>Outside Button</button>
          <div ref={containerRef} data-testid="empty-container">
            <div>No focusable elements</div>
          </div>
        </div>
      )
    }
    
    // Should not throw error
    expect(() => render(<EmptyContainer isActive={true} />)).not.toThrow()
  })
})