import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Board from './components/Board'
import PieceTray from './components/PieceTray'
import PiecePreview from './components/PiecePreview'
import ScoreBar from './components/ScoreBar'
import GameOverModal from './components/GameOverModal'
import ConfirmModal from './components/ConfirmModal'
import DifficultyMenu from './components/DifficultyMenu'
import { useGame } from './useGame'
import { canPlace } from './gameLogic'
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from './difficulty'
import { loadBestScores } from './storage'
import { isSoundEnabled, setSoundEnabled, playPlace, playInvalid, playClear, playStreak, playGameOver, playReroll } from './feedback'

const FLASH_DURATION_MS = 500
const TOUCH_LIFT_CELLS = 1.6

function computeGeometry({ clientX, clientY, piece, grabFracX, grabFracY, pointerType, boardRect, boardSize, board }) {
  const cellSize = boardRect.width / boardSize
  const ghostWidth = piece.width * cellSize
  const ghostHeight = piece.height * cellSize
  let ghostLeft = clientX - grabFracX * ghostWidth
  let ghostTop = clientY - grabFracY * ghostHeight
  if (pointerType === 'touch') {
    ghostTop -= cellSize * TOUCH_LIFT_CELLS
  }

  const rawCol = Math.round((ghostLeft - boardRect.left) / cellSize)
  const rawRow = Math.round((ghostTop - boardRect.top) / cellSize)

  let hoverRow = null
  let hoverCol = null
  let valid = false
  const maxRow = boardSize - piece.height
  const maxCol = boardSize - piece.width
  if (rawRow >= 0 && rawRow <= maxRow && rawCol >= 0 && rawCol <= maxCol) {
    hoverRow = rawRow
    hoverCol = rawCol
    valid = canPlace(board, piece.cells, rawRow, rawCol)
  }

  return { cellSize, ghostLeft, ghostTop, hoverRow, hoverCol, valid }
}

