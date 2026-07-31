import { forwardRef, memo } from 'react'

const Board = memo(forwardRef(function Board({ board, preview, flashCells }, ref) {
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
            <div
              key={flash.batchId}
              className="flash-tile"
              style={{ '--tile-color': flash.color }}
            />
          )}
        </div>,
      )
    }
  }

  return (
    <div className="board-wrap">
      <div
        className="board-grid"
        ref={ref}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
      >
        {cells}
      </div>
    </div>
  )
}))

export default Board
