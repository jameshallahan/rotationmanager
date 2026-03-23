import { useGameStore } from '../store/useGameStore'
import { ZONE_POSITIONS } from '../lib/positions'
import { buildRotationInfoMap } from '../lib/rotationColors'

const fmt = s => {
  const t = s || 0
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

const ZONE_GLOW = {
  DEFENCE:  'rgba(79,70,229,0.18)',
  MIDFIELD: 'rgba(5,150,105,0.18)',
  FORWARD:  'rgba(220,38,38,0.18)',
}

const EMPTY_SLOT = (key) => (
  <div key={key} style={{
    height: 44,
    border: '1.5px dashed rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  }} />
)

// Player card used inside the oval and interchange
function OvalPlayerCard({ player, matchPlayer, timer, isSelected, onSelect, rotationInfo }) {
  const isOnField = matchPlayer?.current_position !== 'BENCH'
  const stint = timer?.stintSeconds || 0
  const tog   = timer?.togSeconds   || 0
  const bench = timer?.zoneSeconds?.BENCH || 0

  // Rotation derived state
  const showCountdown = rotationInfo?.isNextOff && rotationInfo?.isApproaching
  const countdownSecs = rotationInfo?.secondsUntil ?? 0
  const countdownUrgent = countdownSecs <= 30 || rotationInfo?.isOverdue
  const countdownText = rotationInfo?.isOverdue
    ? 'LATE'
    : `${Math.floor(Math.max(0, countdownSecs) / 60)}:${String(Math.max(0, countdownSecs) % 60).padStart(2, '0')}`

  return (
    <button
      onClick={() => onSelect(player.id)}
      className="w-full flex items-center gap-2 rounded-lg transition-all active:scale-95 overflow-hidden relative"
      style={{
        background: isSelected ? 'rgba(204,0,0,0.18)' : 'rgba(10,14,20,0.82)',
        border: `1.5px solid ${isSelected ? '#CC0000' : 'rgba(255,255,255,0.14)'}`,
        borderLeft: rotationInfo && !isSelected
          ? `3px solid ${rotationInfo.groupColor}`
          : isSelected ? '1.5px solid #CC0000' : '1.5px solid rgba(255,255,255,0.14)',
        padding: '5px 7px',
        height: 44,
        boxShadow: isSelected ? '0 0 0 1px rgba(204,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.5)',
      }}
    >
      {/* Number */}
      <div className="flex-shrink-0 flex items-center justify-center rounded"
        style={{ background: '#CC0000', minWidth: 26, height: 26, padding: '0 3px' }}>
        <span className="font-condensed font-black text-white leading-none" style={{ fontSize: 14 }}>
          {player.number}
        </span>
      </div>

      {/* Name + timers */}
      <div className="flex-1 min-w-0 flex flex-col items-start">
        <span className="font-condensed font-bold text-white uppercase leading-none truncate w-full" style={{ fontSize: 12 }}>
          {player.first_name.charAt(0)}.{player.last_name}
        </span>
        {showCountdown ? (
          <div className="flex items-center gap-1 leading-none mt-0.5">
            <span
              className={`font-condensed font-black tabular-nums px-1 rounded leading-none ${countdownUrgent ? 'animate-pulse' : ''}`}
              style={{
                fontSize: 10,
                background: countdownUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                color: countdownUrgent ? '#EF4444' : '#F59E0B',
              }}
            >
              {countdownText}
            </span>
          </div>
        ) : isOnField ? (
          <div className="flex items-center gap-1.5 leading-none mt-0.5">
            <span className="font-condensed text-yellow-400 font-bold tabular-nums" style={{ fontSize: 10 }}>
              {fmt(stint)}
            </span>
            <span className="text-gray-600" style={{ fontSize: 9 }}>·</span>
            <span className="font-condensed text-gray-400 tabular-nums" style={{ fontSize: 10 }}>
              TOG {fmt(tog)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 leading-none mt-0.5">
            <span className="font-condensed text-blue-400 font-bold tabular-nums" style={{ fontSize: 10 }}>
              BENCH {fmt(bench)}
            </span>
          </div>
        )}
      </div>

      {/* Status dot (next on = blue, next off approaching = amber/red) */}
      {rotationInfo && !isSelected && (rotationInfo.isNextOn || rotationInfo.isNextOff) && (
        <div
          className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${countdownUrgent && rotationInfo.isNextOff ? 'animate-pulse' : ''}`}
          style={{
            background: rotationInfo.isNextOn
              ? '#60A5FA'
              : countdownUrgent ? '#EF4444' : '#F59E0B',
          }}
        />
      )}

      {isSelected && (
        <div className="w-2 h-2 rounded-full bg-sharks-red animate-ping flex-shrink-0" />
      )}
    </button>
  )
}

// Build a slot map: named_position_id → player for players in this zone
function buildSlotMap(zoneName, players, matchPlayers) {
  const slots = ZONE_POSITIONS[zoneName]
  const zonePlayers = players.filter(p => {
    const mp = matchPlayers.find(m => m.player_id === p.id)
    return mp && mp.current_position === zoneName && mp.status !== 'INJURED'
  })

  const slotMap = {}
  zonePlayers.forEach(p => {
    const mp = matchPlayers.find(m => m.player_id === p.id)
    const namedPos = mp?.named_position
    if (namedPos && slots.some(s => s.id === namedPos)) {
      slotMap[namedPos] = p
    }
  })

  return slotMap
}

// Zone renderer — handles midfield 1-4-1 and defence/forward 3×2 grid
function OvalZone({ zone, label, padH, padTop, padBottom, players, matchPlayers, playerTimers, selectedPlayerId, onSelect, canHighlight, rotationInfoMap }) {
  const slotMap = buildSlotMap(zone, players, matchPlayers)

  const card = (posId) => {
    const p = slotMap[posId]
    if (!p) return EMPTY_SLOT(posId)
    return (
      <OvalPlayerCard
        key={p.id}
        player={p}
        matchPlayer={matchPlayers.find(m => m.player_id === p.id)}
        timer={playerTimers[p.id]}
        isSelected={selectedPlayerId === p.id}
        onSelect={onSelect}
        rotationInfo={rotationInfoMap?.[p.id] || null}
      />
    )
  }

  return (
    <div
      className="flex flex-col justify-center transition-all duration-150"
      style={{
        flex: 1,
        padding: `${padTop} ${padH} ${padBottom}`,
        background: canHighlight ? ZONE_GLOW[zone] : 'transparent',
      }}
    >
      <div className="font-condensed text-[9px] uppercase tracking-widest text-white/30 text-center mb-1">
        {label}
      </div>

      {zone === 'MIDFIELD' ? (
        // 1-4-1: LW | Ruck · Centre · Ruck Rover · Rover | RW
        <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
          {/* Left wing */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {card('MID_LW')}
          </div>
          {/* Centre 4 — stacked vertically */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {card('MID_RK')}
            {card('MID_C')}
            {card('MID_RR')}
            {card('MID_RV')}
          </div>
          {/* Right wing */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {card('MID_RW')}
          </div>
        </div>
      ) : (
        // 3×2 grid for Defence and Forward
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 4 }}>
          {ZONE_POSITIONS[zone].map(pos => card(pos.id))}
        </div>
      )}
    </div>
  )
}

export default function FieldOvalView() {
  const players          = useGameStore(s => s.players)
  const matchPlayers     = useGameStore(s => s.matchPlayers)
  const playerTimers     = useGameStore(s => s.playerTimers)
  const selectedPlayerId = useGameStore(s => s.selectedPlayerId)
  const selectPlayer     = useGameStore(s => s.selectPlayer)
  const returnFromInjury = useGameStore(s => s.returnFromInjury)
  const rotationGroups   = useGameStore(s => s.rotationGroups)
  const gameState        = useGameStore(s => s.gameState)

  const rotationInfoMap = buildRotationInfoMap(rotationGroups, gameState)

  const matchPlayerIds = new Set(matchPlayers.map(m => m.player_id))
  const activePlayers  = players.filter(p => matchPlayerIds.has(p.id))

  const benchPlayers = activePlayers.filter(p => {
    const mp = matchPlayers.find(m => m.player_id === p.id)
    return mp && mp.current_position === 'BENCH' && mp.status !== 'INJURED'
  })
  const injuredPlayers = activePlayers.filter(p => {
    const mp = matchPlayers.find(m => m.player_id === p.id)
    return mp && mp.status === 'INJURED'
  })
  const benchCount = matchPlayers.filter(m => m.current_position === 'BENCH' && m.status !== 'INJURED').length
  const canHighlight = !!selectedPlayerId

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">

      {/* ── Left: Interchange + Injured ── */}
      <div className="w-32 sm:w-48 flex-shrink-0 flex flex-col border-r border-sharks-border bg-sharks-surface overflow-y-auto">

        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <p className="font-condensed text-[10px] text-gray-500 uppercase tracking-widest">
            Interchange · {benchPlayers.length}/{benchCount}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-2 flex-shrink-0">
          {benchPlayers.map(p => (
            <OvalPlayerCard
              key={p.id}
              player={p}
              matchPlayer={matchPlayers.find(m => m.player_id === p.id)}
              timer={playerTimers[p.id]}
              isSelected={selectedPlayerId === p.id}
              onSelect={selectPlayer}
              rotationInfo={rotationInfoMap[p.id] || null}
            />
          ))}
          {benchPlayers.length === 0 && (
            <p className="font-condensed text-xs text-gray-700 px-1">No players on bench</p>
          )}
        </div>

        {/* Injured */}
        {injuredPlayers.length > 0 && (
          <>
            <div className="mx-3 mt-3 mb-2 h-px bg-sharks-border flex-shrink-0" />
            <p className="font-condensed text-[10px] text-red-500 uppercase tracking-widest px-3 mb-2 flex-shrink-0">
              Injured
            </p>
            <div className="flex flex-col gap-2 px-2 flex-shrink-0">
              {injuredPlayers.map(p => {
                const injSecs = playerTimers[p.id]?.injuredSeconds || 0
                const mins = Math.floor(injSecs / 60)
                const secs = String(injSecs % 60).padStart(2, '0')
                return (
                  <button key={p.id}
                    onClick={() => window.confirm(`Return ${p.first_name} ${p.last_name} to bench?`) && returnFromInjury(p.id)}
                    className="flex items-center gap-2 p-2 rounded-lg opacity-60 hover:opacity-80 transition-opacity text-left"
                    style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <span className="font-condensed font-black text-red-400 text-lg">#{p.number}</span>
                    <div>
                      <div className="font-condensed font-bold text-gray-400 text-sm uppercase leading-none">{p.last_name}</div>
                      <div className="font-condensed text-red-400 tabular-nums leading-none mt-0.5" style={{ fontSize: 10 }}>{mins}:{secs}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Legend */}
        <div className="mt-auto px-3 pb-3 pt-4 flex-shrink-0 border-t border-sharks-border/50">
          <p className="font-condensed text-[9px] text-gray-600 uppercase tracking-widest mb-1">Timer legend</p>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="font-condensed text-[10px] text-gray-500">Current stint</span>
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="font-condensed text-[10px] text-gray-500">Total TOG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="font-condensed text-[10px] text-gray-500">Bench time</span>
          </div>
        </div>
      </div>

      {/* ── Right: AFL Oval ── */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto py-3 px-3 gap-2">

        {selectedPlayerId && (
          <p className="font-condensed text-xs text-sharks-red uppercase tracking-widest flex-shrink-0">
            Player selected — tap another to rotate
          </p>
        )}

        {/* Oval */}
        <div
          className="flex-shrink-0 relative overflow-hidden flex flex-col"
          style={{
            height: 'calc(100dvh - 130px)',
            aspectRatio: '10 / 15',
            maxWidth: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #14a347 0%, #16a34a 35%, #15803d 50%, #16a34a 65%, #14a347 100%)',
            border: '3px solid rgba(255,255,255,0.15)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Field markings */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            <div style={{ position: 'absolute', top: '27%', left: '50%', transform: 'translateX(-50%)', width: '48%', height: '12%', borderBottom: '1.5px solid rgba(255,255,255,0.18)', borderLeft: '1.5px solid rgba(255,255,255,0.18)', borderRight: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '0 0 50% 50%' }} />
            <div style={{ position: 'absolute', bottom: '27%', left: '50%', transform: 'translateX(-50%)', width: '48%', height: '12%', borderTop: '1.5px solid rgba(255,255,255,0.18)', borderLeft: '1.5px solid rgba(255,255,255,0.18)', borderRight: '1.5px solid rgba(255,255,255,0.18)', borderRadius: '50% 50% 0 0' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '24%', height: '8%', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.25)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '15%', height: '5%', border: '1.5px solid rgba(255,255,255,0.15)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.18)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.18)' }} />
          </div>

          <OvalZone zone="DEFENCE" label="Defence" padH="10%" padTop="10%" padBottom="3%"
            players={activePlayers} matchPlayers={matchPlayers} playerTimers={playerTimers}
            selectedPlayerId={selectedPlayerId} onSelect={selectPlayer} canHighlight={canHighlight}
            rotationInfoMap={rotationInfoMap} />

          <OvalZone zone="MIDFIELD" label="Midfield" padH="5%" padTop="3%" padBottom="3%"
            players={activePlayers} matchPlayers={matchPlayers} playerTimers={playerTimers}
            selectedPlayerId={selectedPlayerId} onSelect={selectPlayer} canHighlight={canHighlight}
            rotationInfoMap={rotationInfoMap} />

          <OvalZone zone="FORWARD" label="Forward" padH="10%" padTop="3%" padBottom="10%"
            players={activePlayers} matchPlayers={matchPlayers} playerTimers={playerTimers}
            selectedPlayerId={selectedPlayerId} onSelect={selectPlayer} canHighlight={canHighlight}
            rotationInfoMap={rotationInfoMap} />
        </div>
      </div>
    </div>
  )
}
