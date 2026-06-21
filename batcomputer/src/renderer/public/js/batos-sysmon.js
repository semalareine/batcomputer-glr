;(function (global) {
  function openSysMon() {
    if (global.BatAudio) global.BatAudio.windowOpen()

    const cores = navigator.hardwareConcurrency || 4
    const mem = performance.memory
    const memPct = mem ? Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100) : 42

    const body = `
        <div class="sys-mon glass-panel" id="sysmon-root">
          <h3>SYSTEM RESOURCES <span class="text-cyan">(LIVE)</span></h3>
          <div class="mon-row"><div class="mon-label"><span>CPU CORES (logical)</span><span id="cpu1-val">${cores}</span></div><div class="mon-bar"><div class="mon-fill" id="cpu1-bar" style="width:40%"></div></div></div>
          <div class="mon-row"><div class="mon-label"><span>JS HEAP MEMORY</span><span id="mem-val">${memPct}%</span></div><div class="mon-bar"><div class="mon-fill" id="mem-bar" style="width:${memPct}%"></div></div></div>
          <div class="mon-row"><div class="mon-label"><span>DISPLAY REFRESH</span><span id="sat-val">—</span></div><div class="mon-bar"><div class="mon-fill" id="sat-bar" style="width:60%"></div></div></div>
          <div class="mon-row"><div class="mon-label"><span>UPTIME (session)</span><span id="pwr-val">0m</span></div><div class="mon-bar"><div class="mon-fill" id="pwr-bar" style="width:80%"></div></div></div>
          <div class="mon-row"><div class="mon-label"><span>NETWORK</span><span id="neural-val">ONLINE</span></div><div class="mon-bar"><div class="mon-fill" id="neural-bar" style="width:70%"></div></div></div>
        </div>`

    global.createWindow({
      title: 'SYSTEM MONITOR',
      appId: 'sysmon',
      width: 420,
      height: 360,
      body,
      onCreated: (id) => {
        const start = performance.now()
        const tick = () => {
          if (!document.getElementById(id)) return
          const m = performance.memory
          if (m) {
            const pct = Math.min(99, Math.round((m.usedJSHeapSize / m.jsHeapSizeLimit) * 100))
            const bar = document.getElementById('mem-bar')
            const val = document.getElementById('mem-val')
            if (bar) bar.style.width = pct + '%'
            if (val) val.textContent = pct + '%'
            if (pct > 85 && bar)
              bar.style.background = 'linear-gradient(90deg, var(--red), #ff8800)'
          }
          const cpuBar = document.getElementById('cpu1-bar')
          const cpuVal = document.getElementById('cpu1-val')
          const load = Math.min(
            95,
            20 + Math.random() * 30 + (m ? (m.usedJSHeapSize / m.jsHeapSizeLimit) * 40 : 0)
          )
          if (cpuBar) cpuBar.style.width = load + '%'
          if (cpuVal)
            cpuVal.textContent = navigator.hardwareConcurrency + ' @ ' + Math.round(load) + '%'

          const pwr = document.getElementById('pwr-val')
          if (pwr) pwr.textContent = Math.floor((performance.now() - start) / 60000) + 'm'

          const sat = document.getElementById('sat-val')
          if (sat) sat.textContent = (screen.refreshRate || 60) + ' Hz'

          setTimeout(tick, 2000)
        }
        tick()
      }
    })
  }

  global.BatApps.openSysMon = openSysMon
  global.openSysMon = openSysMon
})(window)
