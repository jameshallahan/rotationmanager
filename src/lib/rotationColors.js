// Distinct accent colours for rotation groups — chosen to not clash with
// position colours (red=FWD, green=MID, indigo=DEF) or the sharks-red UI chrome.
export const GROUP_COLORS = [
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#14B8A6', // teal
  '#F43F5E', // rose
  '#84CC16', // lime
]

const APPROACHING_THRESHOLD = 120 // seconds — 2 minutes

/**
 * Build a map of { [playerId]: rotationInfo } for all players in active groups.
 *
 * rotationInfo shape:
 *   groupColor        string   — hex colour for this group
 *   isNextOn          boolean  — bench player about to come on
 *   isNextOff         boolean  — field player about to come off
 *   secondsUntil      number|null — seconds until next rotation (null = no more this quarter)
 *   isApproaching     boolean  — secondsUntil <= 120
 *   isOverdue         boolean  — secondsUntil <= 0
 */
export function buildRotationInfoMap(rotationGroups, gameState) {
  const map = {}

  rotationGroups.forEach((group, groupIdx) => {
    if (!group.is_active || !group.player_ids?.length) return

    const color = GROUP_COLORS[groupIdx % GROUP_COLORS.length]
    const len = group.player_ids.length
    const nextRotationTime = group.rotation_times?.[group.current_step]
    const secondsUntil = nextRotationTime !== undefined
      ? nextRotationTime - (gameState.quarterSeconds || 0)
      : null
    const isApproaching = secondsUntil !== null && secondsUntil <= APPROACHING_THRESHOLD
    const isOverdue = secondsUntil !== null && secondsUntil <= 0

    // Player currently on bench (step % len)
    const currentBenchIdx = group.current_step % len
    // Player who will go to bench at next rotation ((step+1) % len)
    const nextOffIdx = (group.current_step + 1) % len

    group.player_ids.forEach((playerId, idx) => {
      map[playerId] = {
        groupColor: color,
        isNextOn: idx === currentBenchIdx,
        isNextOff: idx === nextOffIdx && nextRotationTime !== undefined,
        secondsUntil,
        isApproaching,
        isOverdue,
      }
    })
  })

  return map
}

/**
 * For each field zone, return the approaching rotation indicators that should
 * appear in the zone header. Only includes groups where the "next off" player
 * is in that zone AND the rotation is approaching (< 2 min).
 *
 * Returns: { FORWARD: [{color, secondsUntil, isOverdue}], MIDFIELD: [...], DEFENCE: [...] }
 */
export function buildZoneIndicators(rotationGroups, matchPlayers, gameState) {
  const zones = { FORWARD: [], MIDFIELD: [], DEFENCE: [] }

  rotationGroups.forEach((group, groupIdx) => {
    if (!group.is_active || !group.player_ids?.length) return

    const nextRotationTime = group.rotation_times?.[group.current_step]
    if (nextRotationTime === undefined) return

    const secondsUntil = nextRotationTime - (gameState.quarterSeconds || 0)
    if (secondsUntil > APPROACHING_THRESHOLD) return // not approaching yet

    const color = GROUP_COLORS[groupIdx % GROUP_COLORS.length]
    const len = group.player_ids.length
    const nextOffId = group.player_ids[(group.current_step + 1) % len]
    const nextOffMp = matchPlayers.find(mp => mp.player_id === nextOffId)

    if (nextOffMp && zones[nextOffMp.current_position]) {
      zones[nextOffMp.current_position].push({
        color,
        secondsUntil,
        isOverdue: secondsUntil <= 0,
      })
    }
  })

  return zones
}
