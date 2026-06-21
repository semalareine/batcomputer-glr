;(function (global) {
  const { BatEvents, BatAudio, BatFS, BatState, BatFX, BatDock, ROGUES, ORACLE_REPLIES } =
    global.BatOS

  let radarWinId = null
  let mapWinId = null
  let voiceListening = false
  let intrusionInterval = null

  function openApp(title, width, height, body, onCreated) {
    BatAudio.windowOpen()
    if (typeof createWindow === 'function') {
      return createWindow({ title, width, height, body, onCreated })
    }
  }

  function openOracle() {
    const body = `
        <div class="oracle-panel glass-panel">
            <div class="oracle-header"><span class="oracle-dot"></span> ORACLE AI — SECURE CHANNEL</div>
            <div id="oracle-chat" class="oracle-chat">
                <div class="oracle-msg system">Oracle online. How can I assist, Bruce?</div>
            </div>
            <form class="oracle-input-row" id="oracle-form">
                <input type="text" id="oracle-input" placeholder="Ask Oracle..." spellcheck="false" autocomplete="off" />
                <button type="submit" class="btn-cyan">SEND</button>
            </form>
        </div>`
    openApp('ORACLE AI', 480, 420, body, (id, win) => {
      const chat = win.querySelector('#oracle-chat')
      const form = win.querySelector('#oracle-form')
      const input = win.querySelector('#oracle-input')
      const reply = (text, cls = 'oracle') => {
        const d = document.createElement('div')
        d.className = `oracle-msg ${cls}`
        d.textContent = text
        chat.appendChild(d)
        chat.scrollTop = chat.scrollHeight
      }
      form.onsubmit = (e) => {
        e.preventDefault()
        const q = input.value.trim()
        if (!q) return
        reply(q, 'user')
        input.value = ''
        BatAudio.click()
        setTimeout(
          () => {
            const low = q.toLowerCase()
            let found = ORACLE_REPLIES.find((r) => r.keys.some((k) => low.includes(k)))
            if (!found)
              found = {
                reply: `Processing "${q}"... No immediate threat. Recommend scan sector 7.`
              }
            reply(found.reply)
            BatEvents.emit('oracle', { query: q })
          },
          400 + Math.random() * 600
        )
      }
      input.focus()
    })
  }

  function openGothamMap() {
    const body = `
        <div class="gotham-map-wrap glass-panel">
            <canvas id="gotham-canvas" width="520" height="360"></canvas>
            <div class="map-sidebar">
                <div class="map-threat">THREAT: <span id="map-threat">${BatState.threat}</span></div>
                <div id="map-info" class="map-info">Click a sector or blip to track.</div>
                <button class="btn-cyan" id="map-scan-btn">SCAN SECTOR</button>
            </div>
        </div>`
    mapWinId = openApp('GOTHAM SURVEILLANCE', 680, 440, body, (id, win) => {
      const canvas = win.querySelector('#gotham-canvas')
      const ctx = canvas.getContext('2d')
      const info = win.querySelector('#map-info')
      const sectors = [
        { name: 'Narrows', x: 0.25, y: 0.7 },
        { name: 'Docks', x: 0.75, y: 0.75 },
        { name: 'Arkham', x: 0.4, y: 0.35 },
        { name: 'Mile', x: 0.6, y: 0.5 },
        { name: 'Wayne Tower', x: 0.5, y: 0.25 }
      ]
      const draw = () => {
        const w = canvas.width
        const h = canvas.height
        ctx.fillStyle = '#050505'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
        for (let i = 0; i < 12; i++) {
          ctx.beginPath()
          ctx.moveTo((w / 12) * i, 0)
          ctx.lineTo((w / 12) * i, h)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, (h / 8) * i)
          ctx.lineTo(w, (h / 8) * i)
          ctx.stroke()
        }
        Object.values(ROGUES).forEach((r) => {
          const x = r.lng * w
          const y = r.lat * h
          ctx.fillStyle = r.threat === 'EXTREME' ? '#ff3b3b' : '#ffd000'
          ctx.beginPath()
          ctx.arc(x, y, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#888'
          ctx.font = '10px monospace'
          ctx.fillText(r.name.split(' ').pop(), x + 8, y)
        })
      }
      draw()
      canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        const near = Object.entries(ROGUES).find(([, r]) => Math.hypot(r.lng - x, r.lat - y) < 0.08)
        if (near) {
          const [id, r] = near
          info.innerHTML = `<span class="text-cyan">${r.name}</span><br>${r.loc}<br>Threat: ${r.threat}`
          BatAudio.radar()
          BatEvents.emit('locate', { target: id, rogue: r })
          if (typeof showNotification === 'function') showNotification('GPS TRACK', r.loc)
        } else {
          const sec = sectors.find((s) => Math.hypot(s.x - x, s.y - y) < 0.12)
          info.textContent = sec
            ? `Sector: ${sec.name} — scanning...`
            : `Coords: ${(x * 100).toFixed(1)}, ${(y * 100).toFixed(1)}`
        }
      }
      win.querySelector('#map-scan-btn').onclick = () => {
        BatEvents.emit('scan', 'GOTHAM_MAP')
        BatAudio.scan()
      }
    })
  }

  function openRadar() {
    const body = `
        <div class="radar-container">
            <div class="radar-box" id="interactive-radar">
                <div class="radar-cross-h"></div><div class="radar-cross-v"></div>
                <div class="radar-ring"></div><div class="radar-ring"></div><div class="radar-ring"></div>
                <div class="radar-sweep"></div>
                <div class="radar-dot radar-click" data-target="joker" style="top:30%;left:60%"></div>
                <div class="radar-dot radar-click" data-target="penguin" style="top:55%;left:25%"></div>
                <div class="radar-dot radar-click" data-target="bane" style="top:70%;left:75%"></div>
            </div>
            <div class="radar-status">
                <div>SECTOR: GOTHAM METROPOLITAN</div>
                <div id="radar-readout">RANGE: 25KM — CLICK BLIP TO TRACK</div>
                <div class="blink-text">● LIVE TRACKING ACTIVE</div>
            </div>
        </div>`
    radarWinId = openApp('RADAR SCAN', 380, 480, body, (id, win) => {
      win.querySelectorAll('.radar-click').forEach((dot) => {
        dot.style.cursor = 'pointer'
        dot.onclick = () => {
          const t = dot.dataset.target
          const r = ROGUES[t]
          win.querySelector('#radar-readout').textContent =
            `LOCK: ${r?.name || t} — ${r?.loc || 'UNKNOWN'}`
          BatAudio.radar()
          BatEvents.emit('locate', { target: t, rogue: r })
          BatFX.pulseRadar()
        }
      })
    })
  }

  function openCrack() {
    const code = 'WAYNE-' + Math.random().toString(36).slice(2, 8).toUpperCase()
    const body = `
        <div class="crack-panel glass-panel">
            <div class="crack-title">CRYPTEX BYPASS — LEVEL 10</div>
            <div class="crack-hash">TARGET: ${code}</div>
            <div class="crack-progress"><div id="crack-bar" class="crack-bar" style="width:0%"></div></div>
            <div id="crack-status" class="crack-status">Type fragments below. Match: ${code}</div>
            <input type="text" id="crack-input" class="crack-input" placeholder="Enter decryption key..." />
            <button class="btn-cyan" id="crack-brute">BRUTE FORCE</button>
        </div>`
    openApp('DECRYPT INTERFACE', 420, 280, body, (id, win) => {
      const bar = win.querySelector('#crack-bar')
      const status = win.querySelector('#crack-status')
      const input = win.querySelector('#crack-input')
      let progress = 0
      const tick = () => {
        progress = Math.min(100, progress + Math.random() * 12)
        bar.style.width = progress + '%'
        status.textContent = `Decrypting... ${Math.floor(progress)}% — ${BatFX.randomIP()}`
        BatAudio.hack()
        if (progress >= 100) {
          status.innerHTML = '<span class="text-emerald">ACCESS GRANTED</span> — Vault open.'
          BatAudio.granted()
          BatEvents.emit('crack', { success: true })
          if (typeof showNotification === 'function')
            showNotification('DECRYPT', 'Encryption broken.')
        } else setTimeout(tick, 200)
      }
      input.oninput = () => {
        if (input.value.toUpperCase() === code) {
          progress = 100
          bar.style.width = '100%'
          status.innerHTML = '<span class="text-emerald">KEY MATCH — ACCESS GRANTED</span>'
          BatAudio.granted()
        }
      }
      win.querySelector('#crack-brute').onclick = tick
    })
  }

  function openBrowser() {
    const body = `
        <div class="browser-panel">
            <div class="browser-bar">
                <input id="browser-url" value="https://gotham.wayne-net.secure/home" />
                <button class="btn-cyan" id="browser-go">GO</button>
            </div>
            <div id="browser-content" class="browser-content glass-panel">
                <h3 class="text-yellow">WAYNE ENTERPRISES — INTRANET</h3>
                <p>Welcome, authorized user. Gotham operations dashboard.</p>
                <ul class="browser-links">
                    <li data-page="news">Gotham News Wire</li>
                    <li data-page="sat">Satellite Uplink Status</li>
                    <li data-page="dark">Encrypted Relay (restricted)</li>
                </ul>
            </div>
        </div>`
    openApp('BAT-NET BROWSER', 560, 400, body, (id, win) => {
      const content = win.querySelector('#browser-content')
      const pages = {
        news: '<h3>Gotham Chronicle</h3><p>Crime down 12% in East End. Mayor denies corruption allegations.</p>',
        sat: '<h3>Satellites</h3><p>14 birds online. Latency 12ms. Encryption quantum-grade.</p>',
        dark: '<h3 class="text-red">DARK RELAY</h3><p>Connection encrypted. Use Dark Web app for full interface.</p>'
      }
      win.querySelectorAll('.browser-links li').forEach((li) => {
        li.onclick = () => {
          content.innerHTML = pages[li.dataset.page] || ''
          BatAudio.click()
        }
      })
      win.querySelector('#browser-go').onclick = () => {
        BatAudio.click()
        content.innerHTML = `<p>Loading ${win.querySelector('#browser-url').value}...</p><p class="text-emerald">Secure tunnel established via ${BatFX.randomIP()}</p>`
      }
    })
  }

  function openDarkWeb() {
    const body = `
        <div class="darkweb-panel">
            <div class="darkweb-header text-red">◆ ONION ROUTING ACTIVE ◆</div>
            <div id="darkweb-log" class="darkweb-log"></div>
            <button class="btn-red" id="darkweb-ping">PING HIDDEN NODE</button>
        </div>`
    openApp('DARK WEB / ENCRYPTED NET', 500, 380, body, (id, win) => {
      const log = win.querySelector('#darkweb-log')
      const add = (t) => {
        log.innerHTML += `<div>${BatFX.militaryTime()} ${t}</div>`
        log.scrollTop = log.scrollHeight
      }
      add('Tor circuit established.')
      add(`Exit node: ${BatFX.randomIP()}`)
      win.querySelector('#darkweb-ping').onclick = () => {
        BatAudio.hack()
        add(
          `Response from hidden service: ${BatFX.randomIP()} — latency ${Math.floor(Math.random() * 200)}ms`
        )
      }
    })
  }

  function openCameras() {
    const cams = [
      'Arkham Perimeter',
      'Batcave Entrance',
      'GCPD Roof',
      'Ace Chemicals',
      'Wayne Tower'
    ]
    const body = `
        <div class="camera-grid">
            ${cams
              .map(
                (n, i) => `
            <div class="cam-feed glass-panel" data-cam="${i}">
                <div class="cam-label">${n}</div>
                <canvas class="cam-canvas" width="200" height="120"></canvas>
                <div class="cam-static">LIVE</div>
            </div>`
              )
              .join('')}
        </div>`
    openApp('SECURITY FEEDS', 680, 420, body, (id, win) => {
      win.querySelectorAll('.cam-canvas').forEach((c) => {
        const ctx = c.getContext('2d')
        const anim = () => {
          if (!document.getElementById(id)) return
          ctx.fillStyle = `rgb(${Math.random() * 30},${Math.random() * 40},${Math.random() * 30})`
          ctx.fillRect(0, 0, c.width, c.height)
          ctx.fillStyle = 'rgba(0,255,0,0.3)'
          for (let i = 0; i < 5; i++)
            ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 20)
          requestAnimationFrame(anim)
        }
        anim()
      })
    })
  }

  function openCriminalDB() {
    const rows = Object.entries(ROGUES)
      .map(
        ([id, r]) => `
            <tr class="db-row" data-id="${id}">
                <td>${r.name}</td><td class="text-red">${r.threat}</td><td>${r.status}</td><td>${r.loc}</td>
                <td><button class="btn-cyan btn-sm track-btn">TRACK</button></td>
            </tr>`
      )
      .join('')
    const body = `
        <div class="criminal-db glass-panel">
            <table class="db-table"><thead><tr><th>NAME</th><th>THREAT</th><th>STATUS</th><th>LOCATION</th><th></th></tr></thead>
            <tbody>${rows}</tbody></table>
            <pre id="db-detail" class="db-detail">Select a record.</pre>
        </div>`
    openApp('CRIMINAL DATABASE', 620, 420, body, (id, win) => {
      const detail = win.querySelector('#db-detail')
      win.querySelectorAll('.db-row').forEach((row) => {
        row.onclick = () => {
          const r = ROGUES[row.dataset.id]
          detail.textContent = `${r.name}\nStatus: ${r.status}\nLocation: ${r.loc}\nThreat: ${r.threat}\n\n[CLASSIFIED MODUS FILE AVAILABLE]`
          BatAudio.click()
        }
      })
      win.querySelectorAll('.track-btn').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation()
          const id = btn.closest('tr').dataset.id
          BatEvents.emit('locate', { target: id, rogue: ROGUES[id] })
          if (typeof showNotification === 'function') showNotification('TRACK', ROGUES[id].loc)
        }
      })
    })
  }

  function openEvidence() {
    const body = `
        <div class="evidence-panel glass-panel">
            <div class="holo-preview" id="holo-preview">
                <div class="holo-scan-line"></div>
                <div class="holo-content">◈ EVIDENCE SAMPLE #12 ◈<br>Fiber / DNA partial match</div>
            </div>
            <div class="evidence-controls">
                <label>Analysis:</label>
                <select id="evidence-type"><option>Fiber</option><option>DNA</option><option>Fingerprint</option></select>
                <button class="btn-cyan" id="evidence-run">RUN ANALYSIS</button>
            </div>
            <pre id="evidence-out" class="evidence-out">Awaiting sample...</pre>
        </div>`
    openApp('EVIDENCE ANALYZER', 480, 380, body, (id, win) => {
      const out = win.querySelector('#evidence-out')
      const holo = win.querySelector('#holo-preview')
      win.querySelector('#evidence-run').onclick = () => {
        holo.classList.add('holo-active')
        BatAudio.scan()
        let p = 0
        const iv = setInterval(() => {
          p += 20
          out.textContent = `Analyzing ${win.querySelector('#evidence-type').value}...\n${p}% complete\nEntropy: ${(Math.random() * 100).toFixed(2)}`
          if (p >= 100) {
            clearInterval(iv)
            out.textContent +=
              '\n\nMATCH: Wayne Tech synthetic blend (87%)\nRecommend: Detective Mode on case_47b.lore'
            BatAudio.granted()
          }
        }, 400)
      }
    })
  }

  function openRiddlerProtocol() {
    const REQUIRED_CODE = ' 121108250108 '
    const body = `
        <div class="riddler-panel glass-panel" id="riddler-panel">
            <div class="riddler-header"><span class="riddler-header-mark">&lt;?&gt;</span> RIDDLER PROTOCOL</div>
            <div class="riddler-term" id="riddler-term"></div>
            <form class="riddler-input-row" id="riddler-form" autocomplete="off">
                <span class="riddler-prompt">CODE&gt;</span>
                <input type="text" id="riddler-code" spellcheck="false" autocomplete="off" />
                <button type="submit" class="btn-cyan">ENTER</button>
            </form>
            <div class="riddler-status" id="riddler-status"></div>
        </div>`

    BatAudio.windowOpen()
    global.createWindow({
      title: 'RIDDLER PROTOCOL',
      width: 520,
      height: 360,
      appId: 'riddler',
      body,
      onCreated: (id, win) => {
        const term = win.querySelector('#riddler-term')
        const form = win.querySelector('#riddler-form')
        const input = win.querySelector('#riddler-code')
        const status = win.querySelector('#riddler-status')
        const panel = win.querySelector('#riddler-panel')
        const add = (t, cls = '') => {
          const d = document.createElement('div')
          d.className = `riddler-line ${cls}`.trim()
          d.textContent = t
          term.appendChild(d)
          term.scrollTop = term.scrollHeight
        }

        add('SECURE TUNNEL ESTABLISHED.', 'text-emerald')
        add('ENTER SECRET CODE TO DECRYPT THEME VAULT.')

        if (global.BatTheme?.isThemeUnlocked?.('riddler')) {
          add('VAULT STATUS: UNLOCKED.', 'text-emerald')
          status.textContent = 'Riddler Theme already unlocked.'
          status.className = 'riddler-status text-emerald'
        }

        const unlockAnim = () => {
          panel?.classList.add('riddler-unlocking')
          add('VALIDATING…')
          BatAudio.hack()
          setTimeout(() => {
            add(`HANDSHAKE: ${BatFX.randomIP()}`)
            BatAudio.hack()
          }, 220)
          setTimeout(() => {
            add('DECRYPTING VAULT…')
            BatAudio.hack()
          }, 520)
          setTimeout(() => {
            panel?.classList.add('riddler-unlocked')
            const r = global.BatTheme?.unlockTheme?.('riddler')
            if (r?.ok) {
              add('VAULT OPEN — THEME UNLOCKED.', 'text-emerald')
              add('Congratulations, Bats ;)', 'text-emerald')
              status.textContent = 'Theme unlocked. Open Settings to activate.'
              status.className = 'riddler-status text-emerald'
              BatAudio.granted()
              BatFX.glitch(win, 450)
              if (typeof showNotification === 'function') {
                showNotification('RIDDLER PROTOCOL', 'Riddler Theme unlocked.')
              }
            } else {
              status.textContent = 'Unlock failed.'
              status.className = 'riddler-status text-red'
              BatAudio.denied()
            }
          }, 1100)
        }

        form.onsubmit = (e) => {
          e.preventDefault()
          const entered = input.value
          status.textContent = ''
          if (entered === REQUIRED_CODE || entered.trim() === REQUIRED_CODE.trim()) {
            input.disabled = true
            form.querySelector('button')?.setAttribute('disabled', 'disabled')
            unlockAnim()
          } else {
            status.textContent = 'ERROR: INVALID CODE'
            status.className = 'riddler-status text-red'
            add('ACCESS DENIED.', 'text-red')
            BatAudio.denied()
          }
        }

        input.focus()
      }
    })
  }

  function openBatmobilePanel() {
    const body = `
        <div class="batmobile-panel glass-panel">
            <h3 class="text-yellow">BATMOBILE DIAGNOSTICS</h3>
            <div class="diag-grid">
                <div>Fuel</div><div><div class="diag-bar"><div style="width:94%"></div></div> 94%</div>
                <div>Armor</div><div class="text-emerald">INTACT</div>
                <div>Weapons</div><div class="text-red">ARMED</div>
                <div>Engine</div><div>Jet Turbine STANDBY</div>
            </div>
            <button class="btn-cyan" id="batmobile-engage">ENGAGE STEALTH</button>
        </div>`
    openApp('BATMOBILE', 400, 320, body, (id, win) => {
      win.querySelector('#batmobile-engage').onclick = () => {
        BatAudio.granted()
        if (typeof showNotification === 'function')
          showNotification('BATMOBILE', 'Stealth mode engaged. En route.')
        BatEvents.emit('batmobile', {})
      }
    })
  }

  function openMedia() {
    const body = `
        <div class="media-panel glass-panel">
            <div class="media-visualizer" id="media-viz"></div>
            <div class="media-track text-cyan">♪ Gotham Night — Ambient Surveillance Mix</div>
            <div class="media-controls">
                <button class="btn-cyan" id="media-play">▶ PLAY</button>
                <button class="btn-cyan" id="media-stop">■ STOP</button>
            </div>
        </div>`
    openApp('AUDIO / MEDIA', 400, 280, body, (id, win) => {
      const viz = win.querySelector('#media-viz')
      let anim
      win.querySelector('#media-play').onclick = () => {
        BatAudio.click()
        cancelAnimationFrame(anim)
        const bars = Array.from({ length: 24 }, () => document.createElement('div'))
        bars.forEach((b) => {
          b.className = 'viz-bar'
          viz.appendChild(b)
        })
        const loop = () => {
          bars.forEach((b) => {
            b.style.height = Math.random() * 60 + 10 + 'px'
          })
          anim = requestAnimationFrame(loop)
        }
        loop()
      }
      win.querySelector('#media-stop').onclick = () => {
        viz.innerHTML = ''
        cancelAnimationFrame(anim)
      }
    })
  }

  function openSatellites() {
    const body = `
        <div class="sat-panel glass-panel">
            <canvas id="sat-canvas" width="500" height="280"></canvas>
            <div id="sat-feed" class="sat-feed">Acquiring signal...</div>
        </div>`
    openApp('SATELLITE FEED', 540, 380, body, (id, win) => {
      const canvas = win.querySelector('#sat-canvas')
      const ctx = canvas.getContext('2d')
      const feed = win.querySelector('#sat-feed')
      let t = 0
      const draw = () => {
        if (!document.getElementById(id)) return
        t++
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < 80; i++) {
          ctx.fillStyle = `rgba(0,${200 + Math.random() * 55},255,${Math.random()})`
          ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1)
        }
        ctx.strokeStyle = '#00f0ff'
        ctx.beginPath()
        ctx.arc(canvas.width / 2, canvas.height / 2, 40 + Math.sin(t * 0.05) * 10, 0, Math.PI * 2)
        ctx.stroke()
        feed.textContent = `SAT-${Math.floor(Math.random() * 14) + 1} | ${BatFX.militaryTime()} | ENC ${(95 + Math.random() * 5).toFixed(1)}%`
        requestAnimationFrame(draw)
      }
      draw()
    })
  }

  function openSettings() {
    const body = `
        <div class="settings-panel glass-panel">
            <h3 class="text-yellow">SYSTEM SETTINGS</h3>
            <label class="setting-row"><input type="checkbox" id="set-sound" ${BatState.sound ? 'checked' : ''}/> UI Sounds</label>
            <label class="setting-row"><input type="checkbox" id="set-crt" ${BatState.crt ? 'checked' : ''}/> CRT Monitor Effect</label>
            <label class="setting-row"><input type="checkbox" id="set-particles" ${BatState.settings.particles ? 'checked' : ''}/> Particle Background</label>
            <label class="setting-row"><input type="checkbox" id="set-stream" ${BatState.settings.dataStream ? 'checked' : ''}/> Data Stream HUD</label>
            <label class="setting-row">Profile: <select id="set-profile"><option value="bruce">Bruce Wayne L10</option><option value="nightwing">Nightwing L8</option><option value="robin">Robin L6</option></select></label>
            <button class="btn-cyan" id="set-fullscreen">FULLSCREEN</button>
        </div>`
    openApp('SETTINGS', 360, 340, body, (id, win) => {
      win.querySelector('#set-sound').onchange = (e) => {
        BatState.sound = e.target.checked
      }
      win.querySelector('#set-crt').onchange = (e) => BatFX.setCRT(e.target.checked)
      win.querySelector('#set-particles').onchange = (e) => {
        BatState.settings.particles = e.target.checked
      }
      win.querySelector('#set-stream').onchange = (e) => {
        BatState.settings.dataStream = e.target.checked
      }
      win.querySelector('#set-profile').onchange = (e) => {
        BatState.profile = e.target.value
      }
      win.querySelector('#set-fullscreen').onclick = () => {
        if (typeof enterFullscreen === 'function') enterFullscreen()
      }
    })
  }

  function openFacialScan() {
    const body = `
        <div class="bio-scan glass-panel">
            <div class="bio-face-ring"></div>
            <div id="bio-status" class="bio-status">Place subject in frame...</div>
            <button class="btn-cyan" id="bio-start">INITIATE SCAN</button>
        </div>`
    openApp('BIOMETRIC SCAN', 360, 340, body, (id, win) => {
      const st = win.querySelector('#bio-status')
      win.querySelector('#bio-start').onclick = () => {
        const steps = [
          'Mapping facial geometry...',
          'Retinal pattern: MATCH',
          'Voice print: CONFIRMED',
          'Identity: BRUCE WAYNE'
        ]
        let i = 0
        BatAudio.scan()
        const iv = setInterval(() => {
          if (i < steps.length) {
            st.textContent = steps[i++]
            BatAudio.hack()
          } else {
            clearInterval(iv)
            st.innerHTML = '<span class="text-emerald">VERIFIED — LEVEL 10</span>'
            BatAudio.granted()
          }
        }, 700)
      }
    })
  }

  function renderFileBrowser(path, container, win) {
    const list = BatFS.list(path)
    if (list.error) {
      container.innerHTML = `<p class="text-red">${list.error}</p>`
      return
    }
    container.querySelector('.fb-path').textContent = path
    const ul = container.querySelector('.fb-list')
    ul.innerHTML = list
      .map(
        (item) => `
            <li class="fb-item${item.detective ? ' detective-clue-file' : ''}" data-name="${escapeHtml(item.rawName)}" data-type="${item.type}" data-detective="${item.detective}">
                <span class="fb-name">${escapeHtml(item.name)}</span><span class="fb-size">${item.size}</span>
            </li>`
      )
      .join('')
    ul.querySelectorAll('.fb-item').forEach((li) => {
      li.ondblclick = () => {
        const name = li.dataset.name
        if (li.dataset.type === 'dir') {
          renderFileBrowser(
            path === '/root' ? `/root/${name}` : `${path}/${name}`.replace('//', '/'),
            container,
            win
          )
        } else {
          const full = path === '/root' ? `/root/${name}` : `${path}/${name}`
          const file = BatFS.read(full)
          if (typeof openFileViewer === 'function') openFileViewer(name, file)
          else if (file.content) {
            openApp('FILE: ' + name, 450, 350, `<pre class="file-viewer">${file.content}</pre>`)
          }
        }
        BatAudio.click()
      }
    })
  }

  function openFiles() {
    const body = `
        <div class="file-browser" id="fb-root">
            <div class="fb-path">/root</div>
            <ul class="fb-list"></ul>
        </div>`
    openApp('FILE BROWSER', 420, 400, body, (id, win) => {
      renderFileBrowser('/root', win.querySelector('#fb-root'), win)
    })
  }

  function openFileViewer(name, file) {
    let content = file.content || file.error || 'Empty'
    if (BatState.detective && file.detective) {
      content +=
        '\n\n[DETECTIVE MODE] Hidden: Talon symbol etched on fiber. Court of Owls suspected.'
    }
    const richContent = (file.richContent || '').trim()
    const body = richContent
      ? `<div class="file-viewer file-viewer-rich glass-panel">${richContent}</div>`
      : `<pre class="file-viewer glass-panel">${escapeHtml(content)}</pre>`

    openApp('FILE: ' + name, 480, 360, body, (id, win) => {
      if (!richContent) return
      win.querySelectorAll('[data-open-browser]').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault()
          const url = link.dataset.openBrowser || link.getAttribute('href') || ''
          if (!url) return
          global.BatApps?.openBrowser?.(url)
        })
      })
    })
  }

  function openEncounters() {
    const entries = Object.entries(ROGUES)
      .map(
        ([id, r]) => `
            <div class="encounter-entry" data-id="${id}">
                <div class="name">${r.name}</div>
                <div class="status ${r.status === 'CONTAINED' ? 'inactive' : 'active'}">● ${r.status}</div>
                <div style="font-size:11px;color:#888;margin-top:4px">${r.loc} | Threat: ${r.threat}</div>
                <button class="btn-cyan btn-sm" style="margin-top:6px">TRACK</button>
            </div>`
      )
      .join('')
    const body = `<div class="encounter-log">${entries}</div>`
    openApp('ROGUE GALLERY — ENCOUNTERS', 400, 480, body, (id, win) => {
      win.querySelectorAll('.encounter-entry').forEach((el) => {
        el.querySelector('button').onclick = () => {
          BatEvents.emit('locate', { target: el.dataset.id, rogue: ROGUES[el.dataset.id] })
          openGothamMap()
        }
      })
    })
  }

  function toggleDetective() {
    BatFX.setDetective(!BatState.detective)
    BatAudio.click()
  }

  function toggleLockdown(on) {
    const next = on !== undefined ? on : !BatState.lockdown
    BatFX.setLockdown(next)
    if (next && typeof showAlert === 'function') {
      showAlert('⚠ LOCKDOWN', 'All external interfaces sealed. Batcave protocols active.')
    }
  }

  function startIntrusionWatch() {
    if (intrusionInterval) return
    intrusionInterval = setInterval(() => {
      if (!document.getElementById('desktop')?.classList.contains('active') || BatState.lockdown)
        return
      if (Math.random() > 0.92) {
        BatState.threat = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)]
        const el = document.getElementById('threat-level')
        if (el) el.textContent = BatState.threat
        BatAudio.alert()
        if (typeof showNotification === 'function') {
          showNotification('INTRUSION DETECTED', `Unauthorized probe from ${BatFX.randomIP()}`)
        }
        BatFX.glitch(document.getElementById('topbar'))
      }
    }, 15000)
  }

  function initVoice() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    global.batVoiceRec = rec
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase()
      if (text.includes('oracle')) openOracle()
      else if (text.includes('scan')) BatEvents.emit('scan', 'VOICE')
      else if (text.includes('lockdown')) toggleLockdown(true)
      else if (text.includes('radar')) openRadar()
      else if (text.includes('detective')) toggleDetective()
      else if (typeof showNotification === 'function') showNotification('VOICE', `Heard: ${text}`)
    }
  }

  function toggleVoice() {
    const rec = global.batVoiceRec
    if (!rec) {
      if (typeof showNotification === 'function')
        showNotification('VOICE', 'Speech recognition not supported.')
      return
    }
    if (voiceListening) {
      rec.stop()
      voiceListening = false
      return
    }
    voiceListening = true
    rec.start()
    if (typeof showNotification === 'function') showNotification('VOICE', 'Listening...')
    rec.onend = () => {
      voiceListening = false
    }
  }

  function quitApplication() {
    try {
      ;(global.api?.appControl || global.parent?.api?.appControl)?.quit?.()
    } catch (_) {}
  }

  function wireEvents() {
    BatEvents.on('scan', (target) => {
      BatAudio.scan()
      BatFX.pulseRadar()
      BatFX.spikeSysMon()
      if (typeof showNotification === 'function')
        showNotification('SCAN', `Deep scan: ${target || 'GOTHAM'}`)
      if (!document.getElementById(radarWinId)) openRadar()
    })
    BatEvents.on('locate', ({ target, rogue }) => {
      BatAudio.radar()
      if (typeof appendOutput === 'function' && document.getElementById('term-output')) {
        appendOutput(`GPS: ${rogue?.name || target} @ ${rogue?.loc || 'UNKNOWN'}`, 'success')
      }
    })
  }

  function initDesktopExtras() {
    BatFX.init()
    BatDock.init()
    wireEvents()
    initVoice()
    startIntrusionWatch()
    document.addEventListener('keydown', (e) => {
      global.batKeyBuf = (global.batKeyBuf || '') + e.key
      if (global.batKeyBuf.length > 20) global.batKeyBuf = global.batKeyBuf.slice(-20)
      if (global.batKeyBuf.includes('batadmin')) {
        BatState.profile = 'admin'
        if (typeof showNotification === 'function')
          showNotification('ADMIN', 'Hidden clearance unlocked.')
        global.batKeyBuf = ''
      }
    })
  }

  global.BatApps = {
    openOracle,
    openGothamMap,
    openRadar,
    openCrack,
    openBrowser,
    openDarkWeb,
    openCameras,
    openCriminalDB,
    openEvidence,
    openRiddlerProtocol,
    openBatmobilePanel,
    openMedia,
    openSatellites,
    openSettings,
    openFacialScan,
    openFiles,
    openEncounters,
    openFileViewer,
    toggleDetective,
    toggleLockdown,
    toggleVoice,
    quitApplication,
    initDesktopExtras,
    renderFileBrowser
  }
  ;[
    'openCrack',
    'openDarkWeb',
    'openCameras',
    'openCriminalDB',
    'openEvidence',
    'openRiddlerProtocol',
    'openSatellites',
    'openBatmobilePanel',
    'openMedia',
    'openFacialScan',
    'openRadar',
    'openFiles',
    'openEncounters',
    'openFileViewer'
  ].forEach((name) => {
    global[name] = global.BatApps[name]
  })

  BatEvents.on('desktop-ready', initDesktopExtras)
})(window)
