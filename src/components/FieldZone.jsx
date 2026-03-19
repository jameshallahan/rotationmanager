import PlayerCard from './PlayerCard'
import { ZONE_POSITIONS, POS_LABEL } from '../lib/positions'

const ZONE_CONFIG = {
  FORWARD: {
    label: 'FORWARD',
    labelColor: 'text-red-400',
    borderColor: 'border-red-900/30',
    bgColor: 'bg-red-950/20',
    emptyBorder: 'border-red-900/25',
  },
  MIDFIELD: {
    label: 'MIDFIELD',
    labelColor: 'text-green-400',
    borderColor: 'border-green-900/30',
    bgColor: 'bg-green-950/20',
    emptyBorder: 'border-green-900/25',
  },
  DEFENCE: {
    label: 'DEFENCE',
    labelColor: 'text-indigo-400',
    borderColor: 'border-indigo-900/30',
    bgColor: 'bg-indigo-950/20',
    emptyBorder: 'border-indigo-900/25',
  },
}

export default function FieldZone({ zone, players, matchPlayers, playerTimers, selectedPlayerId, onSelectPlayer }) {
  const config = ZONE_CONFIG[zone]
  const slots = ZONE_POSITIONS[zone] // [{id, short, label}]

  // Players currently in this zone (not injured)
  const zonePlayers = players.filter(p => {
    const mp = matchPlayers.find(m => m.player_id === p.id)
    return mp && mp.current_position === zone && mp.status !== 'INJURED'
  })

  // Map each player to their exact named slot — no fallback filling.
  // named_position is always swapped along with current_position on rotation,
  // so every player in this zone should match a slot here exactly.
  const slotMap = {}
  zonePlayers.forEach(p => {
    const mp = matchPlayers.find(m => m.player_id === p.id)
    const namedPos = mp?.named_position
    if (namedPos && slots.some(s => s.id === namedPos)) {
      slotMap[namedPos] = p
    }
  })

  return (
    <div className={`flex-1 rounded-xl border ${config.borderColor} ${config.bgColor} p-2 flex flex-col min-h-0`}>
      {/* Zone header */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className={`font-condensed font-bold text-xs uppercase tracking-widest ${config.labelColor}`}>
          {config.label}
        </span>
        <span className={`font-condensed text-xs ${zonePlayers.length === 6 ? config.labelColor : 'text-yellow-500'}`}>
          {zonePlayers.length}/6
        </span>
      </div>

      {/* 3×2 named position grid */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-1.5 min-h-0">
        {slots.map(pos => {
          const player = slotMap[pos.id] || null
          const mp = player ? matchPlayers.find(m => m.player_id === player.id) : null
          const timer = player ? playerTimers[player.id] : null

          return (
            <div key={pos.id} className="flex flex-col min-h-0">
              {/* Position label */}
              <span className={`font-condensed text-[9px] font-bold uppercase tracking-wider px-0.5 mb-0.5 truncate leading-none ${player ? config.labelColor : config.labelColor} opacity-${player ? '60' : '30'}`}>
                {POS_LABEL[pos.id]}
              </span>

              {player ? (
                <div className="flex-1 min-h-0">
                  <PlayerCard
                    player={player}
                    matchPlayer={mp}
                    togSeconds={timer?.togSeconds}
                    benchSeconds={timer?.zoneSeconds?.BENCH}
                    stintSeconds={timer?.stintSeconds}
                    isSelected={selectedPlayerId === player.id}
                    onSelect={onSelectPlayer}
                  />
                </div>
              ) : (
                <div className={`flex-1 rounded-lg border-2 border-dashed ${config.emptyBorder} opacity-25 min-h-[60px]`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
