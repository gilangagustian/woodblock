import { useCallback, useReducer } from 'react'
import {
  createEmptyBoard,
  generateThreePieces,
  canPlace,
  placePieceOnBoard,
  findFullLines,
  clearLines,
  isGameOver,
  computeLineClearScore,
  POINTS_PER_CELL,
} from './gameLogic'

function initState() {
  return {
    board: createEmptyBoard(),
    slots: generateThreePieces(),
    score: 0,
    best: 0,
    gameOver: false,
    lastClear: null, // { clearedCells, numLines, batchId } for flash animation, transient
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'PLACE_PIECE': {
      if (state.gameOver) return state
      const { slotIndex, row, col } = action
      const piece = state.slots[slotIndex]
      if (!piece) return state
      if (!canPlace(state.board, piece.cells, row, col)) return state

      let board = placePieceOnBoard(state.board, piece.cells, row, col, piece.color)
      let scoreGain = piece.cells.length * POINTS_PER_CELL

      const { rows, cols } = findFullLines(board)
      const numLines = rows.length + cols.length
      let lastClear = null
      if (numLines > 0) {
        const result = clearLines(board, rows, cols)
        board = result.board
        scoreGain += computeLineClearScore(numLines)
        lastClear = {
          clearedCells: result.clearedCells,
          numLines,
          batchId: `${Date.now()}-${Math.random()}`,
        }
      }

      let slots = state.slots.slice()
      slots[slotIndex] = null
      if (slots.every((s) => s === null)) {
        slots = generateThreePieces()
      }

      const score = state.score + scoreGain
      const best = Math.max(state.best, score)
      const gameOver = isGameOver(board, slots)

      return { ...state, board, slots, score, best, gameOver, lastClear }
    }
    case 'CLEAR_FLASH': {
      if (state.lastClear && state.lastClear.batchId === action.batchId) {
        return { ...state, lastClear: null }
      }
      return state
    }
    case 'NEW_GAME': {
      return { ...initState(), best: state.best }
    }
    default:
      return state
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  const placePiece = useCallback((slotIndex, row, col) => {
    dispatch({ type: 'PLACE_PIECE', slotIndex, row, col })
  }, [])

  const clearFlash = useCallback((batchId) => {
    dispatch({ type: 'CLEAR_FLASH', batchId })
  }, [])

  const newGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' })
  }, [])

  return { state, placePiece, clearFlash, newGame }
}
