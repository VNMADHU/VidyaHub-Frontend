import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from '@/components/SearchBar'

describe('SearchBar', () => {
  it('renders with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} placeholder="Search students..." />)
    expect(screen.getByPlaceholderText('Search students...')).toBeInTheDocument()
  })

  it('displays current value', () => {
    render(<SearchBar value="John" onChange={() => {}} />)
    expect(screen.getByDisplayValue('John')).toBeInTheDocument()
  })

  it('calls onChange when user types', () => {
    let value = ''
    const onChange = (v: string) => { value = v }
    render(<SearchBar value="" onChange={onChange} placeholder="Search..." />)

    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(value).toBe('test')
  })
})
