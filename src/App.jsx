import { useState, useEffect, useCallback } from 'react'
import LoadingScreen from './components/LoadingScreen'
import GlobeView    from './components/GlobeView'
import SearchBar    from './components/SearchBar'
import SidePanel    from './components/SidePanel'

const COUNTRIES_URL =
  'https://restcountries.com/v3.1/all' +
  '?fields=name,cca2,cca3,flag,capital,population,area,' +
  'region,subregion,currencies,languages,timezones,tld,latlng,borders'

export default function App() {
  // ── Loading state ────────────────────────────────────────────────────────
  const [progress,   setProgress]   = useState(0)
  const [loadingDone, setLoadingDone] = useState(false)

  // ── Country data (loaded in background) ─────────────────────────────────
  const [countries,  setCountries]  = useState([])
  const [byCode3,    setByCode3]    = useState({})

  // ── Selected country (panel) ─────────────────────────────────────────────
  const [selected, setSelected] = useState(null)

  // ── Fetch countries in background (doesn't block globe render) ───────────
  useEffect(() => {
    fetch(COUNTRIES_URL)
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          a.name.common.localeCompare(b.name.common)
        )
        setCountries(sorted)
        setByCode3(Object.fromEntries(sorted.map(c => [c.cca3, c])))
      })
      .catch(console.error)
  }, [])

  // ── Progress handler (called by GlobeView) ───────────────────────────────
  const handleProgress = useCallback((pct) => {
    setProgress(pct)
    if (pct >= 100) {
      // Small delay so "100%" is briefly visible before hiding
      setTimeout(() => setLoadingDone(true), 600)
    }
  }, [])

  // ── Country selection ────────────────────────────────────────────────────
  const handleCountrySelect = useCallback((country) => {
    setSelected(country)
  }, [])

  const handlePanelClose = useCallback(() => {
    setSelected(null)
  }, [])

  return (
    <>
      {/* ── Loading overlay ───────────────────────────────────────────── */}
      <LoadingScreen progress={progress} visible={!loadingDone} />

      {/* ── 3D Globe ─────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <GlobeView
          byCode3={byCode3}
          selectedCountry={selected}
          onCountrySelect={handleCountrySelect}
          onProgress={handleProgress}
        />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="header">
        <span className="header__brand">GLOBAL INSIGHTS</span>
        <div className="header__divider" />
        <SearchBar
          countries={countries}
          disabled={countries.length === 0}
          onSelect={handleCountrySelect}
        />
        <div className="header__stats">
          <div className="stat">
            <span className="stat__val">
              {countries.length > 0 ? countries.length : '195'}
            </span>
            <span className="stat__lbl">Countries</span>
          </div>
          <div className="stat">
            <span className="stat__val">8.1B</span>
            <span className="stat__lbl">Population</span>
          </div>
        </div>
      </header>

      {/* ── Side Panel ───────────────────────────────────────────────── */}
      <SidePanel
        country={selected}
        byCode3={byCode3}
        isOpen={!!selected}
        onClose={handlePanelClose}
      />

      {/* ── Bottom hint ──────────────────────────────────────────────── */}
      {loadingDone && !selected && (
        <div className="hint">
          🖱 Click a country to explore · Drag to rotate · Scroll to zoom
        </div>
      )}
    </>
  )
}
