import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { useGameClock } from '../hooks/useGameClock'
import Header from '../components/Header'
import FieldZone from '../components/FieldZone'
import BenchPanel from '../components/BenchPanel'
import QuarterReportModal from '../components/QuarterReportModal'

export default function GameDay() {
  const navigate = useNavigate()
  const players = useGameStore(s => s.players)
  const matchPlayers = useGameStore(s => s.matchPlayers)
  const playerTimers = useGameStore(s => s.playerTimers)
  const selectedPlayerId = useGameStore(s => s.selectedPlayerId)
  const selectPlayer = useGameStore(s => s.selectPlayer)
  const showQuarterReport = useGameStore(s => s.showQuarterReport)
  const currentMatch = useGameStore(s => s.currentMatch)

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

      {/* Selection hint */}
      {selectedPlayerId && (
        <div className="bg-sharks-red/10 border-b border-sharks-red/30 px-4 py-1.5 text-center">
          <span className="font-condensed text-xs text-sharks-red uppercase tracking-widest">
            Player selected — tap another player to rotate
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Field */}
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

        {/* Bench */}
        <BenchPanel
          players={activePlayers}
          matchPlayers={matchPlayers}
          playerTimers={playerTimers}
          selectedPlayerId={selectedPlayerId}
          onSelectPlayer={selectPlayer}
        />
      </div>

      {/* Quarter Report Modal */}
      {showQuarterReport && <QuarterReportModal />}
    </div>
  )
}
