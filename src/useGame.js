import { useCallback, useEffect, useReducer } from 'react'
import {
  generatePlayableThreePieces,
  createStartingLayout,
  canPlace,
  placePieceOnBoard,
  findFullLines,
  clearLines,
  isGameOver,
  computeLineClearScore,
  computeStreakBonus,
  POINTS_PER_CELL,
} from './gameLogic'
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from './difficulty'
import { loadBestScores, saveBestScore } from './storage'

function makeInitialState(difficultyKey) {
  const size = DIFFICULTIES[difficultyKey].size
  const bestScores = loadBestScores()
  const { board, slots } = createStartingLayout(size)
  return {
    difficultyKey,
    board,
    slots,
    score: 0,
    best: bestScores[difficultyKey] || 0,
    streak: 0, // consecutive placements that cleared at least one line
    gameOver: false,
    lastClear: null, // { clearedCells, numLines, batchId } for flash animation, transient
    lastPlacement: null, // { batchId, cellsPlaced, numLines, streak } — one-shot event for sound/haptics/toast
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
      const batchId = `${Date.now()}-${Math.random()}`
      const streak = numLines > 0 ? state.streak + 1 : 0

      let lastClear = null
      if (numLines > 0) {
        const result = clearLines(board, rows, cols)
        board = result.board
        scoreGain += computeLineClearScore(numLines)
        scoreGain += computeStreakBonus(streak)
        lastClear = { clearedCells: result.clearedCells, numLines, batchId }
      }

      let slots = state.slots.slice()
      slots[slotIndex] = null
      if (slots.every((s) => s === null)) {
        slots = generatePlayableThreePieces(board)
      }

      const score = state.score + scoreGain
      const best = Math.max(state.best, score)
      const gameOver = isGameOver(board, slots)
      const lastPlacement = { batchId, cellsPlaced: piece.cells.length, numLines, streak }

      return { ...state, board, slots, score, best, streak, gameOver, lastClear, lastPlacement }
    }
    case 'CLEAR_FLASH': {
      if (state.lastClear && state.lastClear.batchId === action.batchId) {
        return { ...state, lastClear: null }
      }
      return state
    }
    case 'NEW_GAME': {
      return makeInitialState(state.difficultyKey)
    }
    case 'START_GAME': {
      return makeInitialState(action.difficultyKey)
    }
    default:
      return state
  }
}

export function useGame(initialDifficultyKey = DEFAULT_DIFFICULTY) {
  const [state, dispatch] = useReducer(reducer, initialDifficultyKey, makeInitialState)

  // Persist whenever this difficulty's best score improves.
  useEffect(() => {
    saveBestScore(state.difficultyKey, state.best)
  }, [state.difficultyKey, state.best])

  const placePiece = useCallback((slotIndex, row, col) => {
    dispatch({ type: 'PLACE_PIECE', slotIndex, row, col })
  }, [])

  const clearFlash = useCallback((batchId) => {
    dispatch({ type: 'CLEAR_FLASH', batchId })
  }, [])

  const newGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' })
  }, [])

  const startGame = useCallback((difficultyKey) => {
    dispatch({ type: 'START_GAME', difficultyKey })
  }, [])

  return { state, placePiece, clearFlash, newGame, startGame }
}
