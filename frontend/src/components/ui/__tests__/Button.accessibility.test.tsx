import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '../Button'

expect.extend(toHaveNoViolations)

describe('Button Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes when loading', async () => {
    render(<Button loading>Loading button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-label', 'Loading button (loading)')
    expect(button).toBeDisabled()
  })

  it('should have proper ARIA attributes when pressed', async () => {
    render(<Button aria-pressed={true}>Toggle button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('should have proper ARIA attributes when expanded', async () => {
    render(<Button aria-expanded={true}>Menu button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Keyboard button</Button>)
    
    const button = screen.getByRole('button')
    
    // Focus the button
    await user.tab()
    expect(button).toHaveFocus()
    
    // Activate with Enter
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    // Activate with Space
    await user.keyboard(' ')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })

  it('should have proper focus styles', () => {
    render(<Button>Focus button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('focus-visible:outline-none')
    expect(button).toHaveClass('focus-visible:ring-2')
    expect(button).toHaveClass('focus-visible:ring-primary-500')
  })

  it('should have descriptive aria-label for icon-only buttons', async () => {
    const { container } = render(
      <Button size="icon" aria-label="Close dialog">
        ×
      </Button>
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Close dialog')
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should hide decorative icons from screen readers', () => {
    render(
      <Button leftIcon={<span>🔍</span>}>
        Search
      </Button>
    )
    
    const icon = screen.getByText('🔍')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('should announce loading state changes', async () => {
    const { rerender } = render(<Button>Submit</Button>)
    
    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('aria-busy', 'true')
    
    rerender(<Button loading>Submit</Button>)
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-label', 'Submit (loading)')
  })

  it('should maintain color contrast requirements', async () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'success'] as const
    
    for (const variant of variants) {
      const { container } = render(<Button variant={variant}>Button</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }
  })
})