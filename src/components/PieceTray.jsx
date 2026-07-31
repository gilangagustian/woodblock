import PiecePreview from './PiecePreview'

const TRAY_CELL_SIZE = 26

export default function PieceTray({
  slots,
  draggingSlotIndex,
  onPieceDown,
  onPieceMove,
  onPieceUp,
  onPieceCancel,
}) {
  return (
    <div className="piece-tray">
      {slots.map((piece, index) => (
        <div key={index} className="piece-slot">
          {piece && (
            <div
              className="piece-grab"
              style={{
                touchAction: 'none',
                opacity: draggingSlotIndex === index ? 0 : 1,
              }}
              onPointerDown={(e) => onPieceDown(e, index, piece)}
              onPointerMove={onPieceMove}
              onPointerUp={onPieceUp}
              onPointerCancel={onPieceCancel}
            >
              <PiecePreview
                cells={piece.cells}
                width={piece.width}
                height={piece.height}
                color={piece.color}
                cellSize={TRAY_CELL_SIZE}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export { TRAY_CELL_SIZE }
