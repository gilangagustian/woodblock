import { SHAPES, COLORS, shapeDims } from './shapes.js'

export const POINTS_PER_CELL = 1
export const LINE_CLEAR_BASE = 10
export const STREAK_BONUS_BASE = 15

// Scatter of pre-placed pieces on a fresh board, as a fraction of total
// cells, so a new game doesn't start bare.
const STARTING_FILL_FRACTION = 0.25
const STARTING_MAX_PIECE_ATTEMPTS = 60
const STARTING_MAX_POSITION_ATTEMPTS = 25

// How many times to re-roll a single piece before giving up and handing out
// a guaranteed-fit single cell instead.
const PIECE_FIT_MAX_ATTEMPTS = 30

let pieceCounter = 0
function nextPieceId() {
  pieceCounter += 1
  return `piece-${pieceCounter}-${Date.now().toString(36)}`
}

function buildPiece(shape) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const { width, height } = shapeDims(shape.cells)
  return {
    id: nextPieceId(),
    shapeId: shape.id,
    cells: shape.cells,
    color,
    width,
    height,
  }
}

const SINGLE_SHAPE = SHAPES.find((s) => s.id === 'single')

export function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

export function randomPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  return buildPiece(shape)
}

// A random piece guaranteed to have somewhere to go on `board` right now.
// Re-rolls a handful of times, then falls back to a single cell — which
// fits as long as the board isn't completely full, so this only fails to
// guarantee a fit in a state that would already be game-over anyway.
export function generatePlayablePiece(board) {
  let piece = randomPiece()
  let attempts = 0
  while (attempts < PIECE_FIT_MAX_ATTEMPTS && !canPieceFitAnywhere(board, piece.cells)) {
    piece = randomPiece()
    attempts += 1
  }
  if (!canPieceFitAnywhere(board, piece.cells)) {
    piece = buildPiece(SINGLE_SHAPE)
  }
  return piece
}

export function generatePlayableThreePieces(board) {
  return [generatePlayablePiece(board), generatePlayablePiece(board), generatePlayablePiece(board)]
}

// Scatters a handful of random pieces onto an otherwise empty board, for a
// less bare starting position. Never leaves a full row/column behind (that
// would read as a pre-cleared line, which makes no sense before the player
// has moved).
export function generateStartingBoard(size) {
  const board = createEmptyBoard(size)
  const targetCells = Math.round(size * size * STARTING_FILL_FRACTION)
  let filled = 0
  let pieceAttempts = 0

  while (filled < targetCells && pieceAttempts < STARTING_MAX_PIECE_ATTEMPTS) {
    pieceAttempts += 1
    const piece = randomPiece()
    for (let i = 0; i < STARTING_MAX_POSITION_ATTEMPTS; i++) {
      const row = Math.floor(Math.random() * size)
      const col = Math.floor(Math.random() * size)
      if (canPlace(board, piece.cells, row, col)) {
        for (const [dr, dc] of piece.cells) {
          board[row + dr][col + dc] = piece.color
        }
        filled += piece.cells.length
        break
      }
    }
  }

  const { rows, cols } = findFullLines(board)
  if (rows.length || cols.length) {
    return clearLines(board, rows, cols).board
  }
  return board
}

// A pre-filled board paired with a starting hand that's guaranteed to have
// somewhere to go, via generatePlayableThreePieces.
export function createStartingLayout(size) {
  const board = generateStartingBoard(size)
  const slots = generatePlayableThreePieces(board)
  return { board, slots }
}

export function canPlace(board, cells, row, col) {
  const size = board.length
  for (const [dr, dc] of cells) {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r >= size || c < 0 || c >= size) return false
    if (board[r][c] !== null) return false
  }
  return true
}

export function placePieceOnBoard(board, cells, row, col, color) {
  const newBoard = board.map((rowArr) => rowArr.slice())
  for (const [dr, dc] of cells) {
    newBoard[row + dr][col + dc] = color
  }
  return newBoard
}

export function findFullLines(board) {
  const size = board.length
  const rows = []
  const cols = []
  for (let r = 0; r < size; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r)
  }
  for (let c = 0; c < size; c++) {
    let full = true
    for (let r = 0; r < size; r++) {
      if (board[r][c] === null) {
        full = false
        break
      }
    }
    if (full) cols.push(c)
  }
  return { rows, cols }
}

// Returns { board: newBoard, clearedCells: [{r,c,color}] }
export function clearLines(board, rows, cols) {
  const size = board.length
  const clearedCellsSet = new Set()
  const clearedCells = []
  for (const r of rows) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`
      if (!clearedCellsSet.has(key)) {
        clearedCellsSet.add(key)
        clearedCells.push({ r, c, color: board[r][c] })
      }
    }
  }
  for (const c of cols) {
    for (let r = 0; r < size; r++) {
      const key = `${r},${c}`
      if (!clearedCellsSet.has(key)) {
        clearedCellsSet.add(key)
        clearedCells.push({ r, c, color: board[r][c] })
      }
    }
  }
  const newBoard = board.map((rowArr) => rowArr.slice())
  for (const { r, c } of clearedCells) {
    newBoard[r][c] = null
  }
  return { board: newBoard, clearedCells }
}

export function canPieceFitAnywhere(board, cells) {
  const size = board.length
  const { width, height } = shapeDims(cells)
  for (let r = 0; r <= size - height; r++) {
    for (let c = 0; c <= size - width; c++) {
      if (canPlace(board, cells, r, c)) return true
    }
  }
  return false
}

export function isGameOver(board, slots) {
  const activePieces = slots.filter(Boolean)
  if (activePieces.length === 0) return false
  return !activePieces.some((piece) => canPieceFitAnywhere(board, piece.cells))
}

export function computeLineClearScore(numLines) {
  if (numLines === 0) return 0
  return LINE_CLEAR_BASE * numLines * numLines
}

// Bonus for clearing a line on consecutive placements. `streak` counts
// consecutive clearing placements (1 = just cleared, no streak bonus yet;
// 2+ = back-to-back clears, bonus grows with the chain length).
export function computeStreakBonus(streak) {
  if (streak < 2) return 0
  return STREAK_BONUS_BASE * (streak - 1)
}
