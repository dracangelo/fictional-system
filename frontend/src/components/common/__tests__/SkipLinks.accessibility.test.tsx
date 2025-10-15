import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SkipLinks } from '../SkipLinks'

expect.extend(toHaveNoViolations)

describe('SkipLinks Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<SkipLinks />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should render default skip links', () => {
    render(<SkipLinks />)
    
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to search' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to footer' })).toBeInTheDocument()
  })

  it('should render custom skip links', () => {
    const customLinks = [
      { href: '#custom-main', label: 'Skip to custom main' },
      { href: '#custom-nav', label: 'Skip to custom navigation' }
    ]
    
    render(<SkipLinks links={customLinks} />)
    
    expect(screen.getByRole('link', { name: 'Skip to custom main' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to custom navigation' })).toBeInTheDocument()
  })

  it('should be visually hidden by default', () => {
    render(<SkipLinks />)
    
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveClass('-translate-y-full')
    expect(skipLink).toHaveClass('opacity-0')
  })

  it('should become visible on focus', async () => {
    const user = userEvent.setup()
    render(<SkipLinks />)
    
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    
    await user.tab()
    expect(skipLink).toHaveFocus()
    expect(skipLink).toHaveClass('focus:translate-y-0')
    expect(skipLink).toHaveClass('focus:opacity-100')
  })

  it('should have proper href attributes', () => {
    render(<SkipLinks />)
    
    const mainLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(mainLink).toHaveAttribute('href', '#main-content')
    
    const navLink = screen.getByRole('link', { name: 'Skip to navigation' })
    expect(navLink).toHaveAttribute('href', '#navigation')
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    render(<SkipLinks />)
    
    // Tab through all skip links
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to navigation' })).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to search' })).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to footer' })).toHaveFocus()
  })

  it('should have high z-index for visibility', () => {
    render(<SkipLinks />)
    
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveClass('z-[9999]')
  })
})