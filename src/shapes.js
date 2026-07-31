// Polyomino shape definitions. Each shape is a list of [row, col] offsets
// with a minimal bounding box (min row/col === 0), sizes ranging 1-5 cells.
export const SHAPES = [
  // 1 cell
  { id: 'single', cells: [[0, 0]] },

  // 2 cells
  { id: 'domino_h', cells: [[0, 0], [0, 1]] },
  { id: 'domino_v', cells: [[0, 0], [1, 0]] },

  // 3 cells
  { id: 'tromino_h', cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'tromino_v', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'corner_tl', cells: [[0, 0], [0, 1], [1, 0]] },
  { id: 'corner_tr', cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'corner_bl', cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'corner_br', cells: [[0, 1], [1, 0], [1, 1]] },

  // 4 cells
  { id: 'square_2x2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'tetro_I_h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'tetro_I_v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'tetro_L', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'tetro_J', cells: [[0, 1], [1, 1], [2, 1], [2, 0]] },
  { id: 'tetro_L2', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: 'tetro_J2', cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: 'tetro_T', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'tetro_T_down', cells: [[1, 0], [1, 1], [1, 2], [0, 1]] },
  { id: 'tetro_S', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 'tetro_Z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },

  // 5 cells
  { id: 'plus', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { id: 'big_corner', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: 'big_corner2', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
  { id: 'big_corner3', cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: 'big_corner4', cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { id: 'penta_I_h', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'penta_I_v', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'penta_P', cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
]

export const COLORS = [
  '#c0392b', // barn red
  '#e07b1a', // amber
  '#d4ac0d', // mustard gold
  '#2e7d32', // forest green
  '#1f6fb2', // slate blue
  '#7d3fa0', // plum
  '#00897b', // teal
  '#a1662f', // saddle wood brown
  '#c2185b', // berry pink
  '#546e7a', // slate grey
]

export function shapeDims(cells) {
  let maxR = 0
  let maxC = 0
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r
    if (c > maxC) maxC = c
  }
  return { height: maxR + 1, width: maxC + 1 }
}
