import { useEffect, useRef, useState } from 'react'
import Globe from 'globe.gl'
import * as topojson from 'topojson-client'
import { NUM_TO_ALPHA3 } from '../data/numToAlpha3'

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'

// Creates a tiny canvas filled with dark navy — used as globe sphere "texture"
const darkGlobeTexture = () => {
  const c = document.createElement('canvas')
  c.width = 2; c.height = 2
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000d1a'
  ctx.fillRect(0, 0, 2, 2)
  return c.toDataURL()
}

// Hex dot colours
const COLOUR_DEFAULT  = 'rgba(0, 140, 200, 0.55)'
const COLOUR_HOVER    = 'rgba(0, 212, 255, 0.92)'
const COLOUR_SELECTED = 'rgba(10, 255, 178, 0.92)'

export default function GlobeView({ byCode3, selectedCountry, onCountrySelect, onProgress }) {
  const containerRef   = useRef(null)
  const globeRef       = useRef(null)
  const featuresRef    = useRef([])
  const hoveredRef     = useRef(null)
  const selectedFeatRef = useRef(null)

  // keep latest callbacks/data in refs → no stale closure in globe event handlers
  const byCode3Ref        = useRef(byCode3)
  const onCountrySelectRef = useRef(onCountrySelect)
  const onProgressRef      = useRef(onProgress)
  useEffect(() => { byCode3Ref.current = byCode3 },        [byCode3])
  useEffect(() => { onCountrySelectRef.current = onCountrySelect }, [onCountrySelect])
  useEffect(() => { onProgressRef.current = onProgress },  [onProgress])

  // Tooltip state (managed here, lives inside the globe container)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', pop: '' })

  // When selectedCountry changes from outside (search bar), sync to globe
  useEffect(() => {
    if (!globeRef.current) return
    if (!selectedCountry) {
      selectedFeatRef.current = null
    } else {
      const feat = featuresRef.current.find(
        f => f.properties.ISO_A3 === selectedCountry.cca3
      )
      selectedFeatRef.current = feat || null
      if (selectedCountry.latlng?.length === 2) {
        globeRef.current.pointOfView(
          { lat: selectedCountry.latlng[0], lng: selectedCountry.latlng[1], altitude: 2.0 },
          1200
        )
        globeRef.current.controls().autoRotate = false
      }
    }
    refreshColors()
  }, [selectedCountry]) // eslint-disable-line

  const refreshColors = () => {
    if (!globeRef.current) return
    const hov = hoveredRef.current
    const sel = selectedFeatRef.current
    globeRef.current.hexPolygonColor(f => {
      if (f === sel) return COLOUR_SELECTED
      if (f === hov) return COLOUR_HOVER
      return COLOUR_DEFAULT
    })
  }

  // One-time globe initialisation
  useEffect(() => {
    if (!containerRef.current || globeRef.current) return
    let destroyed = false

    const init = async () => {
      onProgressRef.current(10)

      let topo
      try {
        topo = await fetch(TOPO_URL).then(r => r.json())
      } catch (e) {
        console.error('TopoJSON load failed', e)
        onProgressRef.current(100)
        return
      }
      if (destroyed) return
      onProgressRef.current(42)

      // Convert TopoJSON → GeoJSON and attach ISO alpha-3 codes
      const geo = topojson.feature(topo, topo.objects.countries)
      geo.features.forEach(f => {
        f.properties.ISO_A3 = NUM_TO_ALPHA3[f.id] || null
      })
      featuresRef.current = geo.features
      if (destroyed) return
      onProgressRef.current(65)

      // ── Build Globe ──────────────────────────────────────────────────────
      const globe = Globe({ animateIn: false })
        // Dark solid sphere instead of satellite photo
        .globeImageUrl(darkGlobeTexture())
        .backgroundImageUrl(
          'https://unpkg.com/three-globe/example/img/night-sky.png'
        )
        .showAtmosphere(true)
        .atmosphereColor('rgba(0, 170, 255, 0.9)')
        .atmosphereAltitude(0.22)
        .showGraticules(true)
        // ── Hex-dot polygons ─────────────────────────────────────────────
        .hexPolygonData(geo.features)
        .hexPolygonResolution(4)       // ~56k hexagons — dot-matrix look
        .hexPolygonMargin(0.38)        // gap between dots
        .hexPolygonAltitude(0.002)
        .hexPolygonColor(() => COLOUR_DEFAULT)
        .hexPolygonLabel(() => null)
        .onHexPolygonHover((feat) => {
          if (destroyed) return
          hoveredRef.current = feat
          refreshColors()

          if (feat?.properties?.ISO_A3) {
            const c = byCode3Ref.current[feat.properties.ISO_A3]
            if (c) {
              setTooltip(t => ({
                ...t,
                visible: true,
                name: c.name.common,
                pop: c.population
                  ? new Intl.NumberFormat('en-US').format(c.population) + ' people'
                  : '',
              }))
              return
            }
          }
          setTooltip(t => ({ ...t, visible: !!feat, name: feat?.properties?.ISO_A3 || '', pop: '' }))
        })
        .onHexPolygonClick((feat) => {
          if (destroyed || !feat) return
          selectedFeatRef.current = feat
          refreshColors()
          globeRef.current?.controls && (globeRef.current.controls().autoRotate = false)

          const iso = feat.properties.ISO_A3
          if (iso) {
            const country = byCode3Ref.current[iso]
            if (country) onCountrySelectRef.current(country)
          }
        })
        (containerRef.current)

      if (destroyed) return

      globe.controls().autoRotate      = true
      globe.controls().autoRotateSpeed = 0.35
      globe.controls().enableDamping   = true
      globeRef.current = globe

      onProgressRef.current(82)

      globe.onGlobeReady(() => {
        if (!destroyed) onProgressRef.current(100)
      })
      // Hard fallback
      setTimeout(() => { if (!destroyed) onProgressRef.current(100) }, 5000)
    }

    init().catch(console.error)

    return () => {
      destroyed = true
      globeRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, []) // run once

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={e => setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }))}
      />

      {/* Country tooltip */}
      {tooltip.visible && tooltip.name && (
        <div
          className="globe-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <div className="globe-tooltip__name">{tooltip.name}</div>
          {tooltip.pop && <div className="globe-tooltip__pop">{tooltip.pop}</div>}
        </div>
      )}
    </div>
  )
}
