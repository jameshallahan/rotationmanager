import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { useGameClock } from '../hooks/useGameClock'
import Header from '../components/Header'
import FieldZone from '../components/FieldZone'
import BenchPanel from '../components/BenchPanel'
import FieldOvalView from '../components/FieldOvalView'
import QuarterReportModal from '../components/QuarterReportModal'
import { LayoutGrid, Circle } from 'lucide-react'

export default function GameDay() {
  const navigate = useNavigate()
  const players = useGameStore(s => s.players)
  const matchPlayers = useGameStore(s => s.matchPlayers)
  const playerTimers = useGameStore(s => s.playerTimers)
  const selectedPlayerId = useGameStore(s => s.selectedPlayerId)
  const selectPlayer = useGameStore(s => s.selectPlayer)
  const showQuarterReport = useGameStore(s => s.showQuarterReport)
  const currentMatch = useGameStore(s => s.currentMatch)

  const [view, setView] = useState('zones') // 'zones' | 'field'

  useGameClock()

  if (!currentMatch) {
    return (
      <div className="h-screen flex items-center justify-center bg-sharks-dark">
        <div className="text-center">
          <p className="font-condensed text-gray-400 text-xl mb-4">No active match</p>
          <button onClick={() => navigate('/match/setup')} className="font-condensed font-bold px-6 py-3 bg-sharks-red text-white rounded-lg uppercase">
            Set Up Match
          </button>
        </div>
      </div>
    )
  }

  const matchPlayerIds = new Set(matchPlayers.map(mp => mp.player_id))
  const activePlayers = players.filter(p => matchPlayerIds.has(p.id))

  return (
    <div className="h-screen flex flex-col bg-sharks-dark overflow-hidden">
      <Header />

      {/* View toggle + selection hint bar */}
      <div className="flex items-center justify-between px-4 h-9 bg-sharks-surface border-b border-sharks-border flex-shrink-0">
        {/* Selection hint (left) */}
        <div className="flex-1">
          {selectedPlayerId && (
            <span className="font-condensed text-xs text-sharks-red uppercase tracking-widest">
              Player selected — tap another to rotate
            </span>
          )}
        </div>

        {/* View toggle (right) */}
        <div className="flex items-center gap-1 bg-sharks-surface2 rounded-lg p-0.5 border border-sharks-border">
          <button
            onClick={() => setView('zones')}
            className={`flex items-center gap-1.5 px-3 h-6 rounded-md font-condensed font-bold text-xs uppercase tracking-wide transition-all ${
              view === 'zones' ? 'bg-sharks-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={11} /> Zones
          </button>
          <button
            onClick={() => setView('field')}
            className={`flex items-center gap-1.5 px-3 h-6 rounded-md font-condensed font-bold text-xs uppercase tracking-wide transition-all ${
              view === 'field' ? 'bg-sharks-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Circle size={11} /> Field
          </button>
        </div>
      </div>

      {/* Zone view */}
      {view === 'zones' && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden min-w-0">
            {['FORWARD', 'MIDFIELD', 'DEFENCE'].map(zone => (
              <FieldZone
                key={zone}
                zone={zone}
                players={activePlayers}
                matchPlayers={matchPlayers}
                playerTimers={playerTimers}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={selectPlayer}
              />
            ))}
          </div>
          <BenchPanel
            players={activePlayers}
            matchPlayers={matchPlayers}
            playerTimers={playerTimers}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={selectPlayer}
          />
        </div>
      )}

      {/* Field oval view */}
      {view === 'field' && <FieldOvalView />}

      {showQuarterReport && <QuarterReportModal />}
    </div>
  )
}
