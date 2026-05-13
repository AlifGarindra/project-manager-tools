import { STATUS_CFG } from './tokens'
import type { TicketStatus } from '../../types'

export function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG['planned']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      {cfg.label}
    </span>
  )
}
