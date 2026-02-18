import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/EmptyState'

describe('EmptyState', () => {
  it('renders with required props', () => {
    render(<EmptyState title="No data" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders with message', () => {
    render(<EmptyState title="Empty" message="Nothing to show here" />)
    expect(screen.getByText('Empty')).toBeInTheDocument()
    expect(screen.getByText('Nothing to show here')).toBeInTheDocument()
  })

  it('renders action element when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Add Item</button>}
      />,
    )
    expect(screen.getByText('Add Item')).toBeInTheDocument()
  })
})
