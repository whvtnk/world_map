import { useState, useRef, useEffect } from 'react'

const codeToFlag = (iso2) => {
  if (!iso2 || iso2.length !== 2) return '🏳'
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  )
}

export default function SearchBar({ countries, onSelect, disabled }) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [results, setResults] = useState([])
  const wrapRef = useRef(null)

  // Filter on every keystroke
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q || disabled) { setResults([]); setOpen(false); return }

    const matches = countries
      .filter(c =>
        c.name.common.toLowerCase().includes(q) ||
        c.cca2?.toLowerCase() === q ||
        c.cca3?.toLowerCase() === q
      )
      .slice(0, 9)

    setResults(matches)
    setOpen(matches.length > 0)
  }, [query, countries, disabled])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (country) => {
    setQuery(country.name.common)
    setOpen(false)
    onSelect(country)
  }

  return (
    <div className="search-wrap" ref={wrapRef}>
      {/* Search icon */}
      <svg className="search-icon" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>

      <input
        className="search-input"
        type="text"
        placeholder={disabled ? 'Loading countries…' : 'Search country…'}
        value={query}
        disabled={disabled}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); e.target.blur() }
          if (e.key === 'Enter' && results.length) pick(results[0])
        }}
        autoComplete="off"
        spellCheck="false"
      />

      {open && (
        <ul className="search-dropdown" role="listbox">
          {results.map(c => (
            <li
              key={c.cca3}
              className="search-item"
              role="option"
              onMouseDown={() => pick(c)}
            >
              <span className="search-item__flag">
                {c.flag || codeToFlag(c.cca2)}
              </span>
              <span className="search-item__name">{c.name.common}</span>
              <span className="search-item__region">{c.subregion || c.region || ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
