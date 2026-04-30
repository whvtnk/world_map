import { useEffect, useState } from 'react'

const fmt  = (n) => n == null ? '—' : new Intl.NumberFormat('en-US').format(n)
const fmtM = (n) => {
  if (n == null) return '—'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + ' T'
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + ' B'
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + ' M'
  return '$' + fmt(n)
}
const fmt1 = (n) => n == null ? '—' : n.toFixed(1)
const codeToFlag = (iso2) => {
  if (!iso2 || iso2.length !== 2) return '🏳'
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  )
}

const WB_INDICATORS = {
  gdp:          'NY.GDP.MKTP.CD',
  gdpPerCap:    'NY.GDP.PCAP.CD',
  gni:          'NY.GNP.MKTP.CD',
  inflation:    'FP.CPI.TOTL.ZG',
  unemployment: 'SL.UEM.TOTL.ZS',
  lifeExp:      'SP.DYN.LE00.IN',
  literacy:     'SE.ADT.LITR.ZS',
}

function InfoCard({ label, value, accent, full }) {
  return (
    <div className={`info-card${accent ? ' info-card--accent' : ''}${full ? ' info-card--full' : ''}`}>
      <div className="info-card__label">{label}</div>
      <div className="info-card__value">{value || '—'}</div>
    </div>
  )
}

function EconCard({ label, value, full }) {
  return (
    <div className={`econ-card${full ? ' econ-card--full' : ''}`}>
      <div className="econ-card__label">{label}</div>
      <div className="econ-card__value">{value}</div>
    </div>
  )
}

export default function SidePanel({ country, byCode3, isOpen, onClose }) {
  const [econ, setEcon]       = useState(null)
  const [econLoading, setEconLoading] = useState(false)

  // Fetch World Bank data whenever selected country changes
  useEffect(() => {
    if (!country) return
    setEcon(null)
    setEconLoading(true)

    const iso3 = country.cca3
    const fetchOne = async (code) => {
      try {
        const r = await fetch(
          `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&mrv=1&per_page=1`
        )
        const data = await r.json()
        return data?.[1]?.[0]?.value ?? null
      } catch { return null }
    }

    Promise.all(
      Object.entries(WB_INDICATORS).map(async ([key, code]) => [key, await fetchOne(code)])
    ).then(entries => {
      setEcon(Object.fromEntries(entries))
      setEconLoading(false)
    })
  }, [country?.cca3])

  if (!country) return null

  const flag      = country.flag || codeToFlag(country.cca2)
  const official  = country.name.official !== country.name.common ? country.name.official : ''
  const nativeArr = country.name?.nativeName
    ? Object.values(country.name.nativeName).map(n => n.common)
    : []
  const native = nativeArr[0] && nativeArr[0] !== country.name.common ? nativeArr[0] : ''
  const capital     = country.capital?.join(', ') || '—'
  const currencies  = country.currencies
    ? Object.values(country.currencies).map(c => `${c.name}${c.symbol ? ` (${c.symbol})` : ''}`).join(', ')
    : '—'
  const languages   = country.languages ? Object.values(country.languages).join(', ') : '—'
  const timezones   = country.timezones?.join(', ') || '—'
  const tld         = country.tld?.join(', ') || '—'
  const region      = [country.subregion, country.region].filter(Boolean).join(' · ')
  const borders     = country.borders?.length
    ? country.borders.map(b => byCode3[b]?.name.common || b).join(', ')
    : 'None'

  return (
    <aside className={`panel${isOpen ? ' panel--open' : ''}`}>
      {/* Header */}
      <div className="panel__header">
        <div className="panel__flag">{flag}</div>
        <div className="panel__names">
          <div className="panel__common">{country.name.common}</div>
          {official && <div className="panel__official">{official}</div>}
          {native   && <div className="panel__native">{native}</div>}
        </div>
        <button className="panel__close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Body */}
      <div className="panel__body">
        <div className="section-title">Geography</div>
        <div className="info-grid">
          <InfoCard label="Capital"    value={capital} />
          <InfoCard label="Region"     value={region} />
          <InfoCard label="Population" value={fmt(country.population)} accent />
          <InfoCard label="Area"       value={country.area ? fmt(Math.round(country.area)) + ' km²' : '—'} />
          <InfoCard label="Borders"    value={borders} full />
        </div>

        <div className="section-title">Details</div>
        <div className="info-grid">
          <InfoCard label="Currency"   value={currencies} full />
          <InfoCard label="Languages"  value={languages}  full />
          <InfoCard label="Timezone"   value={timezones} />
          <InfoCard label="TLD"        value={tld} />
        </div>

        <div className="section-title">Economic Data</div>
        {econLoading ? (
          <div className="econ-loading">Loading<span className="econ-dots" /></div>
        ) : econ ? (
          <>
            <div className="econ-grid">
              <EconCard label="GDP (current USD)"  value={fmtM(econ.gdp)}          full />
              <EconCard label="GDP per capita"     value={fmtM(econ.gdpPerCap)} />
              <EconCard label="GNI"                value={fmtM(econ.gni)} />
              <EconCard label="Inflation"          value={econ.inflation    != null ? fmt1(econ.inflation)    + '%' : '—'} />
              <EconCard label="Unemployment"       value={econ.unemployment != null ? fmt1(econ.unemployment) + '%' : '—'} />
              <EconCard label="Life Expectancy"    value={econ.lifeExp      != null ? fmt1(econ.lifeExp)      + ' yr' : '—'} />
              <EconCard label="Literacy Rate"      value={econ.literacy     != null ? fmt1(econ.literacy)     + '%' : '—'} />
            </div>
            <p className="econ-source">Source: World Bank · Most recent available</p>
          </>
        ) : (
          <p className="econ-source">No economic data available</p>
        )}
      </div>
    </aside>
  )
}
