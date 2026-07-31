import { SHAPES, COLORS, shapeDims } from './shapes.js'

export const POINTS_PER_CELL = 1
export const LINE_CLEAR_BASE = 10
export const STREAK_BONUS_BASE = 15

// Light scatter of pre-placed pieces on a fresh board, as a fraction of
// total cells. Kept modest so a new game never feels crowded.
const STARTING_FILL_FRACTION = 0.12
const STARTING_MAX_PIECE_ATTEMPTS = 40
const STARTING_MAX_POSITION_ATTEMPTS = 25

let pieceCounter = 0
function nextPieceId() {
  pieceCounter += 1
  return `piece-${pieceCounter}-${Date.now().toString(36)}`
}

export function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null))
}

export function randomPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
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

export function generateThreePieces() {
  return [randomPiece(), randomPiece(), randomPiece()]
}

// Scatters a handful of random pieces onto an otherwise empty board, for a
// less bare starting position. Never leaves a full row/column behind (that
// would read as a pre-cleared line, which makes no sense before the player
// has moved), but otherwise does not guarantee anything about the result —
// callers that need a guaranteed-playable start should verify the intended
// starting pieces still fit and regenerate if not (see useGame.js).
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

const STARTING_LAYOUT_MAX_RETRIES = 25

// A pre-filled board paired with a starting hand that's guaranteed to have
// somewhere to go — regenerates both together if the scatter happens to box
// out one of the three starting pieces, falling back to an empty board in
// the (practically unreachable) case that keeps failing.
export function createStartingLayout(size) {
  let board = generateStartingBoard(size)
  let slots = generateThreePieces()
  let attempts = 0
  while (attempts < STARTING_LAYOUT_MAX_RETRIES && !slots.every((piece) => canPieceFitAnywhere(board, piece.cells))) {
    board = generateStartingBoard(size)
    slots = generateThreePieces()
    attempts += 1
  }
  if (!slots.every((piece) => canPieceFitAnywhere(board, piece.cells))) {
    board = createEmptyBoard(size)
  }
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
