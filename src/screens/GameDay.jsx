import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/useGameStore'
import { useGameClock } from '../hooks/useGameClock'
import Header from '../components/Header'
import FieldZone from '../components/FieldZone'
import BenchPanel from '../components/BenchPanel'
import FieldOvalView from '../components/FieldOvalView'
import RotationPanel from '../components/RotationPanel'
import QuarterReportModal from '../components/QuarterReportModal'
import { LayoutGrid, Circle, Repeat2, HeartCrack, X } from 'lucide-react'
import { buildRotationInfoMap, buildZoneIndicators } from '../lib/rotationColors'

function fmt(s) {
  const t = s || 0
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export default function GameDay() {
  const navigate = useNavigate()
  const players          = useGameStore(s => s.players)
  const matchPlayers     = useGameStore(s => s.matchPlayers)
  const playerTimers     = useGameStore(s => s.playerTimers)
  const selectedPlayerId = useGameStore(s => s.selectedPlayerId)
  const selectPlayer     = useGameStore(s => s.selectPlayer)
  const markInjured      = useGameStore(s => s.markInjured)
  const showQuarterReport = useGameStore(s => s.showQuarterReport)
  const currentMatch     = useGameStore(s => s.currentMatch)
  const rotationAlerts   = useGameStore(s => s.rotationAlerts)
  const dismissRotationAlert = useGameStore(s => s.dismissRotationAlert)
  const rotationGroups   = useGameStore(s => s.rotationGroups)
  const gameState        = useGameStore(s => s.gameState)

  const rotationInfoMap  = buildRotationInfoMap(rotationGroups, gameState)
  const zoneIndicators   = buildZoneIndicators(rotationGroups, matchPlayers, gameState)

  const [view, setView] = useState('zones') // 'zones' | 'field' | 'rotations'

  useGameClock()

  if (!currentMatch) {
    return (
      <div className="h-dvh flex items-center justify-center bg-sharks-dark">
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
  const activePlayers  = players.filter(p => matchPlayerIds.has(p.id))

  return (
    <div className="h-dvh flex flex-col bg-sharks-dark overflow-hidden">
      <Header />

      {/* Rotation alerts */}
      {rotationAlerts.length > 0 && (
        <div className="flex-shrink-0 space-y-1 px-3 pt-2">
          {rotationAlerts.map(alert => {
            const playerOn  = players.find(p => p.id === alert.playerOnId)
            const playerOff = players.find(p => p.id === alert.playerOffId)
            return (
              <div
                key={alert.groupId}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/30 border border-yellow-700/50"
              >
                <Repeat2 size={14} className="text-yellow-400 flex-shrink-0" />
                <span className="font-condensed font-bold text-yellow-300 text-xs uppercase tracking-widest flex-1">
                  {alert.groupName}
                </span>
                {playerOn && playerOff && (
                  <span className="font-condensed text-xs text-yellow-200">
                    <span className="text-green-400 font-black">#{playerOn.number} {playerOn.last_name}</span>
                    <span className="text-yellow-600 mx-1.5">on</span>
                    <span className="text-red-400 font-black">#{playerOff.number} {playerOff.last_name}</span>
                    <span className="text-yellow-600 mx-1.5">off</span>
                  </span>
                )}
                <button
                  onClick={() => dismissRotationAlert(alert.groupId)}
                  className="p-1 rounded hover:bg-yellow-800/40 text-yellow-600 hover:text-yellow-300 transition-colors flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* View toggle + selection hint bar */}
      <div className="flex items-center justify-between px-3 h-9 bg-sharks-surface border-b border-sharks-border flex-shrink-0 gap-2">
        {/* Selection hint (left) */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {selectedPlayerId && (
            <>
              <span className="font-condensed text-xs text-sharks-red uppercase tracking-widest whitespace-nowrap">
                Tap another to rotate
              </span>
              <button
                onClick={() => markInjured(selectedPlayerId)}
                className="flex items-center gap-1 px-2 h-6 rounded font-condensed font-bold text-xs uppercase tracking-wide bg-red-900/40 border border-red-800/60 text-red-400 hover:bg-red-900/60 transition-colors flex-shrink-0"
              >
                <HeartCrack size={10} /> Injured
              </button>
            </>
          )}
        </div>

        {/* View toggle (right) */}
        <div className="flex items-center gap-0.5 bg-sharks-surface2 rounded-lg p-0.5 border border-sharks-border flex-shrink-0">
          <button
            onClick={() => setView('zones')}
            className={`flex items-center gap-1 px-2.5 h-6 rounded-md font-condensed font-bold text-xs uppercase tracking-wide transition-all ${
              view === 'zones' ? 'bg-sharks-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={11} /> Zones
          </button>
          <button
            onClick={() => setView('field')}
            className={`flex items-center gap-1 px-2.5 h-6 rounded-md font-condensed font-bold text-xs uppercase tracking-wide transition-all ${
              view === 'field' ? 'bg-sharks-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Circle size={11} /> Field
          </button>
          <button
            onClick={() => setView('rotations')}
            className={`flex items-center gap-1 px-2.5 h-6 rounded-md font-condensed font-bold text-xs uppercase tracking-wide transition-all ${
              view === 'rotations' ? 'bg-sharks-red text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Repeat2 size={11} />
            Rotations
            {rotationAlerts.length > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center">
                {rotationAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Zone view */}
      {view === 'zones' && (
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden min-w-0 min-h-0">
            {['FORWARD', 'MIDFIELD', 'DEFENCE'].map(zone => (
              <FieldZone
                key={zone}
                zone={zone}
                players={activePlayers}
                matchPlayers={matchPlayers}
                playerTimers={playerTimers}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={selectPlayer}
                rotationInfoMap={rotationInfoMap}
                zoneIndicators={zoneIndicators[zone]}
              />
            ))}
          </div>
          <BenchPanel
            players={activePlayers}
            matchPlayers={matchPlayers}
            playerTimers={playerTimers}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={selectPlayer}
            rotationInfoMap={rotationInfoMap}
          />
        </div>
      )}

      {/* Field oval view */}
      {view === 'field' && <FieldOvalView />}

      {/* Rotations view */}
      {view === 'rotations' && (
        <div className="flex-1 overflow-hidden min-h-0">
          <RotationPanel setupMode={false} />
        </div>
      )}

      {showQuarterReport && <QuarterReportModal />}
    </div>
  )
}
