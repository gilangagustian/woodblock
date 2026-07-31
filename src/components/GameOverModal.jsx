export default function GameOverModal({ score, best, isNewBest, onRestart }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Game Over</h2>
        {isNewBest && <div className="modal-new-best">New Best Score!</div>}
        <div className="modal-score">{score}</div>
        <div className="modal-best">Best: {best}</div>
        <button className="restart-btn" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  )
}
