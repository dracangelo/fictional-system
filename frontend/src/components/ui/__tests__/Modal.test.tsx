import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../Modal'

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        Modal content
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Modal content
      </Modal>
    )
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders with title and description', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Modal Title" description="Modal Description">
        Content
      </Modal>
    )
    
    expect(screen.getByText('Modal Title')).toBeInTheDocument()
    expect(screen.getByText('Modal Description')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose} title="Modal">
        Content
      </Modal>
    )
    
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <Modal open={true} onClose={handleClose}>
        Content
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('applies size variants correctly', () => {
    const { container } = render(
      <Modal open={true} onClose={() => {}} size="lg">
        Content
      </Modal>
    )
    
    expect(container.querySelector('.max-w-2xl')).toBeInTheDocument()
  })
})