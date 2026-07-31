import { SHAPES, COLORS, shapeDims } from './shapes.js'

export const BOARD_SIZE = 9
export const POINTS_PER_CELL = 1
export const LINE_CLEAR_BASE = 10

let pieceCounter = 0
function nextPieceId() {
  pieceCounter += 1
  return `piece-${pieceCounter}-${Date.now().toString(36)}`
}

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
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

export function canPlace(board, cells, row, col) {
  for (const [dr, dc] of cells) {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false
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
  const rows = []
  const cols = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r)
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true
    for (let r = 0; r < BOARD_SIZE; r++) {
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
  const clearedCellsSet = new Set()
  const clearedCells = []
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = `${r},${c}`
      if (!clearedCellsSet.has(key)) {
        clearedCellsSet.add(key)
        clearedCells.push({ r, c, color: board[r][c] })
      }
    }
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) {
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
  const { width, height } = shapeDims(cells)
  for (let r = 0; r <= BOARD_SIZE - height; r++) {
    for (let c = 0; c <= BOARD_SIZE - width; c++) {
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
