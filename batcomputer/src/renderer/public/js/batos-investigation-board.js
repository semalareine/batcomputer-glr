;(function (global) {
  const { BatAudio, BatEvents } = global.BatOS
  const CASES_STORAGE_KEY = 'batcomputer_investigation_cases_v2'
  const LEGACY_STORAGE_KEY = 'batcomputer_investigation_board_v1'
  const SNAP_RADIUS = 48

  let activeBoard = null
  let caseIdCounter = 0

  function nextCaseId() {
    return `case-${++caseIdCounter}`
  }

  function emptyBoard() {
    return {
      notes: [],
      lines: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      noteIdCounter: 0,
      lineIdCounter: 0
    }
  }

  function loadCasesStore() {
    try {
      const raw = localStorage.getItem(CASES_STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (Array.isArray(data.cases) && data.cases.length) {
          data.cases.forEach((c) => {
            const n = parseInt(String(c.id).replace(/\D/g, ''), 10)
            if (!Number.isNaN(n)) caseIdCounter = Math.max(caseIdCounter, n)
          })
          return data
        }
      }
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const board = JSON.parse(legacy)
        const id = nextCaseId()
        return {
          cases: [{ id, name: 'CASE #47-B', board }],
          activeCaseId: id
        }
      }
    } catch (_) {}
    return null
  }

  function persistCasesStore(cases, activeCaseId) {
    cases.forEach((c) => {
      c.id = c.id || nextCaseId()
    })
    const active = activeCaseId || cases[0]?.id
    localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify({ cases, activeCaseId: active }))
    return active
  }

  function openInvestigationBoard() {
    const body = `
        <div class="inv-board-panel" id="inv-board-root">
            <div class="inv-board-scanlines" aria-hidden="true"></div>
            <canvas class="inv-board-particles" aria-hidden="true"></canvas>
            <div class="inv-case-tabs-bar">
                <div class="inv-case-tabs" id="inv-case-tabs"></div>
                <button type="button" class="inv-case-new" id="inv-case-new" title="New case">+</button>
            </div>
            <div class="inv-board-toolbar">
                <div class="inv-tool-group">
                    <button class="inv-tool-btn active" data-tool="cursor" title="Move notes and lines">
                        <span class="inv-tool-icon">↖</span> CURSOR
                    </button>
                    <button class="inv-tool-btn" data-tool="line" title="Draw connection lines">
                        <span class="inv-tool-icon">╱</span> LINE
                    </button>
                    <button class="inv-tool-btn" data-tool="text" title="Add and edit notes">
                        <span class="inv-tool-icon">T</span> TEXT
                    </button>
                    <button class="inv-tool-btn" data-tool="delete" title="Delete items">
                        <span class="inv-tool-icon">✕</span> DELETE
                    </button>
                </div>
                <div class="inv-util-group">
                    <button class="inv-util-btn" id="inv-zoom-out" title="Zoom out">−</button>
                    <span class="inv-zoom-label" id="inv-zoom-label">100%</span>
                    <button class="inv-util-btn" id="inv-zoom-in" title="Zoom in">+</button>
                    <button class="inv-util-btn inv-util-wide" id="inv-fit" title="Reset view">FIT</button>
                    <button class="inv-util-btn inv-util-wide" id="inv-clear" title="Clear current case">CLEAR</button>
                </div>
            </div>
            <div class="inv-viewport" id="inv-viewport">
                <div class="inv-canvas-wrap" id="inv-canvas-wrap">
                    <div class="inv-grid-bg" aria-hidden="true"></div>
                    <div class="inv-map-watermark" aria-hidden="true">GOTHAM CITY</div>
                    <svg class="inv-lines-svg" id="inv-lines-svg"></svg>
                    <div class="inv-notes-layer" id="inv-notes-layer"></div>
                    <div class="inv-preview-line" id="inv-preview-line" hidden></div>
                </div>
            </div>
            <div class="inv-board-footer">
                <span class="inv-footer-hint">CURSOR: MOVE · LINE: DRAW · TEXT: ADD/EDIT · DELETE: REMOVE · SCROLL: ZOOM · SPACE+EMPTY: PAN</span>
                <span class="inv-footer-count" id="inv-count">0 NOTES · 0 CONNECTIONS</span>
            </div>
            <div class="inv-ctx-menu" id="inv-ctx-menu" hidden>
                <div class="inv-ctx-item" data-action="edit">Edit Note</div>
                <div class="inv-ctx-item" data-action="duplicate">Duplicate Note</div>
                <div class="inv-ctx-sep"></div>
                <div class="inv-ctx-item inv-ctx-danger" data-action="delete">Delete</div>
            </div>
            <div class="inv-case-modal" id="inv-case-modal" hidden>
                <div class="inv-case-modal-box">
                    <div class="inv-case-modal-title" id="inv-case-modal-title">NEW CASE FILE</div>
                    <input type="text" id="inv-case-modal-input" maxlength="40" spellcheck="false" autocomplete="off" />
                    <div class="inv-case-modal-actions">
                        <button type="button" class="inv-case-modal-btn" id="inv-case-modal-cancel">CANCEL</button>
                        <button type="button" class="inv-case-modal-btn inv-case-modal-confirm" id="inv-case-modal-confirm">CREATE</button>
                    </div>
                </div>
            </div>
        </div>`

    if (typeof createWindow === 'function') {
      BatAudio.windowOpen()
      createWindow({
        title: 'INVESTIGATION BOARD',
        appId: 'board',
        width: 920,
        height: 640,
        body,
        onCreated: (id, win) => initBoard(id, win)
      })
    }
  }

  function initBoard(winId, win) {
    const root = win.querySelector('#inv-board-root')
    if (!root) return

    const state = {
      winId,
      root,
      tool: 'cursor',
      cases: [],
      activeCaseId: null,
      notes: [],
      lines: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      noteIdCounter: 0,
      lineIdCounter: 0,
      draggingNote: null,
      panning: false,
      panStart: null,
      lineDraft: null,
      draggingLine: null,
      editingNoteId: null,
      ctxTarget: null,
      particleAnim: null
    }

    activeBoard = state

    const tabsEl = root.querySelector('#inv-case-tabs')
    const viewport = root.querySelector('#inv-viewport')
    const canvasWrap = root.querySelector('#inv-canvas-wrap')
    const notesLayer = root.querySelector('#inv-notes-layer')
    const linesSvg = root.querySelector('#inv-lines-svg')
    const previewLine = root.querySelector('#inv-preview-line')
    const zoomLabel = root.querySelector('#inv-zoom-label')
    const caseModal = root.querySelector('#inv-case-modal')
    const caseModalInput = root.querySelector('#inv-case-modal-input')
    const caseModalTitle = root.querySelector('#inv-case-modal-title')
    const caseModalConfirm = root.querySelector('#inv-case-modal-confirm')
    let caseModalMode = 'new'
    let caseModalTargetId = null
    const countEl = root.querySelector('#inv-count')
    const ctxMenu = root.querySelector('#inv-ctx-menu')
    const particleCanvas = root.querySelector('.inv-board-particles')

    function snapshotBoard() {
      return {
        notes: state.notes,
        lines: state.lines,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        noteIdCounter: state.noteIdCounter,
        lineIdCounter: state.lineIdCounter
      }
    }

    function applyBoard(board) {
      cancelLineDraft()
      state.editingNoteId = null
      state.notes = board.notes || []
      state.lines = board.lines || []
      state.zoom = board.zoom ?? 1
      state.panX = board.panX ?? 0
      state.panY = board.panY ?? 0
      state.noteIdCounter = board.noteIdCounter ?? 0
      state.lineIdCounter = board.lineIdCounter ?? 0
      notesLayer.innerHTML = ''
      state.notes.forEach((n) => renderNote(n))
      renderLines()
      updateTransform()
      updateCount()
    }

    function getActiveCase() {
      return state.cases.find((c) => c.id === state.activeCaseId)
    }

    function persistActiveCase() {
      const c = getActiveCase()
      if (c) c.board = snapshotBoard()
      state.activeCaseId = persistCasesStore(state.cases, state.activeCaseId)
    }

    function renderCaseTabs() {
      tabsEl.innerHTML = ''
      state.cases.forEach((c) => {
        const tab = document.createElement('button')
        tab.type = 'button'
        tab.className = 'inv-case-tab' + (c.id === state.activeCaseId ? ' active' : '')
        tab.dataset.caseId = c.id
        tab.innerHTML = `
                    <span class="inv-case-tab-name">${escapeHtml(c.name)}</span>
                    <span class="inv-case-tab-close" title="Close case">×</span>`
        tab.querySelector('.inv-case-tab-name').ondblclick = (e) => {
          e.stopPropagation()
          openRenameCase(c)
        }
        tab.addEventListener('click', (e) => {
          if (e.target.closest('.inv-case-tab-close')) return
          if (c.id !== state.activeCaseId) switchCase(c.id)
        })
        tab.querySelector('.inv-case-tab-close').addEventListener('click', (e) => {
          e.stopPropagation()
          closeCase(c.id)
        })
        tabsEl.appendChild(tab)
      })
    }

    function switchCase(caseId) {
      if (caseId === state.activeCaseId) return
      persistActiveCase()
      state.activeCaseId = caseId
      const target = getActiveCase()
      if (target) applyBoard(target.board || emptyBoard())
      renderCaseTabs()
      BatAudio.click()
    }

    function createCase(name, board) {
      const c = {
        id: nextCaseId(),
        name: (name || `CASE #${state.cases.length + 1}`).trim().slice(0, 40),
        board: board || emptyBoard()
      }
      state.cases.push(c)
      return c
    }

    function showCaseModal(mode, caseRef) {
      caseModalMode = mode
      caseModalTargetId = caseRef?.id || null
      caseModalTitle.textContent = mode === 'rename' ? 'RENAME CASE' : 'NEW CASE FILE'
      caseModalConfirm.textContent = mode === 'rename' ? 'SAVE' : 'CREATE'
      caseModalInput.value = caseRef?.name || `CASE #${state.cases.length + 1}`
      caseModal.hidden = false
      caseModalInput.focus()
      caseModalInput.select()
    }

    function hideCaseModal() {
      caseModal.hidden = true
      caseModalTargetId = null
    }

    function submitCaseModal() {
      const name = caseModalInput.value.trim()
      if (!name) {
        BatAudio.denied()
        return
      }
      if (caseModalMode === 'rename') {
        const c = state.cases.find((x) => x.id === caseModalTargetId)
        if (c) {
          c.name = name.slice(0, 40)
          renderCaseTabs()
          persistActiveCase()
          BatAudio.granted()
        }
      } else {
        persistActiveCase()
        const c = createCase(name, emptyBoard())
        state.activeCaseId = c.id
        applyBoard(c.board)
        renderCaseTabs()
        persistActiveCase()
        BatAudio.granted()
      }
      hideCaseModal()
    }

    function openNewCase() {
      showCaseModal('new')
      BatAudio.click()
    }

    function openRenameCase(caseRef) {
      showCaseModal('rename', caseRef)
      BatAudio.click()
    }

    function closeCase(caseId) {
      if (state.cases.length <= 1) {
        if (typeof showNotification === 'function') {
          showNotification('INVESTIGATION BOARD', 'At least one case must remain open.')
        }
        BatAudio.denied()
        return
      }
      const idx = state.cases.findIndex((c) => c.id === caseId)
      if (idx < 0) return
      if (!confirm(`Close "${state.cases[idx].name}"? Unsaved layout is stored automatically.`))
        return
      const wasActive = state.activeCaseId === caseId
      state.cases.splice(idx, 1)
      if (wasActive) {
        const next = state.cases[Math.min(idx, state.cases.length - 1)]
        state.activeCaseId = next.id
        applyBoard(next.board || emptyBoard())
      }
      renderCaseTabs()
      persistActiveCase()
      BatAudio.hack()
    }

    function setTool(tool) {
      state.tool = tool
      root.querySelectorAll('.inv-tool-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tool === tool)
      })
      canvasWrap.classList.toggle('inv-cursor-move', tool === 'cursor')
      canvasWrap.classList.toggle('inv-cursor-line', tool === 'line')
      canvasWrap.classList.toggle('inv-cursor-text', tool === 'text')
      canvasWrap.classList.toggle('inv-cursor-delete', tool === 'delete')
      cancelLineDraft()
      state.notes.forEach((n) => renderNote(n))
      renderLines()
      BatAudio.click()
    }

    function updateTransform() {
      canvasWrap.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`
      zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`
    }

    function updateCount() {
      countEl.textContent = `${state.notes.length} NOTES · ${state.lines.length} CONNECTIONS`
    }

    function getNoteCenter(note) {
      const el = root.querySelector(`[data-note-id="${note.id}"]`)
      if (!el) return { x: note.x + 90, y: note.y + 40 }
      const w = el.offsetWidth
      const h = el.offsetHeight
      return { x: note.x + w / 2, y: note.y + h / 2 }
    }

    function canvasPoint(clientX, clientY) {
      const rect = viewport.getBoundingClientRect()
      const x = (clientX - rect.left - state.panX) / state.zoom
      const y = (clientY - rect.top - state.panY) / state.zoom
      return { x, y }
    }

    function findNoteAt(x, y) {
      for (let i = state.notes.length - 1; i >= 0; i--) {
        const n = state.notes[i]
        const el = root.querySelector(`[data-note-id="${n.id}"]`)
        const w = el ? el.offsetWidth : 180
        const h = el ? el.offsetHeight : 72
        if (x >= n.x && x <= n.x + w && y >= n.y && y <= n.y + h) return n
      }
      return null
    }

    function snapPoint(x, y) {
      let best = null
      let bestDist = SNAP_RADIUS
      state.notes.forEach((n) => {
        const c = getNoteCenter(n)
        const d = Math.hypot(c.x - x, c.y - y)
        if (d < bestDist) {
          bestDist = d
          best = { x: c.x, y: c.y, noteId: n.id }
        }
      })
      return best || { x, y, noteId: null }
    }

    function createNote(x, y, text = 'NEW INTEL') {
      const id = `note-${++state.noteIdCounter}`
      const note = { id, x: x - 90, y: y - 36, text }
      state.notes.push(note)
      renderNote(note)
      updateCount()
      BatAudio.click()
      BatEvents.emit('investigation', { action: 'note-add', id })
      return note
    }

    function renderNote(note, forceBody) {
      let el = root.querySelector(`[data-note-id="${note.id}"]`)
      const isEditing = state.editingNoteId === note.id

      if (!el) {
        el = document.createElement('div')
        el.className = 'inv-note'
        el.dataset.noteId = note.id
        notesLayer.appendChild(el)
        el.innerHTML = `
                    <div class="inv-note-header">
                        <span class="inv-note-dot"></span>
                        <span class="inv-note-label">INTEL NODE</span>
                    </div>
                    <div class="inv-note-body" contenteditable="false"></div>`

        el.addEventListener('mousedown', (e) => onNoteMouseDown(e, note))
        el.addEventListener('dblclick', (e) => {
          e.stopPropagation()
          if (state.tool === 'cursor' || state.tool === 'text') startEditNote(note)
        })
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault()
          e.stopPropagation()
          showCtxMenu(e, note)
        })
        el.addEventListener('mouseenter', () => {
          if (state.tool === 'line') el.classList.add('inv-note-snap-ready')
        })
        el.addEventListener('mouseleave', () => el.classList.remove('inv-note-snap-ready'))
      }

      el.style.left = `${note.x}px`
      el.style.top = `${note.y}px`
      el.classList.toggle('inv-note-highlight', state.tool === 'delete')
      el.classList.toggle('inv-note-moveable', state.tool === 'cursor')
      el.classList.toggle('inv-note-editing', isEditing)

      const body = el.querySelector('.inv-note-body')
      if (body && (forceBody || !isEditing)) {
        if (!isEditing) {
          body.contentEditable = 'false'
          body.textContent = note.text
        }
      }
    }

    function escapeHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    function startEditNote(note) {
      if (state.editingNoteId === note.id) return
      const el = root.querySelector(`[data-note-id="${note.id}"]`)
      const body = el?.querySelector('.inv-note-body')
      if (!body) return

      state.editingNoteId = note.id
      state.draggingNote = null
      el.classList.add('inv-note-editing')
      body.contentEditable = 'true'
      body.textContent = note.text
      body.focus()

      const range = document.createRange()
      range.selectNodeContents(body)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)

      const finish = () => {
        if (state.editingNoteId !== note.id) return
        state.editingNoteId = null
        body.contentEditable = 'false'
        note.text = body.innerText.trim() || 'NEW INTEL'
        body.textContent = note.text
        el.classList.remove('inv-note-editing')
        body.removeEventListener('blur', finish)
        body.removeEventListener('keydown', onKey)
        body.removeEventListener('mousedown', stopDrag)
      }
      const stopDrag = (e) => e.stopPropagation()
      const onKey = (e) => {
        e.stopPropagation()
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          body.blur()
        }
        if (e.key === 'Escape') {
          body.textContent = note.text
          body.blur()
        }
      }
      body.addEventListener('mousedown', stopDrag)
      body.addEventListener('blur', finish)
      body.addEventListener('keydown', onKey)
      BatAudio.click()
    }

    function deleteNote(id) {
      if (state.editingNoteId === id) state.editingNoteId = null
      state.notes = state.notes.filter((n) => n.id !== id)
      state.lines = state.lines.filter((l) => l.fromNote !== id && l.toNote !== id)
      const el = root.querySelector(`[data-note-id="${id}"]`)
      if (el) {
        el.classList.add('inv-note-deleting')
        setTimeout(() => el.remove(), 200)
      }
      renderLines()
      updateCount()
      BatAudio.hack()
    }

    function createLine(from, to) {
      const id = `line-${++state.lineIdCounter}`
      const line = {
        id,
        fromNote: from.noteId,
        toNote: to.noteId,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      }
      state.lines.push(line)
      renderLines()
      updateCount()
      BatAudio.scan()
      BatEvents.emit('investigation', { action: 'line-add', id })
    }

    function deleteLine(id) {
      const el = root.querySelector(`[data-line-id="${id}"]`)
      if (el) {
        el.classList.add('inv-line-deleting')
        setTimeout(() => el.remove(), 250)
      }
      state.lines = state.lines.filter((l) => l.id !== id)
      setTimeout(renderLines, 260)
      updateCount()
      BatAudio.hack()
    }

    function getLineEndpoints(line, freezeAttached) {
      if (line.fromNote) {
        const n = state.notes.find((x) => x.id === line.fromNote)
        if (n) {
          const c = getNoteCenter(n)
          line.x1 = c.x
          line.y1 = c.y
        } else {
          line.fromNote = null
        }
      }
      if (line.toNote) {
        const n = state.notes.find((x) => x.id === line.toNote)
        if (n) {
          const c = getNoteCenter(n)
          line.x2 = c.x
          line.y2 = c.y
        } else {
          line.toNote = null
        }
      }
      return { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 }
    }

    function freezeLinePosition(line) {
      const pts = getLineEndpoints(line)
      line.x1 = pts.x1
      line.y1 = pts.y1
      line.x2 = pts.x2
      line.y2 = pts.y2
      return pts
    }

    function canManipulateLines() {
      return state.tool === 'cursor'
    }

    function updateLineVisual(g, x1, y1, x2, y2) {
      g.querySelectorAll('line').forEach((ln) => {
        ln.setAttribute('x1', x1)
        ln.setAttribute('y1', y1)
        ln.setAttribute('x2', x2)
        ln.setAttribute('y2', y2)
      })
      const h1 = g.querySelector('.inv-line-handle-start')
      const h2 = g.querySelector('.inv-line-handle-end')
      if (h1) {
        h1.setAttribute('cx', x1)
        h1.setAttribute('cy', y1)
      }
      if (h2) {
        h2.setAttribute('cx', x2)
        h2.setAttribute('cy', y2)
      }
    }

    function beginLineDrag(line, mode, end) {
      const pts = freezeLinePosition(line)
      if (mode === 'endpoint') {
        if (end === 'start') line.fromNote = null
        else line.toNote = null
      } else {
        line.fromNote = null
        line.toNote = null
      }
      const g = root.querySelector(`[data-line-id="${line.id}"]`)
      if (g) g.classList.add('inv-line-active')
      return pts
    }

    function endLineDrag() {
      if (state.draggingLine) {
        const g = root.querySelector(`[data-line-id="${state.draggingLine.line.id}"]`)
        if (g) g.classList.remove('inv-line-active')
      }
      state.draggingLine = null
      renderLines()
    }

    function onLinePointerDown(e, line, mode, end) {
      if (!canManipulateLines()) return
      e.stopPropagation()
      e.preventDefault()
      const pts = beginLineDrag(line, mode, end)
      const pt = canvasPoint(e.clientX, e.clientY)
      if (mode === 'endpoint') {
        state.draggingLine = { line, mode: 'endpoint', end }
      } else {
        state.draggingLine = {
          line,
          mode: 'body',
          grabX: pt.x,
          grabY: pt.y,
          orig: { x1: pts.x1, y1: pts.y1, x2: pts.x2, y2: pts.y2 }
        }
      }
      bindDragListeners()
      BatAudio.click()
    }

    function bindDragListeners() {
      if (state._dragBound) return
      state._dragBound = true
      state._onDragMove = (e) => handleDragMove(e)
      state._onDragUp = (e) => handleDragUp(e)
      document.addEventListener('mousemove', state._onDragMove)
      document.addEventListener('mouseup', state._onDragUp)
    }

    function unbindDragListeners() {
      if (!state._dragBound) return
      document.removeEventListener('mousemove', state._onDragMove)
      document.removeEventListener('mouseup', state._onDragUp)
      state._dragBound = false
    }

    function handleDragMove(e) {
      if (state.panning && state.panStart) {
        state.panX = e.clientX - state.panStart.x
        state.panY = e.clientY - state.panStart.y
        updateTransform()
        return
      }
      if (state.draggingNote) {
        const pt = canvasPoint(e.clientX, e.clientY)
        state.draggingNote.note.x = pt.x - state.draggingNote.offsetX
        state.draggingNote.note.y = pt.y - state.draggingNote.offsetY
        const el = root.querySelector(`[data-note-id="${state.draggingNote.note.id}"]`)
        if (el) {
          el.style.left = `${state.draggingNote.note.x}px`
          el.style.top = `${state.draggingNote.note.y}px`
        }
        renderLines()
        return
      }
      if (state.draggingLine) {
        const dl = state.draggingLine
        const line = dl.line
        const pt = canvasPoint(e.clientX, e.clientY)
        const g = root.querySelector(`[data-line-id="${line.id}"]`)

        if (dl.mode === 'endpoint') {
          const snapped = snapPoint(pt.x, pt.y)
          if (dl.end === 'start') {
            line.x1 = snapped.x
            line.y1 = snapped.y
            line.fromNote = snapped.noteId
          } else {
            line.x2 = snapped.x
            line.y2 = snapped.y
            line.toNote = snapped.noteId
          }
        } else if (dl.mode === 'body') {
          const dx = pt.x - dl.grabX
          const dy = pt.y - dl.grabY
          line.x1 = dl.orig.x1 + dx
          line.y1 = dl.orig.y1 + dy
          line.x2 = dl.orig.x2 + dx
          line.y2 = dl.orig.y2 + dy
        }
        if (g) updateLineVisual(g, line.x1, line.y1, line.x2, line.y2)
        return
      }
      if (state.lineDraft) {
        const pt = canvasPoint(e.clientX, e.clientY)
        const snapped = snapPoint(pt.x, pt.y)
        updatePreviewLine(state.lineDraft.x1, state.lineDraft.y1, snapped.x, snapped.y)
      }
    }

    function handleDragUp(e) {
      if (e.button !== 0 && e.button !== 1) return
      state.panning = false
      state.panStart = null
      state.draggingNote = null
      if (state.draggingLine) endLineDrag()
      unbindDragListeners()

      if (state.lineDraft && state.tool === 'line') {
        const pt = canvasPoint(e.clientX, e.clientY)
        const snapped = snapPoint(pt.x, pt.y)
        const dist = Math.hypot(snapped.x - state.lineDraft.x1, snapped.y - state.lineDraft.y1)
        if (dist > 20) {
          createLine(
            { x: state.lineDraft.x1, y: state.lineDraft.y1, noteId: state.lineDraft.fromNote },
            { x: snapped.x, y: snapped.y, noteId: snapped.noteId }
          )
        }
        cancelLineDraft()
      }
    }

    function renderLines() {
      linesSvg.innerHTML = ''
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      defs.innerHTML = `
                <filter id="inv-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>`
      linesSvg.appendChild(defs)

      state.lines.forEach((line) => {
        const { x1, y1, x2, y2 } = getLineEndpoints(line)
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        g.dataset.lineId = line.id
        g.classList.add('inv-line-group')
        const interactive = state.tool === 'cursor' || state.tool === 'delete'
        g.style.pointerEvents = interactive ? 'auto' : 'none'
        if (state.tool === 'delete') g.classList.add('inv-line-delete-hover')

        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        ln.classList.add('inv-line')
        ln.setAttribute('x1', x1)
        ln.setAttribute('y1', y1)
        ln.setAttribute('x2', x2)
        ln.setAttribute('y2', y2)
        ln.setAttribute('filter', 'url(#inv-glow)')

        const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        pulse.classList.add('inv-line-pulse')
        pulse.setAttribute('x1', x1)
        pulse.setAttribute('y1', y1)
        pulse.setAttribute('x2', x2)
        pulse.setAttribute('y2', y2)

        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        hit.classList.add('inv-line-hit')
        hit.setAttribute('x1', x1)
        hit.setAttribute('y1', y1)
        hit.setAttribute('x2', x2)
        hit.setAttribute('y2', y2)
        hit.setAttribute('stroke', 'transparent')
        hit.setAttribute('stroke-width', '22')
        hit.style.cursor =
          state.tool === 'delete' ? 'pointer' : state.tool === 'cursor' ? 'move' : 'default'

        const bindLineMove = (target) => {
          target.addEventListener('mousedown', (e) => {
            if (state.tool === 'cursor') onLinePointerDown(e, line, 'body')
          })
        }
        bindLineMove(hit)
        bindLineMove(ln)
        bindLineMove(pulse)

        hit.addEventListener('click', (e) => {
          e.stopPropagation()
          if (state.tool === 'delete') deleteLine(line.id)
        })

        const makeHandle = (cx, cy, end) => {
          const h = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          h.setAttribute('cx', cx)
          h.setAttribute('cy', cy)
          h.setAttribute('r', '8')
          h.classList.add(
            'inv-line-handle',
            end === 'start' ? 'inv-line-handle-start' : 'inv-line-handle-end'
          )
          h.style.cursor = 'crosshair'
          h.addEventListener('mousedown', (e) => onLinePointerDown(e, line, 'endpoint', end))
          return h
        }

        g.appendChild(ln)
        g.appendChild(pulse)
        g.appendChild(hit)
        if (state.tool === 'cursor') {
          g.appendChild(makeHandle(x1, y1, 'start'))
          g.appendChild(makeHandle(x2, y2, 'end'))
        }
        linesSvg.appendChild(g)
      })
    }

    function cancelLineDraft() {
      state.lineDraft = null
      previewLine.hidden = true
    }

    function updatePreviewLine(x1, y1, x2, y2) {
      const len = Math.hypot(x2 - x1, y2 - y1)
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
      previewLine.hidden = false
      previewLine.style.left = `${x1}px`
      previewLine.style.top = `${y1}px`
      previewLine.style.width = `${len}px`
      previewLine.style.transform = `rotate(${angle}deg)`
    }

    function onNoteMouseDown(e, note) {
      if (e.button !== 0) return
      e.stopPropagation()

      if (state.tool === 'delete') {
        e.preventDefault()
        deleteNote(note.id)
        return
      }

      if (state.tool === 'line') {
        e.preventDefault()
        const c = getNoteCenter(note)
        state.lineDraft = { x1: c.x, y1: c.y, fromNote: note.id }
        updatePreviewLine(c.x, c.y, c.x, c.y)
        bindDragListeners()
        return
      }

      if (state.tool === 'text') {
        if (e.target.closest('.inv-note-body')) {
          e.preventDefault()
          startEditNote(note)
        }
        return
      }

      if (state.tool === 'cursor') {
        if (state.editingNoteId === note.id) return
        e.preventDefault()
        const pt = canvasPoint(e.clientX, e.clientY)
        state.draggingNote = {
          note,
          offsetX: pt.x - note.x,
          offsetY: pt.y - note.y
        }
        bindDragListeners()
      }
    }

    function showCtxMenu(e, target) {
      state.ctxTarget = target
      ctxMenu.hidden = false
      const rect = root.getBoundingClientRect()
      let x = e.clientX - rect.left
      let y = e.clientY - rect.top
      ctxMenu.style.left = `${Math.min(x, rect.width - 160)}px`
      ctxMenu.style.top = `${Math.min(y, rect.height - 120)}px`
    }

    function hideCtxMenu() {
      ctxMenu.hidden = true
      state.ctxTarget = null
    }

    viewport.addEventListener('mousedown', (e) => {
      const onEmpty = e.target === viewport || e.target.classList.contains('inv-grid-bg')
      const wantPan =
        e.button === 1 ||
        global._invSpaceHeld ||
        (state.tool === 'cursor' && e.button === 0 && onEmpty)

      if (wantPan && (e.button === 1 || e.button === 0)) {
        state.panning = true
        state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY }
        bindDragListeners()
        e.preventDefault()
        return
      }

      if (e.button !== 0) return
      const pt = canvasPoint(e.clientX, e.clientY)

      if (state.tool === 'text') {
        const existing = findNoteAt(pt.x, pt.y)
        if (!existing) {
          const note = createNote(pt.x, pt.y)
          setTimeout(() => startEditNote(note), 50)
        }
        return
      }

      if (state.tool === 'line' && !state.lineDraft) {
        const snapped = snapPoint(pt.x, pt.y)
        state.lineDraft = {
          x1: snapped.x,
          y1: snapped.y,
          fromNote: snapped.noteId
        }
        updatePreviewLine(snapped.x, snapped.y, snapped.x, snapped.y)
        bindDragListeners()
      }
    })

    viewport.addEventListener('mousemove', handleDragMove)

    viewport.addEventListener('mouseup', handleDragUp)

    viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.08 : 0.08
        const newZoom = Math.min(2.5, Math.max(0.35, state.zoom + delta))
        const rect = viewport.getBoundingClientRect()
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        state.panX = mx - (mx - state.panX) * (newZoom / state.zoom)
        state.panY = my - (my - state.panY) * (newZoom / state.zoom)
        state.zoom = newZoom
        updateTransform()
      },
      { passive: false }
    )

    viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const pt = canvasPoint(e.clientX, e.clientY)
      const note = findNoteAt(pt.x, pt.y)
      if (note) showCtxMenu(e, note)
      else hideCtxMenu()
    })

    root.querySelectorAll('.inv-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool))
    })

    root.querySelector('#inv-zoom-in').onclick = () => {
      state.zoom = Math.min(2.5, state.zoom + 0.15)
      updateTransform()
      BatAudio.click()
    }
    root.querySelector('#inv-zoom-out').onclick = () => {
      state.zoom = Math.max(0.35, state.zoom - 0.15)
      updateTransform()
      BatAudio.click()
    }
    root.querySelector('#inv-fit').onclick = () => {
      state.zoom = 1
      state.panX = 0
      state.panY = 0
      updateTransform()
      BatAudio.click()
    }

    const caseNewBtn = root.querySelector('#inv-case-new')
    caseNewBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      openNewCase()
    })
    root.querySelector('#inv-case-modal-cancel').addEventListener('click', hideCaseModal)
    caseModalConfirm.addEventListener('click', submitCaseModal)
    caseModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitCaseModal()
      if (e.key === 'Escape') hideCaseModal()
    })
    caseModal.addEventListener('click', (e) => {
      if (e.target === caseModal) hideCaseModal()
    })

    root.querySelector('#inv-clear').onclick = () => {
      const c = getActiveCase()
      if (!c || !confirm(`Clear all notes and lines in "${c.name}"?`)) return
      applyBoard(emptyBoard())
      persistActiveCase()
      BatAudio.alert()
    }

    ctxMenu.querySelectorAll('.inv-ctx-item').forEach((item) => {
      item.addEventListener('click', () => {
        const action = item.dataset.action
        const target = state.ctxTarget
        hideCtxMenu()
        if (!target) return
        if (action === 'edit') startEditNote(target)
        if (action === 'duplicate')
          createNote(target.x + 24, target.y + 24, target.text + ' (copy)')
        if (action === 'delete') deleteNote(target.id)
      })
    })

    document.addEventListener('click', (e) => {
      if (!ctxMenu.contains(e.target)) hideCtxMenu()
    })

    global._invSpaceHeld = false
    const onKeyDown = (e) => {
      if (!document.getElementById(winId)) {
        document.removeEventListener('keydown', onKeyDown)
        document.removeEventListener('keyup', onKeyUp)
        return
      }
      if (e.code === 'Space' && e.target === document.body) {
        global._invSpaceHeld = true
        e.preventDefault()
      }
    }
    const onKeyUp = (e) => {
      if (e.code === 'Space') global._invSpaceHeld = false
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    function initParticles() {
      const ctx = particleCanvas.getContext('2d')
      const particles = Array.from({ length: 35 }, () => ({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1
      }))

      function resize() {
        const rect = root.querySelector('.inv-viewport').getBoundingClientRect()
        particleCanvas.width = rect.width
        particleCanvas.height = rect.height
      }
      resize()

      function animate() {
        if (!document.getElementById(winId)) return
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height)
        particles.forEach((p) => {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > particleCanvas.width) p.vx *= -1
          if (p.y < 0 || p.y > particleCanvas.height) p.vy *= -1
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245, 197, 24, ${p.a})`
          ctx.fill()
        })
        state.particleAnim = requestAnimationFrame(animate)
      }
      animate()
      const ro = new ResizeObserver(resize)
      ro.observe(root.querySelector('.inv-viewport'))
    }

    function seedDefaultBoard() {
      const n1 = createNote(120, 100, 'SUSPECT: COURT OF OWLS')
      const n2 = createNote(420, 180, 'VICTIM — OLD GOTHAM')
      const n3 = createNote(280, 340, 'TALON MARK FOUND')
      const n4 = createNote(580, 300, 'WAYNE TOWER ACCESS LOG')
      state.lineIdCounter = 0
      ;[
        [n1, n2],
        [n2, n3],
        [n3, n4],
        [n1, n4]
      ].forEach(([a, b]) => {
        const ca = getNoteCenter(a)
        const cb = getNoteCenter(b)
        createLine({ x: ca.x, y: ca.y, noteId: a.id }, { x: cb.x, y: cb.y, noteId: b.id })
      })
    }

    let store = loadCasesStore()
    if (!store) {
      state.cases = []
      const first = createCase('CASE #47-B', emptyBoard())
      state.activeCaseId = first.id
      seedDefaultBoard()
      first.board = snapshotBoard()
    } else {
      state.cases = store.cases
      state.activeCaseId = store.activeCaseId || store.cases[0].id
      const active = getActiveCase()
      applyBoard(active?.board || emptyBoard())
    }
    renderCaseTabs()
    persistActiveCase()

    setTool('cursor')
    initParticles()

    win._invCleanup = () => {
      persistActiveCase()
      if (state.particleAnim) cancelAnimationFrame(state.particleAnim)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      unbindDragListeners()
      if (activeBoard === state) activeBoard = null
    }
  }

  global.BatApps = global.BatApps || {}
  global.BatApps.openInvestigationBoard = openInvestigationBoard
  global.openInvestigationBoard = openInvestigationBoard
})(window)