export default function App() {
  const { state, placePiece, clearFlash, newGame, startGame, reroll } = useGame(DEFAULT_DIFFICULTY)
  const boardRef = useRef(null)
  const ghostElRef = useRef(null)
  const [screen, setScreen] = useState('menu') // 'menu' | 'playing'
  const [dragState, setDragState] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null) // null | 'restart' | 'menu'
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const prevGameOverRef = useRef(false)
  // Authoritative drag state, written synchronously inside each handler so a
  // pointerup that fires immediately after a pointermove (fast flicks, or
  // synthetic/automated input) never reads a stale pre-move value. React's
  // `dragState` (updated via setDragState below) drives rendering only, and
  // only gets touched when the hovered cell/validity actually changes — see
  // handlePieceMove for why.
  const dragStateRef = useRef(null)
  // The board's rect is cached for the duration of a drag instead of read on
  // every pointermove: getBoundingClientRect() forces a synchronous layout
  // flush, and the board never moves/resizes mid-drag.
  const boardRectRef = useRef(null)

  useEffect(() => {
    if (!state.lastClear) return
    const { batchId } = state.lastClear
    const t = setTimeout(() => clearFlash(batchId), FLASH_DURATION_MS)
    return () => clearTimeout(t)
  }, [state.lastClear, clearFlash])

  // Sound/haptic feedback for each placement, keyed off the reducer's
  // one-shot lastPlacement event so it fires exactly once per placement.
  useEffect(() => {
    if (!state.lastPlacement) return
    const { numLines, streak } = state.lastPlacement
    if (numLines > 0) {
      playClear(numLines)
      if (streak >= 2) playStreak(streak)
    } else {
      playPlace()
    }
  }, [state.lastPlacement])

  useEffect(() => {
    if (state.gameOver && !prevGameOverRef.current) playGameOver()
    prevGameOverRef.current = state.gameOver
  }, [state.gameOver])

  // Belt-and-suspenders: block native touch scrolling for the duration of a
  // piece drag. CSS touch-action on the piece element normally covers this,
  // but iOS Safari can still let a touchmove scroll/rubber-band the page if
  // it slips through before pointer capture takes effect.
  useEffect(() => {
    const blockScrollDuringDrag = (e) => {
      if (dragStateRef.current) e.preventDefault()
    }
    window.addEventListener('touchmove', blockScrollDuringDrag, { passive: false })
    return () => window.removeEventListener('touchmove', blockScrollDuringDrag)
  }, [])

  const handlePieceDown = useCallback((e, slotIndex, piece) => {
    if (state.gameOver) return
    e.preventDefault()
    const pieceRect = e.currentTarget.getBoundingClientRect()
    const grabFracX = (e.clientX - pieceRect.left) / pieceRect.width
    const grabFracY = (e.clientY - pieceRect.top) / pieceRect.height
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    const boardRect = boardRef.current.getBoundingClientRect()
    boardRectRef.current = boardRect
    const geo = computeGeometry({
      clientX: e.clientX,
      clientY: e.clientY,
      piece,
      grabFracX,
      grabFracY,
      pointerType: e.pointerType,
      boardRect,
      boardSize: state.board.length,
      board: state.board,
    })

    const next = {
      slotIndex,
      piece,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      grabFracX,
      grabFracY,
      ...geo,
    }
    dragStateRef.current = next
    setDragState(next)
  }, [state.board, state.gameOver])

  const handlePieceMove = useCallback((e) => {
    const current = dragStateRef.current
    if (!current || e.pointerId !== current.pointerId) return
    e.preventDefault()
    const geo = computeGeometry({
      clientX: e.clientX,
      clientY: e.clientY,
      piece: current.piece,
      grabFracX: current.grabFracX,
      grabFracY: current.grabFracY,
      pointerType: current.pointerType,
      boardRect: boardRectRef.current,
      boardSize: state.board.length,
      board: state.board,
    })
    const next = { ...current, ...geo }
    dragStateRef.current = next

    // Move the ghost immediately via a direct DOM write, bypassing React so
    // tracking is as smooth as the browser can paint (transform only —
    // no layout, just compositing).
    if (ghostElRef.current) {
      ghostElRef.current.style.transform = `translate3d(${geo.ghostLeft}px, ${geo.ghostTop}px, 0)`
    }

    // Only trigger a React re-render — which re-renders the board's preview
    // highlighting — when the hovered cell or its validity actually changes,
    // not on every pixel of movement.
    if (geo.hoverRow !== current.hoverRow || geo.hoverCol !== current.hoverCol || geo.valid !== current.valid) {
      setDragState(next)
    }
  }, [state.board])

  const handlePieceUp = useCallback((e) => {
    const current = dragStateRef.current
    if (!current || e.pointerId !== current.pointerId) return
    e.preventDefault()
    if (current.hoverRow !== null && current.hoverCol !== null) {
      if (current.valid) {
        placePiece(current.slotIndex, current.hoverRow, current.hoverCol)
      } else {
        playInvalid()
      }
    }
    dragStateRef.current = null
    setDragState(null)
  }, [placePiece])

  const handlePieceCancel = useCallback((e) => {
    const current = dragStateRef.current
    if (!current || e.pointerId !== current.pointerId) return
    dragStateRef.current = null
    setDragState(null)
  }, [])

  const clearDrag = useCallback(() => {
    dragStateRef.current = null
    setDragState(null)
  }, [])

  const handleSelectDifficulty = useCallback((difficultyKey) => {
    startGame(difficultyKey)
    setScreen('playing')
  }, [startGame])

  const handleRestartClick = useCallback(() => {
    if (state.score === 0) {
      newGame()
      return
    }
    setConfirmAction('restart')
  }, [state.score, newGame])

  const handleChangeDifficultyClick = useCallback(() => {
    if (state.score === 0) {
      setScreen('menu')
      return
    }
    setConfirmAction('menu')
  }, [state.score])

  const handleGameOverChangeDifficulty = useCallback(() => {
    clearDrag()
    setScreen('menu')
  }, [clearDrag])

  const handleConfirmAction = useCallback(() => {
    clearDrag()
    if (confirmAction === 'restart') newGame()
    else if (confirmAction === 'menu') setScreen('menu')
    setConfirmAction(null)
  }, [confirmAction, newGame, clearDrag])

  const handleCancelAction = useCallback(() => {
    setConfirmAction(null)
  }, [])

  const handleToggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev
      setSoundEnabled(next)
      return next
    })
  }, [])

  const handleReroll = useCallback(() => {
    if (state.rerollsRemaining <= 0 || state.gameOver) return
    clearDrag()
    reroll()
    playReroll()
  }, [state.rerollsRemaining, state.gameOver, reroll, clearDrag])

  // Memoized so Board (wrapped in React.memo) only re-renders when the
  // preview/flash actually change, not on every unrelated App re-render.
  const preview = useMemo(() => (
    dragState && dragState.hoverRow !== null
      ? { row: dragState.hoverRow, col: dragState.hoverCol, cells: dragState.piece.cells, valid: dragState.valid }
      : null
  ), [dragState])

  const flashCells = useMemo(() => (
    state.lastClear
      ? state.lastClear.clearedCells.map((c) => ({ ...c, batchId: state.lastClear.batchId }))
      : []
  ), [state.lastClear])

  const isNewBest = state.gameOver && state.score > 0 && state.score >= state.best
  const currentDifficulty = DIFFICULTIES[state.difficultyKey]

  return (
    <div className="app-root">
      <div className="game-shell">
        {screen === 'menu' && (
          <DifficultyMenu bestScores={loadBestScores()} onSelect={handleSelectDifficulty} />
        )}

        {screen === 'playing' && (
          <>
            <div className="game-header">
              <h1 className="game-title game-title-compact">Woodblock</h1>
              <div className="game-header-actions">
                <button
                  type="button"
                  className="difficulty-pill"
                  onClick={handleChangeDifficultyClick}
                  title="Change difficulty"
                >
                  {currentDifficulty.label} {currentDifficulty.size}×{currentDifficulty.size}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleToggleSound}
                  aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
                  title={soundOn ? 'Mute sound' : 'Unmute sound'}
                >
                  {soundOn ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" />
                      <path d="M17.5 8.5a5 5 0 0 1 0 7" />
                      <path d="M20 6a8.5 8.5 0 0 1 0 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 9v6h4l5 4V5L8 9H4z" />
                      <path d="M16 9l5 6M21 9l-5 6" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleRestartClick}
                  aria-label="Restart game"
                  title="Restart game"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 11A8 8 0 1 0 18.6 16.5" />
                    <path d="M20 5v6h-6" />
                  </svg>
                </button>
              </div>
            </div>
            <ScoreBar score={state.score} best={state.best} />
            <Board ref={boardRef} board={state.board} preview={preview} flashCells={flashCells} />
            {state.lastPlacement && (state.lastPlacement.numLines > 1 || state.lastPlacement.streak >= 2) && (
              <div key={state.lastPlacement.batchId} className="combo-toast">
                {state.lastPlacement.numLines > 1 && <div>{state.lastPlacement.numLines}x Lines!</div>}
                {state.lastPlacement.streak >= 2 && <div>🔥 Streak ×{state.lastPlacement.streak}</div>}
              </div>
            )}
            <div className="tray-toolbar">
              <button
                type="button"
                className="reroll-btn"
                onClick={handleReroll}
                disabled={state.rerollsRemaining <= 0}
                title={state.rerollsRemaining > 0 ? `Reroll pieces (${state.rerollsRemaining} left)` : 'No rerolls left'}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 21l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Reroll · {state.rerollsRemaining}
              </button>
            </div>
            <PieceTray
              slots={state.slots}
              draggingSlotIndex={dragState ? dragState.slotIndex : null}
              onPieceDown={handlePieceDown}
              onPieceMove={handlePieceMove}
              onPieceUp={handlePieceUp}
              onPieceCancel={handlePieceCancel}
            />
          </>
        )}
      </div>

      {dragState && (
        <div
          ref={ghostElRef}
          className="drag-ghost"
          style={{
            transform: `translate3d(${dragState.ghostLeft}px, ${dragState.ghostTop}px, 0)`,
            opacity: dragState.hoverRow !== null ? (dragState.valid ? 0.95 : 0.7) : 0.85,
          }}
        >
          <PiecePreview
            cells={dragState.piece.cells}
            width={dragState.piece.width}
            height={dragState.piece.height}
            color={dragState.piece.color}
            cellSize={dragState.cellSize}
            dimmed={dragState.hoverRow !== null && !dragState.valid}
          />
        </div>
      )}

      {screen === 'playing' && state.gameOver && (
        <GameOverModal
          score={state.score}
          best={state.best}
          isNewBest={isNewBest}
          onRestart={newGame}
          onChangeDifficulty={handleGameOverChangeDifficulty}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction === 'restart' ? 'Restart game?' : 'Change difficulty?'}
          message="Your current score and board will be lost."
          confirmLabel={confirmAction === 'restart' ? 'Restart' : 'Change'}
          cancelLabel="Cancel"
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      )}

      <footer className="app-footer">Built with Claude Code, co-authored by GA</footer>
    </div>
  )
}
