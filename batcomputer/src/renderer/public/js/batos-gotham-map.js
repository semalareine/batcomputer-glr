;(function (global) {
  const { BatEvents, BatAudio, BatState, ROGUES } = global.BatOS
  let mapWinId = null

  function openGothamMap() {
    if (global.BatAudio) global.BatAudio.windowOpen()

    const body = `
        <div class="gotham-map-wrap">
            <div id="gotham-leaflet-map" class="gotham-leaflet-map"></div>
            <div class="map-sidebar glass-panel">
                <div class="map-threat">THREAT: <span id="map-threat">${BatState.threat}</span></div>
                <div id="map-info" class="map-info">Carto Dark · OpenStreetMap geocoding</div>
                <div id="map-coords" class="map-coords">—</div>
                <button type="button" class="btn-cyan" id="map-scan-btn">SCAN SECTOR</button>
                <button type="button" class="btn-cyan" id="map-center-btn">CENTER GOTHAM</button>
                <select id="map-rogue-select" class="map-select">
                    <option value="">Jump to rogue…</option>
                    ${Object.entries(ROGUES)
                      .map(([id, r]) => `<option value="${id}">${r.name}</option>`)
                      .join('')}
                </select>
            </div>
        </div>`

    mapWinId = global.createWindow({
      title: 'GOTHAM SURVEILLANCE',
      width: 780,
      height: 480,
      body,
      onCreated: (id, win) => {
        const container = win.querySelector('#gotham-leaflet-map')
        const info = win.querySelector('#map-info')
        const coords = win.querySelector('#map-coords')

        const map = global.BatMap.initMap(container, {
          onRogueClick: (rogueId, r) => {
            info.innerHTML = `<strong class="text-cyan">${r.name}</strong><br>${r.loc}<br>Threat: ${r.threat}`
            coords.textContent = `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`
            BatAudio.radar()
            BatEvents.emit('locate', { target: rogueId, rogue: r })
            if (typeof showNotification === 'function') showNotification('GPS TRACK', r.loc)
          },
          onReverseGeocode: (name, lat, lng) => {
            info.innerHTML = `<span class="text-cyan">SECTOR</span><br>${name}`
            coords.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            global.BatMap.pulseScan(lat, lng)
          }
        })

        win.querySelector('#map-scan-btn').addEventListener('click', () => {
          const c = map?.getCenter()
          if (c) global.BatMap.pulseScan(c.lat, c.lng)
          BatEvents.emit('scan', 'GOTHAM_MAP')
          BatAudio.scan()
        })

        win.querySelector('#map-center-btn').addEventListener('click', () => {
          map?.flyTo(global.BatMap.GOTHAM_CENTER, 12)
          BatAudio.click()
        })

        win.querySelector('#map-rogue-select').addEventListener('change', (e) => {
          const rid = e.target.value
          if (!rid) return
          global.BatMap.flyToRogue(rid)
          const r = ROGUES[rid]
          info.innerHTML = `<strong>${r.name}</strong><br>${r.loc}`
          BatEvents.emit('locate', { target: rid, rogue: r })
        })

        const ro = new ResizeObserver(() => map?.invalidateSize())
        ro.observe(container)
        win._mapResizeObs = ro
      }
    })
  }

  global.BatApps.openGothamMap = openGothamMap
  global.openGothamMap = openGothamMap

  BatEvents.on('locate', ({ target }) => {
    if (global.BatMap.getMap()) global.BatMap.flyToRogue(target)
  })
})(window)
