;(function (global) {
  const GOTHAM_CENTER = [40.7128, -74.006]
  const DEFAULT_ZOOM = 12

  let activeMap = null
  let markerLayer = null
  let scanCircle = null

  function threatColor(threat) {
    if (threat === 'EXTREME') return '#ff3b3b'
    if (threat === 'HIGH') return '#ff8800'
    return '#ffd000'
  }

  function createBatIcon(color) {
    return L.divIcon({
      className: 'bat-map-marker',
      html: `<div class="bat-marker-pulse" style="--m-color:${color}"><span></span></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  }

  function initMap(containerEl, options = {}) {
    if (!global.L) {
      containerEl.innerHTML = '<p class="text-red">Map library loading failed. Check network.</p>'
      return null
    }

    if (activeMap) {
      activeMap.remove()
      activeMap = null
    }

    const map = L.map(containerEl, {
      center: options.center || GOTHAM_CENTER,
      zoom: options.zoom || DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        ' ',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map)

    markerLayer = L.layerGroup().addTo(map)

    const rogues = global.BatOS?.ROGUES || {}
    Object.entries(rogues).forEach(([id, r]) => {
      if (!r.lat || !r.lng) return
      const color = threatColor(r.threat)
      const marker = L.marker([r.lat, r.lng], { icon: createBatIcon(color) })
      marker.bindPopup(`
                <strong>${r.name}</strong><br>
                ${r.loc}<br>
                Threat: ${r.threat}<br>
                Status: ${r.status}
            `)
      marker.on('click', () => {
        options.onRogueClick?.(id, r)
      })
      marker.rogueId = id
      marker.addTo(markerLayer)
    })

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng
      options.onMapClick?.(lat, lng)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'BatcomputerOS/10.0 (Wayne Enterprises)'
            }
          }
        )
        const data = await res.json()
        const name =
          data.display_name?.split(',').slice(0, 3).join(', ') ||
          `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        options.onReverseGeocode?.(name, lat, lng, data)
      } catch {
        options.onReverseGeocode?.(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, null)
      }
    })

    activeMap = map
    setTimeout(() => map.invalidateSize(), 200)
    return map
  }

  function flyToRogue(rogueId) {
    const r = global.BatOS?.ROGUES?.[rogueId]
    if (!activeMap || !r?.lat) return false
    activeMap.flyTo([r.lat, r.lng], 15, { duration: 1.2 })
    markerLayer?.eachLayer((m) => {
      if (m.rogueId === rogueId) m.openPopup()
    })
    return true
  }

  function flyTo(lat, lng, zoom = 15) {
    if (!activeMap) return
    activeMap.flyTo([lat, lng], zoom, { duration: 1 })
  }

  function pulseScan(lat, lng) {
    if (!activeMap) return
    if (scanCircle) activeMap.removeLayer(scanCircle)
    scanCircle = L.circle([lat, lng], {
      radius: 800,
      color: '#00f0ff',
      fillColor: '#00f0ff',
      fillOpacity: 0.12,
      weight: 2
    }).addTo(activeMap)
    setTimeout(() => {
      if (scanCircle && activeMap) {
        activeMap.removeLayer(scanCircle)
        scanCircle = null
      }
    }, 4000)
  }

  function getMap() {
    return activeMap
  }

  function destroyMap() {
    if (activeMap) {
      activeMap.remove()
      activeMap = null
      markerLayer = null
      scanCircle = null
    }
  }

  global.BatMap = {
    GOTHAM_CENTER,
    initMap,
    flyToRogue,
    flyTo,
    pulseScan,
    getMap,
    destroyMap
  }
})(window)
