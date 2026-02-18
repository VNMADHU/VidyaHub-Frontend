import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const SearchBar = ({ value, onChange, placeholder = 'Search...' }: SearchBarProps) => {
  return (
    <div
      style={{
        flexShrink: 0,
        background: 'var(--background)',
        paddingBottom: '1.5rem',
        marginBottom: 0,
      }}
    >
      <div style={{ position: 'relative' }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 0.75rem 0.75rem 2.75rem',
            fontSize: '1rem',
            borderRadius: '8px',
            border: '1px solid #ddd',
            transition: 'border-color 0.2s',
            outline: 'none',
            background: 'var(--surface)',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
          onBlur={(e) => (e.target.style.borderColor = '#ddd')}
        />
      </div>
    </div>
  )
}

export default SearchBar
