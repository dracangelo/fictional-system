import { render } from '@testing-library/react'
import { Container } from '../Container'

describe('Container', () => {
  it('renders correctly', () => {
    const { container } = render(<Container>Container content</Container>)
    expect(container.firstChild).toHaveClass('mx-auto', 'w-full')
  })

  it('applies size classes correctly', () => {
    const { container } = render(<Container size="lg">Content</Container>)
    expect(container.firstChild).toHaveClass('max-w-screen-lg')
  })

  it('applies padding classes correctly', () => {
    const { container } = render(<Container padding="lg">Content</Container>)
    expect(container.firstChild).toHaveClass('px-8')
  })

  it('applies default classes', () => {
    const { container } = render(<Container>Content</Container>)
    expect(container.firstChild).toHaveClass('max-w-screen-xl', 'px-6')
  })
})