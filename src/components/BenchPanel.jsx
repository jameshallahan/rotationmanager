import { Heart } from 'lucide-react'
import PlayerCard from './PlayerCard'
import { useGameStore } from '../store/useGameStore'

export default function BenchPanel({ players, matchPlayers, playerTimers, selectedPlayerId, onSelectPlayer }) {
  const markInjured = useGameStore(s => s.markInjured)
  const returnFromInjury = useGameStore(s => s.returnFromInjury)

  const benchPlayers = players.filter(p => {
    const mp = matchPlayers.find(mp => mp.player_id === p.id)
    return mp && mp.current_position === 'BENCH' && mp.status !== 'INJURED'
  })

  const injuredPlayers = players.filter(p => {
    const mp = matchPlayers.find(mp => mp.player_id === p.id)
    return mp && mp.status === 'INJURED'
  })

  return (
    // Mobile: horizontal strip at the bottom
    // Desktop (sm+): vertical sidebar on the right
    <div className="
      flex-shrink-0 bg-sharks-surface/50
      border-t border-sharks-border
      flex flex-row items-center gap-2 p-2 overflow-x-auto
      sm:border-t-0 sm:border-l
      sm:w-[260px] sm:flex-col sm:items-stretch sm:overflow-x-hidden sm:overflow-y-auto sm:gap-3
    ">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col justify-center sm:flex-row sm:items-center sm:justify-between sm:px-1 sm:mb-0">
        <span className="font-condensed font-bold text-[10px] uppercase tracking-widest text-gray-400">Bench</span>
        <span className={`font-condensed text-xs ${benchPlayers.length === 4 ? 'text-gray-400' : 'text-yellow-500'}`}>
          {benchPlayers.length}/{matchPlayers.filter(m => m.current_position === 'BENCH' && m.status !== 'INJURED').length || 4}
        </span>
      </div>

      {/* Players — horizontal on mobile, 2-col grid on desktop */}
      <div className="flex gap-2 sm:grid sm:grid-cols-2">
        {benchPlayers.map(player => {
          const mp = matchPlayers.find(mp => mp.player_id === player.id)
          const timer = playerTimers[player.id]
          return (
            <div key={player.id} className="flex-shrink-0 w-24 sm:w-auto">
              <PlayerCard
                player={player}
                matchPlayer={mp}
                togSeconds={timer?.togSeconds}
                benchSeconds={timer?.zoneSeconds?.BENCH}
                stintSeconds={timer?.stintSeconds}
                isSelected={selectedPlayerId === player.id}
                onSelect={onSelectPlayer}
                compact
              />
            </div>
          )
        })}
        {/* Empty slots — desktop only */}
        {Array.from({ length: Math.max(0, 4 - benchPlayers.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="hidden sm:block rounded-lg border-2 border-dashed border-sharks-border opacity-30 min-h-[80px]"
          />
        ))}
      </div>

      {/* Injured section — desktop only */}
      {injuredPlayers.length > 0 && (
        <div className="hidden sm:block">
          <div className="h-px bg-sharks-border mb-2" />
          <div className="px-1 mb-2">
            <span className="font-condensed font-bold text-xs uppercase tracking-widest text-red-500 flex items-center gap-1">
              <Heart size={10} className="fill-red-500" /> Injured
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {injuredPlayers.map(player => (
              <button
                key={player.id}
                onClick={() => {
                  if (window.confirm(`Return ${player.first_name} ${player.last_name} to bench?`)) {
                    returnFromInjury(player.id)
                  }
                }}
                className="flex items-center gap-3 p-2 rounded-lg bg-sharks-surface border border-red-900/30 opacity-60 hover:opacity-80 transition-opacity text-left"
              >
                <span className="font-condensed font-black text-red-400 text-xl">#{player.number}</span>
                <div>
                  <div className="font-condensed font-bold text-sm text-gray-300 uppercase">{player.last_name}</div>
                  <div className="font-condensed text-xs text-red-400">INJURED</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
