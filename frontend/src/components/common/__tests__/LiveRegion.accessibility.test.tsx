import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { LiveRegion } from '../LiveRegion'

expect.extend(toHaveNoViolations)

describe('LiveRegion Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<LiveRegion message="Test message" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes', () => {
    render(<LiveRegion message="Test message" priority="assertive" />)
    
    const liveRegion = screen.getByText('Test message')
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
  })

  it('should default to polite priority', () => {
    render(<LiveRegion message="Test message" />)
    
    const liveRegion = screen.getByText('Test message')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
  })

  it('should be visually hidden', () => {
    render(<LiveRegion message="Test message" />)
    
    const liveRegion = screen.getByText('Test message')
    expect(liveRegion).toHaveClass('absolute')
    expect(liveRegion).toHaveClass('w-px')
    expect(liveRegion).toHaveClass('h-px')
    expect(liveRegion).toHaveClass('overflow-hidden')
  })

  it('should update message content', () => {
    const { rerender } = render(<LiveRegion message="Initial message" />)
    
    expect(screen.getByText('Initial message')).toBeInTheDocument()
    
    rerender(<LiveRegion message="Updated message" />)
    expect(screen.getByText('Updated message')).toBeInTheDocument()
    expect(screen.queryByText('Initial message')).not.toBeInTheDocument()
  })

  it('should clear message after specified time', async () => {
    render(<LiveRegion message="Temporary message" clearAfter={100} />)
    
    expect(screen.getByText('Temporary message')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Temporary message')).not.toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('should support custom ID', () => {
    render(<LiveRegion message="Test message" id="custom-live-region" />)
    
    const liveRegion = document.getElementById('custom-live-region')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveTextContent('Test message')
  })

  it('should handle empty messages', () => {
    render(<LiveRegion message="" />)
    
    // When message is empty, the component still renders but with empty content
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveTextContent('')
  })

  it('should support atomic=false', () => {
    render(<LiveRegion message="Test message" atomic={false} />)
    
    const liveRegion = screen.getByText('Test message')
    expect(liveRegion).toHaveAttribute('aria-atomic', 'false')
  })

  it('should clear timeout on unmount', () => {
    const { unmount } = render(<LiveRegion message="Test message" clearAfter={1000} />)
    
    // Should not throw any errors when unmounting
    expect(() => unmount()).not.toThrow()
  })
})