import { DIFFICULTIES, DIFFICULTY_ORDER } from '../difficulty'

export default function DifficultyMenu({ bestScores, onSelect }) {
  return (
    <div className="menu-screen">
      <h1 className="game-title">Woodblock</h1>
      <p className="menu-subtitle">Choose a board size</p>
      <div className="difficulty-list">
        {DIFFICULTY_ORDER.map((key) => {
          const d = DIFFICULTIES[key]
          return (
            <button key={key} type="button" className="difficulty-card" onClick={() => onSelect(key)}>
              <span className="difficulty-name">{d.label}</span>
              <span className="difficulty-size">
                {d.size}×{d.size}
              </span>
              <span className="difficulty-best">Best: {bestScores[key] || 0}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
