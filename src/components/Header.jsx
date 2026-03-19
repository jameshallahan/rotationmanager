import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { BarChart2, Home } from 'lucide-react'

const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

function SharksLogo() {
  return (
    <img
      src="/sharks-logo.png"
      alt="Sorrento Sharks"
      className="h-10 w-auto hidden sm:block"
      onError={e => {
        e.target.replaceWith(Object.assign(document.createElement('div'), {
          className: 'hidden sm:flex items-center gap-2',
          innerHTML: '<span class="font-condensed font-black text-white text-xl uppercase tracking-wide">Sorrento <span style="color:#CC0000">Sharks</span></span>'
        }))
      }}
    />
  )
}

export default function Header() {
  const navigate = useNavigate()
  const currentMatch = useGameStore(s => s.currentMatch)
  const gameState = useGameStore(s => s.gameState)
  const startQuarter = useGameStore(s => s.startQuarter)
  const pauseQuarter = useGameStore(s => s.pauseQuarter)
  const endQuarter = useGameStore(s => s.endQuarter)

  const quarters = [1, 2, 3, 4]

  return (
    <header className="flex items-center gap-1.5 sm:gap-4 px-2 sm:px-4 h-14 sm:h-[72px] bg-sharks-surface border-b border-sharks-border flex-shrink-0">
      {/* Logo — desktop only */}
      <SharksLogo />

      {/* Match info + quarter pills */}
      <div className="flex-1 flex items-center justify-center gap-2 sm:gap-6 min-w-0">
        <div className="font-condensed font-bold text-white text-sm sm:text-xl tracking-wide uppercase truncate hidden xs:block sm:block">
          vs {currentMatch?.opponent || '—'}
        </div>

        {/* Quarter pills */}
        <div className="flex gap-0.5 sm:gap-1">
          {quarters.map(q => (
            <div
              key={q}
              className={`font-condensed font-bold text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded transition-colors ${
                gameState.quarter === q
                  ? 'bg-sharks-red text-white'
                  : 'bg-sharks-surface2 text-gray-400 border border-sharks-border'
              }`}
            >
              Q{q}
            </div>
          ))}
        </div>
      </div>

      {/* Clock */}
      <div className={`font-condensed font-black text-2xl sm:text-4xl tabular-nums tracking-tight flex-shrink-0 ${gameState.isRunning ? 'text-white' : 'text-gray-400'}`}>
        {formatTime(gameState.quarterSeconds)}
      </div>

      {/* Controls */}
      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
        {!gameState.isRunning ? (
          <button
            onClick={startQuarter}
            className="font-condensed font-bold text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-11 bg-sharks-red hover:bg-red-700 text-white rounded uppercase tracking-wide transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">START </span>Q{gameState.quarter}
          </button>
        ) : (
          <button
            onClick={pauseQuarter}
            className="font-condensed font-bold text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-11 bg-sharks-surface2 hover:bg-gray-700 text-white rounded uppercase tracking-wide border border-sharks-border transition-colors"
          >
            PAUSE
          </button>
        )}
        <button
          onClick={endQuarter}
          className="font-condensed font-bold text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-11 bg-sharks-surface2 hover:bg-gray-700 text-white rounded uppercase tracking-wide border border-sharks-border transition-colors whitespace-nowrap"
        >
          END<span className="hidden sm:inline"> Q</span>
        </button>
      </div>

      {/* Icon buttons */}
      <button
        onClick={() => navigate('/match/report')}
        className="w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0 flex items-center justify-center bg-sharks-surface2 hover:bg-gray-700 rounded border border-sharks-border transition-colors"
        title="View Report"
      >
        <BarChart2 size={16} className="text-gray-400" />
      </button>
      <button
        onClick={() => navigate('/')}
        className="w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0 flex items-center justify-center bg-sharks-surface2 hover:bg-gray-700 rounded border border-sharks-border transition-colors"
        title="Home"
      >
        <Home size={16} className="text-gray-400" />
      </button>
    </header>
  )
}
