export default function ScoreBar({ score, best }) {
  return (
    <div className="score-bar">
      <div className="score-box">
        <div className="score-label">Score</div>
        <div className="score-value">{score}</div>
      </div>
      <div className="score-box score-box-best">
        <div className="score-label">Best</div>
        <div className="score-value">{best}</div>
      </div>
    </div>
  )
}
