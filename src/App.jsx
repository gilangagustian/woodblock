import { useCallback, useEffect, useRef, useState } from 'react'
import Board from './components/Board'
import PieceTray from './components/PieceTray'
import PiecePreview from './components/PiecePreview'
import ScoreBar from './components/ScoreBar'
import GameOverModal from './components/GameOverModal'
import ConfirmModal from './components/ConfirmModal'
import { useGame } from './useGame'
import { BOARD_SIZE, canPlace } from './gameLogic'

const FLASH_DURATION_MS = 500
const TOUCH_LIFT_CELLS = 1.6

function computeGeometry({ clientX, clientY, piece, grabFracX, grabFracY, pointerType, boardRect, board }) {
  const cellSize = boardRect.width / BOARD_SIZE
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
  const maxRow = BOARD_SIZE - piece.height
  const maxCol = BOARD_SIZE - piece.width
  if (rawRow >= 0 && rawRow <= maxRow && rawCol >= 0 && rawCol <= maxCol) {
    hoverRow = rawRow
    hoverCol = rawCol
    valid = canPlace(board, piece.cells, rawRow, rawCol)
  }

  return { cellSize, ghostLeft, ghostTop, hoverRow, hoverCol, valid }
}

export default function App() {
  const { state, placePiece, clearFlash, newGame } = useGame()
  const boardRef = useRef(null)
  const [dragState, setDragState] = useState(null)
  const [confirmingRestart, setConfirmingRestart] = useState(false)
  // Authoritative drag state, written synchronously inside each handler so a
  // pointerup that fires immediately after a pointermove (fast flicks, or
  // synthetic/automated input) never reads a stale pre-move value. React's
  // `dragState` (updated via setDragState below) drives rendering only.
  const dragStateRef = useRef(null)

  useEffect(() => {
    if (!state.lastClear) return
    const { batchId } = state.lastClear
    const t = setTimeout(() => clearFlash(batchId), FLASH_DURATION_MS)
    return () => clearTimeout(t)
  }, [state.lastClear, clearFlash])

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
    const geo = computeGeometry({
      clientX: e.clientX,
      clientY: e.clientY,
      piece,
      grabFracX,
      grabFracY,
      pointerType: e.pointerType,
      boardRect,
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
    const boardRect = boardRef.current.getBoundingClientRect()
    const geo = computeGeometry({
      clientX: e.clientX,
      clientY: e.clientY,
      piece: current.piece,
      grabFracX: current.grabFracX,
      grabFracY: current.grabFracY,
      pointerType: current.pointerType,
      boardRect,
      board: state.board,
    })
    const next = { ...current, ...geo }
    dragStateRef.current = next
    setDragState(next)
  }, [state.board])

  const handlePieceUp = useCallback((e) => {
    const current = dragStateRef.current
    if (!current || e.pointerId !== current.pointerId) return
    e.preventDefault()
    if (current.hoverRow !== null && current.hoverCol !== null && current.valid) {
      placePiece(current.slotIndex, current.hoverRow, current.hoverCol)
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

  const handleRestartClick = useCallback(() => {
    if (state.score === 0) {
      newGame()
      return
    }
    setConfirmingRestart(true)
  }, [state.score, newGame])

  const handleConfirmRestart = useCallback(() => {
    setConfirmingRestart(false)
    dragStateRef.current = null
    setDragState(null)
    newGame()
  }, [newGame])

  const handleCancelRestart = useCallback(() => {
    setConfirmingRestart(false)
  }, [])

  const preview = dragState && dragState.hoverRow !== null
    ? { row: dragState.hoverRow, col: dragState.hoverCol, cells: dragState.piece.cells, valid: dragState.valid }
    : null

  const flashCells = state.lastClear
    ? state.lastClear.clearedCells.map((c) => ({ ...c, batchId: state.lastClear.batchId }))
    : []

  const isNewBest = state.gameOver && state.score > 0 && state.score >= state.best

  return (
    <div className="app-root">
      <div className="game-shell">
        <div className="game-header">
          <h1 className="game-title">Woodblock</h1>
          <button
            type="button"
            className="restart-icon-btn"
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
        <ScoreBar score={state.score} best={state.best} />
        <Board ref={boardRef} board={state.board} preview={preview} flashCells={flashCells} />
        {state.lastClear && state.lastClear.numLines > 1 && (
          <div key={state.lastClear.batchId} className="combo-toast">
            {state.lastClear.numLines}x Combo!
          </div>
        )}
        <PieceTray
          slots={state.slots}
          draggingSlotIndex={dragState ? dragState.slotIndex : null}
          onPieceDown={handlePieceDown}
          onPieceMove={handlePieceMove}
          onPieceUp={handlePieceUp}
          onPieceCancel={handlePieceCancel}
        />
      </div>

      {dragState && (
        <div
          className="drag-ghost"
          style={{
            left: dragState.ghostLeft,
            top: dragState.ghostTop,
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

      {state.gameOver && (
        <GameOverModal score={state.score} best={state.best} isNewBest={isNewBest} onRestart={newGame} />
      )}

      {confirmingRestart && (
        <ConfirmModal
          title="Restart game?"
          message="Your current score and board will be lost."
          confirmLabel="Restart"
          cancelLabel="Cancel"
          onConfirm={handleConfirmRestart}
          onCancel={handleCancelRestart}
        />
      )}
    </div>
  )
}
