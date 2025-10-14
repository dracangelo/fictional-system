import { render } from '@testing-library/react'
import { Grid, GridItem } from '../Grid'

describe('Grid', () => {
  it('renders correctly', () => {
    const { container } = render(<Grid>Grid content</Grid>)
    expect(container.firstChild).toHaveClass('grid')
  })

  it('applies column classes correctly', () => {
    const { container } = render(<Grid cols={3}>Content</Grid>)
    expect(container.firstChild).toHaveClass('grid-cols-3')
  })

  it('applies gap classes correctly', () => {
    const { container } = render(<Grid gap={6}>Content</Grid>)
    expect(container.firstChild).toHaveClass('gap-6')
  })

  it('applies responsive classes when enabled', () => {
    const { container } = render(<Grid responsive>Content</Grid>)
    expect(container.firstChild).toHaveClass('grid-cols-1', 'sm:grid-cols-2')
  })

  it('applies custom responsive breakpoints', () => {
    const { container } = render(<Grid smCols={2} mdCols={4} lgCols={6}>Content</Grid>)
    expect(container.firstChild).toHaveClass('sm:grid-cols-2', 'md:grid-cols-4', 'lg:grid-cols-6')
  })
})

describe('GridItem', () => {
  it('renders correctly', () => {
    const { container } = render(<GridItem>Item content</GridItem>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies span classes correctly', () => {
    const { container } = render(<GridItem colSpan={2} rowSpan={3}>Content</GridItem>)
    expect(container.firstChild).toHaveClass('col-span-2', 'row-span-3')
  })

  it('applies positioning classes correctly', () => {
    const { container } = render(
      <GridItem colStart={2} colEnd={4} rowStart={1} rowEnd={3}>
        Content
      </GridItem>
    )
    expect(container.firstChild).toHaveClass('col-start-2', 'col-end-4', 'row-start-1', 'row-end-3')
  })
})