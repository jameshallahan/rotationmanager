// Named AFL positions per zone — used in PreMatchSetup and FieldZone
export const ZONE_POSITIONS = {
  DEFENCE: [
    { id: 'DEF_LBP', short: 'LBP', label: 'L Back Pocket' },
    { id: 'DEF_FB',  short: 'FB',  label: 'Full Back' },
    { id: 'DEF_RBP', short: 'RBP', label: 'R Back Pocket' },
    { id: 'DEF_LHB', short: 'LHB', label: 'L Half Back' },
    { id: 'DEF_CHB', short: 'CHB', label: 'Centre Half Back' },
    { id: 'DEF_RHB', short: 'RHB', label: 'R Half Back' },
  ],
  MIDFIELD: [
    { id: 'MID_LW', short: 'LW',  label: 'Left Wing' },
    { id: 'MID_C',  short: 'C',   label: 'Centre' },
    { id: 'MID_RW', short: 'RW',  label: 'Right Wing' },
    { id: 'MID_RR', short: 'RR',  label: 'Ruck Rover' },
    { id: 'MID_RK', short: 'RK',  label: 'Ruck' },
    { id: 'MID_RV', short: 'RV',  label: 'Rover' },
  ],
  FORWARD: [
    { id: 'FWD_LHF', short: 'LHF', label: 'L Half Fwd' },
    { id: 'FWD_CHF', short: 'CHF', label: 'Centre Half Fwd' },
    { id: 'FWD_RHF', short: 'RHF', label: 'R Half Fwd' },
    { id: 'FWD_LFP', short: 'LFP', label: 'L Fwd Pocket' },
    { id: 'FWD_FF',  short: 'FF',  label: 'Full Forward' },
    { id: 'FWD_RFP', short: 'RFP', label: 'R Fwd Pocket' },
  ],
}

// Map named position ID → zone
export const POS_TO_ZONE = Object.fromEntries(
  Object.entries(ZONE_POSITIONS).flatMap(([zone, positions]) =>
    positions.map(p => [p.id, zone])
  )
)

// Map named position ID → display label
export const POS_LABEL = Object.fromEntries(
  Object.values(ZONE_POSITIONS).flat().map(p => [p.id, p.label])
)

export const POS_SHORT = Object.fromEntries(
  Object.values(ZONE_POSITIONS).flat().map(p => [p.id, p.short])
)
