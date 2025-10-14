import { render, screen, fireEvent } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('renders correctly', () => {
    render(<Badge>Badge text</Badge>)
    expect(screen.getByText('Badge text')).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    const { container } = render(<Badge variant="success">Success</Badge>)
    expect(container.firstChild).toHaveClass('bg-success-100')
  })

  it('applies size classes correctly', () => {
    const { container } = render(<Badge size="lg">Large</Badge>)
    expect(container.firstChild).toHaveClass('px-3', 'py-1')
  })

  it('renders removable badge with remove button', () => {
    const handleRemove = vi.fn()
    render(
      <Badge removable onRemove={handleRemove}>
        Removable
      </Badge>
    )
    
    const removeButton = screen.getByLabelText('Remove badge')
    expect(removeButton).toBeInTheDocument()
    
    fireEvent.click(removeButton)
    expect(handleRemove).toHaveBeenCalledTimes(1)
  })

  it('does not render remove button when not removable', () => {
    render(<Badge>Not removable</Badge>)
    expect(screen.queryByLabelText('Remove badge')).not.toBeInTheDocument()
  })
})