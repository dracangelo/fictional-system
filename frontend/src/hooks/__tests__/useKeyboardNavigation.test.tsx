import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useKeyboardNavigation } from '../useKeyboardNavigation'

const TestComponent: React.FC<{
  isActive: boolean
  onEscape?: () => void
  onEnter?: () => void
  onSpace?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  preventDefault?: boolean
}> = ({ isActive, preventDefault, ...handlers }) => {
  useKeyboardNavigation(isActive, {
    ...handlers,
    preventDefault
  })

  return (
    <div>
      <button>Test Button</button>
      <input placeholder="Test Input" />
    </div>
  )
}

describe('useKeyboardNavigation', () => {
  it('should handle Escape key', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    
    render(<TestComponent isActive={true} onEscape={onEscape} />)
    
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('should handle Enter key', async () => {
    const user = userEvent.setup()
    const onEnter = vi.fn()
    
    render(<TestComponent isActive={true} onEnter={onEnter} />)
    
    await user.keyboard('{Enter}')
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('should handle Space key', async () => {
    const user = userEvent.setup()
    const onSpace = vi.fn()
    
    render(<TestComponent isActive={true} onSpace={onSpace} />)
    
    await user.keyboard(' ')
    expect(onSpace).toHaveBeenCalledTimes(1)
  })

  it('should handle arrow keys', async () => {
    const user = userEvent.setup()
    const onArrowUp = vi.fn()
    const onArrowDown = vi.fn()
    const onArrowLeft = vi.fn()
    const onArrowRight = vi.fn()
    
    render(
      <TestComponent 
        isActive={true}
        onArrowUp={onArrowUp}
        onArrowDown={onArrowDown}
        onArrowLeft={onArrowLeft}
        onArrowRight={onArrowRight}
      />
    )
    
    await user.keyboard('{ArrowUp}')
    expect(onArrowUp).toHaveBeenCalledTimes(1)
    
    await user.keyboard('{ArrowDown}')
    expect(onArrowDown).toHaveBeenCalledTimes(1)
    
    await user.keyboard('{ArrowLeft}')
    expect(onArrowLeft).toHaveBeenCalledTimes(1)
    
    await user.keyboard('{ArrowRight}')
    expect(onArrowRight).toHaveBeenCalledTimes(1)
  })

  it('should not handle keys when inactive', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    const onEnter = vi.fn()
    
    render(<TestComponent isActive={false} onEscape={onEscape} onEnter={onEnter} />)
    
    await user.keyboard('{Escape}')
    await user.keyboard('{Enter}')
    
    expect(onEscape).not.toHaveBeenCalled()
    expect(onEnter).not.toHaveBeenCalled()
  })

  it('should prevent default when specified', async () => {
    const user = userEvent.setup()
    const onArrowDown = vi.fn()
    
    render(
      <TestComponent 
        isActive={true}
        onArrowDown={onArrowDown}
        preventDefault={true}
      />
    )
    
    const input = screen.getByRole('textbox')
    await user.click(input)
    
    // Arrow down in input would normally move cursor, but should be prevented
    await user.keyboard('{ArrowDown}')
    expect(onArrowDown).toHaveBeenCalledTimes(1)
  })

  it('should handle multiple key handlers', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    const onEnter = vi.fn()
    const onArrowUp = vi.fn()
    
    render(
      <TestComponent 
        isActive={true}
        onEscape={onEscape}
        onEnter={onEnter}
        onArrowUp={onArrowUp}
      />
    )
    
    await user.keyboard('{Escape}')
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowUp}')
    
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onArrowUp).toHaveBeenCalledTimes(1)
  })

  it('should clean up event listeners on unmount', () => {
    const onEscape = vi.fn()
    const { unmount } = render(<TestComponent isActive={true} onEscape={onEscape} />)
    
    // Should not throw error on unmount
    expect(() => unmount()).not.toThrow()
  })

  it('should update handlers when props change', async () => {
    const user = userEvent.setup()
    const onEscape1 = vi.fn()
    const onEscape2 = vi.fn()
    
    const { rerender } = render(<TestComponent isActive={true} onEscape={onEscape1} />)
    
    await user.keyboard('{Escape}')
    expect(onEscape1).toHaveBeenCalledTimes(1)
    expect(onEscape2).not.toHaveBeenCalled()
    
    rerender(<TestComponent isActive={true} onEscape={onEscape2} />)
    
    await user.keyboard('{Escape}')
    expect(onEscape1).toHaveBeenCalledTimes(1)
    expect(onEscape2).toHaveBeenCalledTimes(1)
  })

  it('should handle activation state changes', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    
    const { rerender } = render(<TestComponent isActive={false} onEscape={onEscape} />)
    
    await user.keyboard('{Escape}')
    expect(onEscape).not.toHaveBeenCalled()
    
    rerender(<TestComponent isActive={true} onEscape={onEscape} />)
    
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
    
    rerender(<TestComponent isActive={false} onEscape={onEscape} />)
    
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1) // Should not increment
  })
})