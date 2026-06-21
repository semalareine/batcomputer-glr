;(function (global) {
  const { BatEvents, BatAudio, BatState, ORACLE_REPLIES } = global.BatOS

  const SYSTEM = `You are Oracle the batcomputer for Bruce Wayne. Be tactical and in-universe. Help with investigations, strategy, and analysis :). `

  function getApi() {
    return global.api?.oracleChat || global.parent?.api?.oracleChat || global.top?.api?.oracleChat
  }

  function getApiKey() {
    const s = BatState.settings || {}
    return (s.groqApiKey || s.oracleApiKey || '').trim()
  }

  function offlineReply(messages) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const q = (lastUser?.content || '').toLowerCase()
    if (!q) return 'Awaiting input, Bruce.'
    const hit = ORACLE_REPLIES.find((r) => r.keys.some((k) => q.includes(k)))
    if (hit) return hit.reply
    if (q.includes('hello') || q.includes('hi ')) return 'Oracle online. Gotham systems nominal.'
    if (q.length < 12)
      return `Acknowledged: "${lastUser.content}". Running local tactical heuristics — no uplink.`
    return `Local analysis of "${lastUser.content.slice(0, 80)}": no immediate threat flagged. Use radar, map, or criminal DB for live intel. (Offline mode.)`
  }

  function statusHint() {
    const key = getApiKey()
    if (key) return 'Uplink: configured.'
    return 'Uplink: offline mode.'
  }

  function openOracle() {
    const body = `
        <div class="oracle-panel glass-panel">
            <div class="oracle-header"><span class="oracle-dot"></span> ORACLE — SECURE CHANNEL</div>
            <div id="oracle-chat" class="oracle-chat">
                <div class="oracle-msg system">Oracle online. How can I assist, Bruce?</div>
            </div>
            <div id="oracle-typing" class="oracle-typing" hidden>Oracle is analyzing…</div>
            <form class="oracle-input-row" id="oracle-form">
                <input type="text" id="oracle-input" placeholder="Ask Oracle..." spellcheck="false" autocomplete="off" />
                <button type="submit" class="btn-cyan" id="oracle-send">SEND</button>
            </form>
            <p class="oracle-hint" id="oracle-hint"></p>
        </div>`

    if (typeof createWindow !== 'function') return
    BatAudio.windowOpen()
    createWindow({
      title: 'ORACLE',
      width: 500,
      height: 480,
      appId: 'oracle',
      body,
      onCreated: (id, win) => {
        const chat = win.querySelector('#oracle-chat')
        const form = win.querySelector('#oracle-form')
        const input = win.querySelector('#oracle-input')
        const typing = win.querySelector('#oracle-typing')
        const hint = win.querySelector('#oracle-hint')
        const sendBtn = win.querySelector('#oracle-send')
        const history = [{ role: 'system', content: SYSTEM }]
        let busy = false

        hint.textContent = statusHint()

        const append = (text, cls) => {
          const d = document.createElement('div')
          d.className = `oracle-msg ${cls}`
          d.textContent = text
          chat.appendChild(d)
          chat.scrollTop = chat.scrollHeight
        }

        const setBusy = (on) => {
          busy = on
          input.disabled = on
          sendBtn.disabled = on
          typing.hidden = !on
        }

        form.onsubmit = async (e) => {
          e.preventDefault()
          const q = input.value.trim()
          if (!q || busy) return

          append(q, 'user')
          input.value = ''
          history.push({ role: 'user', content: q })
          setBusy(true)
          BatAudio.click()

          const api = getApi()
          if (!api) {
            const reply = offlineReply(history)
            history.push({ role: 'assistant', content: reply })
            append(reply, 'oracle')
            setBusy(false)
            input.focus()
            return
          }

          try {
            const res = await api(history, getApiKey() || undefined)
            if (res.error === 'NO_PROVIDER' || res.offline) {
              const reply = offlineReply(history)
              history.push({ role: 'assistant', content: reply })
              append(reply, 'oracle')
              hint.textContent = 'Offline mode — ' + statusHint()
              BatAudio.click()
              return
            }
            if (res.error === 'NO_KEY') {
              const reply = offlineReply(history)
              history.push({ role: 'assistant', content: reply })
              append(reply, 'oracle')
              return
            }
            if (res.error) {
              append(res.message || 'Connection failed.', 'system')
              BatAudio.denied()
              return
            }
            const reply = res.content || '(No response)'
            history.push({ role: 'assistant', content: reply })
            append(reply, 'oracle')
            hint.textContent = 'Connected.'
            BatEvents.emit('oracle', { query: q, reply })
            BatAudio.granted()
          } catch (err) {
            const reply = offlineReply(history)
            history.push({ role: 'assistant', content: reply })
            append(reply, 'oracle')
            append(err.message || 'Uplink failed — using offline mode.', 'system')
            BatAudio.denied()
          } finally {
            setBusy(false)
            input.focus()
          }
        }

        input.focus()
      }
    })
  }

  global.BatApps = global.BatApps || {}
  global.BatApps.openOracle = openOracle
  global.openOracle = openOracle
})(window)
