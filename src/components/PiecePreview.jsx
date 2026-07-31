// Renders a shape's cells as a small grid, used both in the tray and the drag ghost.
export default function PiecePreview({ cells, width, height, color, cellSize, dimmed }) {
  const filled = new Set(cells.map(([r, c]) => `${r},${c}`))
  const boxes = []
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (!filled.has(`${r},${c}`)) continue
      boxes.push(
        <div
          key={`${r},${c}`}
          className="piece-tile"
          style={{
            '--tile-color': color,
            width: cellSize,
            height: cellSize,
            left: c * cellSize,
            top: r * cellSize,
          }}
        />,
      )
    }
  }
  return (
    <div
      className={dimmed ? 'piece-preview piece-preview-dimmed' : 'piece-preview'}
      style={{ width: width * cellSize, height: height * cellSize }}
    >
      {boxes}
    </div>
  )
}
