;(function (global) {
  const TERM_HISTORY_KEY = 'batcomputer_terminal_history_v1'
  const { BatFS, BatAudio, BatState } = global.BatOS

  const MISSION_TARGETS = [
    'JOKER',
    'PENGUIN',
    'RIDDLER',
    'CATWOMAN',
    'BANE',
    'SCARECROW',
    'TWO-FACE',
    'POISON IVY'
  ]
  const MISSION_LOCATIONS = [
    'ACE CHEMICALS',
    'ARKHAM ASYLUM',
    'GCPD HQ',
    'WAYNE TOWER',
    'CRIME ALLEY',
    'THE DOCKS',
    'OLD GOTHAM'
  ]
  const MISSION_THREATS = ['LOW', 'MODERATE', 'HIGH', 'EXTREME', 'CRITICAL']

  const DETECTIVE_SUSPECTS = [
    'HARVEY DENT',
    'EDWARD NYGMA',
    'SELINA KYLE',
    'OSWALD COBBLEPOT',
    'JONATHAN CRANE',
    'UNKNOWN SUBJECT'
  ]
  const DETECTIVE_CONFIDENCE = ['78%', '82%', '87%', '91%', '94%', '97%']

  const WEATHER_CONDITIONS = {
    rain: ['62%', '78%', '85%', '92%', '98%'],
    visibility: ['Clear', 'Hazy', 'Poor', 'Near Zero'],
    crime: ['Low', 'Moderate', 'High', 'Critical']
  }

  const BATMAN_QUOTES = [
    '"I am vengeance. I am the night. I am Batman."',
    '"It\'s not who I am underneath, but what I do that defines me."',
    '"Why do we fall? So we can learn to pick ourselves up."',
    '"I wear the mask to protect the people I care about."',
    '"Gotham needs its silent guardian."',
    '"Criminals are a superstitious, cowardly lot."',
    '"The night is darkest just before the dawn."',
    '"I have one power: I never give up."'
  ]

  function updateTerminalPrompt() {
    document.querySelectorAll('.prompt-text').forEach((el) => {
      el.innerHTML = `${BatFS.getPrompt()}&nbsp;`
    })
  }

  function loadTermHistory() {
    if (!global.commandHistory) return
    try {
      const raw = localStorage.getItem(TERM_HISTORY_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!Array.isArray(saved)) return
      global.commandHistory.length = 0
      saved.forEach((cmd) => global.commandHistory.unshift(cmd))
    } catch (_) {}
  }

  function saveTermHistory() {
    if (!global.commandHistory) return
    try {
      localStorage.setItem(TERM_HISTORY_KEY, JSON.stringify(global.commandHistory.slice(0, 500)))
    } catch (_) {}
  }

  function touchCommand(args) {
    const name = args[0]
    if (!name) {
      appendOutput('Usage: touch <filename>', 'warning')
      return
    }
    const r = BatFS.touch(name)
    if (r.error) appendOutput(r.error, 'error')
    else appendOutput(`File created: ${r.name}`, 'success')
  }

  function mkdirCommand(args) {
    const name = args[0]
    if (!name) {
      appendOutput('Usage: mkdir <directory>', 'warning')
      return
    }
    const r = BatFS.mkdir(name)
    if (r.error) appendOutput(r.error, 'error')
    else appendOutput(`Directory created: ${r.name}`, 'success')
  }

  function rmCommand(args) {
    const name = args[0]
    if (!name) {
      appendOutput('Usage: rm <file|directory>', 'warning')
      return
    }
    const r = BatFS.rm(name)
    if (r.error) appendOutput(r.error, 'error')
    else appendOutput(`Removed: ${r.name}`, 'success')
  }

  function cdCommand(args) {
    const target = args[0]
    if (!target) {
      appendOutput('Usage: cd <directory>', 'warning')
      return
    }
    const r = BatFS.cd(target)
    if (r.error) appendOutput(r.error, 'error')
    else {
      updateTerminalPrompt()
      appendOutput(BatFS.cwd, 'info')
    }
  }

  function pwdCommand() {
    appendOutput(BatFS.pwd(), 'info')
  }

  function treeCommand() {
    const lines = BatFS.tree()
    if (lines.error) {
      appendOutput(lines.error, 'error')
      return
    }
    appendOutput(lines.join('\n'))
  }

  function findCommand(args) {
    const query = args.join(' ')
    if (!query) {
      appendOutput('Usage: find <name>', 'warning')
      return
    }
    const matches = BatFS.find(query)
    if (!matches.length) appendOutput(`No matches for "${escapeHtml(query)}"`, 'warning')
    else matches.forEach((p) => appendOutput(p, 'info'))
  }

  function historyCommand() {
    const hist = global.commandHistory || []
    if (!hist.length) {
      appendOutput('No command history.', 'info')
      return
    }
    const chronological = [...hist].reverse()
    chronological.forEach((cmd, i) => {
      appendOutput(`${i + 1} ${escapeHtml(cmd)}`)
    })
  }

  function nanoCommand(args) {
    const name = args[0]
    if (!name) {
      appendOutput('Usage: nano <filename>', 'warning')
      return
    }

    const absPath = BatFS.resolvePath(name)
    let resolved = BatFS.resolve(absPath)
    let content = ''

    if (resolved.error) {
      const created = BatFS.touch(name)
      if (created.error) {
        appendOutput(created.error, 'error')
        return
      }
      resolved = BatFS.resolve(created.path)
    } else if (resolved.node.type === 'dir') {
      appendOutput('Cannot edit a directory.', 'error')
      return
    } else {
      content = resolved.node.content || ''
    }

    const filePath = resolved.path
    const existing = document.getElementById('nano-editor-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = 'nano-editor-overlay'
    overlay.className = 'nano-overlay'
    overlay.innerHTML = `
            <div class="nano-box">
                <div class="nano-header">NANO — ${escapeHtml(filePath)}</div>
                <textarea class="nano-textarea" spellcheck="false"></textarea>
                <div class="nano-actions">
                    <button type="button" class="nano-btn nano-save">SAVE [Ctrl+S]</button>
                    <button type="button" class="nano-btn nano-cancel">CANCEL [Esc]</button>
                </div>
            </div>`
    document.body.appendChild(overlay)

    const textarea = overlay.querySelector('.nano-textarea')
    textarea.value = content
    const close = () => overlay.remove()

    overlay.querySelector('.nano-save').onclick = () => {
      const r = BatFS.write(filePath, textarea.value)
      if (r.error) appendOutput(r.error, 'error')
      else appendOutput(`Saved: ${filePath}`, 'success')
      close()
      BatAudio.granted()
    }

    overlay.querySelector('.nano-cancel').onclick = close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close()
    })

    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        overlay.querySelector('.nano-save').click()
      }
      if (e.key === 'Escape') close()
    })

    setTimeout(() => textarea.focus(), 50)
  }

  function missionCommand() {
    const target = MISSION_TARGETS[Math.floor(Math.random() * MISSION_TARGETS.length)]
    const location = MISSION_LOCATIONS[Math.floor(Math.random() * MISSION_LOCATIONS.length)]
    const threat = MISSION_THREATS[Math.floor(Math.random() * MISSION_THREATS.length)]
    appendOutput(`<span style="color:var(--yellow)">NEW MISSION RECEIVED</span>\n`)
    appendOutput(`TARGET: ${target}\nLOCATION: ${location}\nTHREAT LEVEL: ${threat}`, 'warning')
    BatAudio.alert()
  }

  function detectiveAnalyzeCommand(sample) {
    if (!sample) {
      appendOutput('Usage: detective <evidence_sample>', 'warning')
      return
    }
    appendOutput(
      `ANALYZING EVIDENCE: <span style="color:var(--yellow)">${escapeHtml(sample)}</span>...`,
      'info'
    )
    setTimeout(() => {
      appendOutput('MATCH FOUND', 'success')
      const suspect = DETECTIVE_SUSPECTS[Math.floor(Math.random() * DETECTIVE_SUSPECTS.length)]
      const confidence =
        DETECTIVE_CONFIDENCE[Math.floor(Math.random() * DETECTIVE_CONFIDENCE.length)]
      appendOutput(`SUSPECT: ${suspect}\nCONFIDENCE: ${confidence}`, 'success')
      BatAudio.scan()
    }, 1200)
  }

  function hackCommand(args) {
    const target = args.join(' ') || 'UNKNOWN HOST'
    appendOutput(
      `Initiating intrusion on <span style="color:var(--yellow)">${escapeHtml(target)}</span>...`,
      'info'
    )
    const steps = ['BYPASSING FIREWALL...', 'CRACKING ENCRYPTION...', 'ACCESS GRANTED']
    steps.forEach((step, i) => {
      setTimeout(
        () => {
          appendOutput(step, i === steps.length - 1 ? 'success' : 'info')
          BatAudio.hack()
        },
        (i + 1) * 900
      )
    })
  }

  function weatherCommand() {
    const rain = WEATHER_CONDITIONS.rain[Math.floor(Math.random() * WEATHER_CONDITIONS.rain.length)]
    const vis =
      WEATHER_CONDITIONS.visibility[
        Math.floor(Math.random() * WEATHER_CONDITIONS.visibility.length)
      ]
    const crime =
      WEATHER_CONDITIONS.crime[Math.floor(Math.random() * WEATHER_CONDITIONS.crime.length)]
    appendOutput(`<span style="color:var(--yellow)">GOTHAM WEATHER</span>\n`)
    appendOutput(`Rain Chance: ${rain}\nVisibility: ${vis}\nCrime Probability: ${crime}`, 'info')
  }

  function fortuneCommand() {
    const quote = BATMAN_QUOTES[Math.floor(Math.random() * BATMAN_QUOTES.length)]
    appendOutput(quote, 'success')
  }

  function normalizeOpenTarget(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
  }

  function openCommand(args) {
    const targetRaw = args.join(' ')
    if (!targetRaw) {
      appendOutput('Usage: open <app>', 'warning')
      appendOutput('Example: open browser', 'info')
      return
    }
    const key = normalizeOpenTarget(targetRaw)
    const apps = [
      { aliases: ['terminal'], fn: () => global.openTerminal?.() },
      { aliases: ['radar', 'radarscan'], fn: () => global.openRadar?.() },
      { aliases: ['system', 'sysmon', 'systemmonitor'], fn: () => global.openSysMon?.() },
      { aliases: ['files', 'filebrowser'], fn: () => global.openFiles?.() },
      { aliases: ['encounters', 'rogues', 'roguegallery'], fn: () => global.openEncounters?.() },
      { aliases: ['weapons', 'weapongallery'], fn: () => global.openWeaponGallery?.() },
      {
        aliases: ['caseboard', 'board', 'investigation', 'investigationboard'],
        fn: () => global.openInvestigationBoard?.()
      },
      { aliases: ['oracle', 'oracleai'], fn: () => global.BatApps?.openOracle?.() },
      { aliases: ['map', 'gothammap', 'gotham'], fn: () => global.BatApps?.openGothamMap?.() },
      { aliases: ['decrypt', 'crack', 'decryptinterface'], fn: () => global.openCrack?.() },
      {
        aliases: ['browser', 'batnet', 'batnetbrowser'],
        fn: () => global.BatApps?.openBrowser?.()
      },
      { aliases: ['darkweb', 'dark', 'onion'], fn: () => global.openDarkWeb?.() },
      { aliases: ['cameras', 'camera', 'securityfeeds'], fn: () => global.openCameras?.() },
      {
        aliases: ['criminaldb', 'criminal', 'database', 'criminaldatabase'],
        fn: () => global.openCriminalDB?.()
      },
      { aliases: ['evidence', 'evidenceanalyzer'], fn: () => global.openEvidence?.() },
      { aliases: ['batmobile'], fn: () => global.openBatmobilePanel?.() },
      { aliases: ['media', 'audio'], fn: () => global.openMedia?.() },
      { aliases: ['satellites', 'satellite'], fn: () => global.openSatellites?.() },
      { aliases: ['settings', 'config'], fn: () => global.openSettings?.() },
      { aliases: ['biometric', 'facialscan', 'scan'], fn: () => global.openFacialScan?.() },
      { aliases: ['riddler', 'riddlerprotocol'], fn: () => global.openRiddlerProtocol?.() }
    ]

    const found = apps.find((a) => a.aliases.some((al) => normalizeOpenTarget(al) === key))
    if (!found) {
      appendOutput(`Unknown app: ${escapeHtml(targetRaw)}`, 'error')
      appendOutput('Try: open browser | open terminal | open settings | open riddler', 'info')
      return
    }

    appendOutput(`OPENING: ${escapeHtml(targetRaw)}`, 'success')
    try {
      found.fn()
    } catch (_) {
      appendOutput('Could not open app.', 'error')
    }
  }

  const FS_COMMANDS = {
    touch: touchCommand,
    mkdir: mkdirCommand,
    rm: rmCommand,
    cd: cdCommand,
    pwd: pwdCommand,
    tree: treeCommand,
    find: findCommand,
    history: historyCommand,
    nano: nanoCommand,
    open: openCommand,
    mission: () => missionCommand(),
    hack: hackCommand,
    weather: () => weatherCommand(),
    fortune: () => fortuneCommand()
  }

  function patchExecuteCommand() {
    const origExecute = global.executeCommand
    if (!origExecute) return

    global.executeCommand = function (cmd) {
      const parts = cmd.trim().split(/\s+/)
      const command = parts[0].toLowerCase()
      const args = parts.slice(1)

      if (command === 'detective' && args.length) {
        appendOutput(`<span class="prompt-text">${BatFS.getPrompt()}</span> ${escapeHtml(cmd)}`)
        detectiveAnalyzeCommand(args.join(' '))
        saveTermHistory()
        BatAudio.click()
        return
      }

      const handler = FS_COMMANDS[command]
      if (handler) {
        appendOutput(`<span class="prompt-text">${BatFS.getPrompt()}</span> ${escapeHtml(cmd)}`)
        handler(args)
        saveTermHistory()
        BatAudio.click()
        return
      }

      origExecute(cmd)
      saveTermHistory()
    }
  }

  function patchHandleCommand() {
    const origOpen = global.openTerminal
    global.openTerminal = function () {
      if (origOpen) origOpen()
      setTimeout(() => {
        updateTerminalPrompt()
        const input = document.getElementById('cmd-input')
        if (input && !input._batTermPatched) {
          input._batTermPatched = true
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              setTimeout(saveTermHistory, 0)
            }
          })
        }
      }, 120)
    }
  }

  function init() {
    loadTermHistory()
    patchExecuteCommand()
    patchHandleCommand()
    global.detectiveAnalyzeCommand = detectiveAnalyzeCommand
    global.updateTerminalPrompt = updateTerminalPrompt
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})(window)
