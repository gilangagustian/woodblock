import { forwardRef, memo } from 'react'
import { fillRatio } from '../gameLogic'

const PARTICLES_PER_CELL = 4
// Wood chips + a couple of tile-colored shards, so a clear reads as the
// block splintering rather than a generic sparkle burst.
const CHIP_COLORS = ['#c89a63', '#a0703c', '#e0b982', '#7a4d2b', '#2f7fd1']

// Deterministic per-particle randomness. Board re-renders while dragging
// (the preview changes), and re-rolling Math.random() there would restart
// every particle's animation mid-flight — so derive the values from a
// stable seed instead.
function seededUnit(seed) {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

function hashKey(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function renderChips(flash) {
  const baseSeed = hashKey(`${flash.batchId}:${flash.r},${flash.c}`)
  const chips = []
  for (let i = 0; i < PARTICLES_PER_CELL; i += 1) {
    const a = seededUnit(baseSeed + i * 31)
    const b = seededUnit(baseSeed + i * 71 + 7)
    const c = seededUnit(baseSeed + i * 131 + 13)
    const angle = a * Math.PI * 2
    const distance = 26 + b * 34
    chips.push(
      <span
        key={i}
        className="chip"
        style={{
          '--chip-x': `${Math.cos(angle) * distance}px`,
          '--chip-y': `${Math.sin(angle) * distance - 14}px`,
          '--chip-rot': `${(c - 0.5) * 540}deg`,
          '--chip-size': `${3 + c * 4}px`,
          '--chip-delay': `${a * 60}ms`,
          background: CHIP_COLORS[Math.floor(b * CHIP_COLORS.length)],
        }}
      />,
    )
  }
  return chips
}

const Board = memo(forwardRef(function Board({ board, preview, flashCells, shakeLevel = 0 }, ref) {
  const size = board.length
  const previewSet = new Map()
  if (preview) {
    for (const [dr, dc] of preview.cells) {
      const r = preview.row + dr
      const c = preview.col + dc
      previewSet.set(`${r},${c}`, preview.valid)
    }
  }

  const flashMap = new Map()
  for (const f of flashCells) {
    flashMap.set(`${f.r},${f.c}`, f)
  }

  const danger = Math.min(Math.max((fillRatio(board) - 0.65) / 0.25, 0), 1)

  const cells = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`
      const filled = board[r][c]
      const previewState = previewSet.get(key)
      const flash = flashMap.get(key)
      const classes = ['cell']
      if ((Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 0) classes.push('cell-shade-a')
      else classes.push('cell-shade-b')
      if (filled) classes.push('cell-filled')
      if (previewState === true) classes.push('cell-preview-valid')
      if (previewState === false) classes.push('cell-preview-invalid')

      cells.push(
        <div
          key={key}
          className={classes.join(' ')}
          style={filled ? { '--tile-color': filled } : undefined}
        >
          {filled && <div className="tile" />}
          {flash && (
            <div key={flash.batchId} className="flash-tile" style={{ '--tile-color': flash.color }} />
          )}
          {flash && <div className="chips">{renderChips(flash)}</div>}
        </div>,
      )
    }
  }

  return (
    <div className={shakeLevel ? `board-wrap board-shake-${shakeLevel}` : 'board-wrap'}>
      <div
        className="board-grid"
        ref={ref}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
      >
        {cells}
      </div>
      <div className="board-danger" style={{ opacity: danger }} />
    </div>
  )
}))

export default Board
