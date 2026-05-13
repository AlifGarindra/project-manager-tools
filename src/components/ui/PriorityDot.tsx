import { PRIORITY_COLORS, C } from './tokens'
import type { TicketPriority } from '../../types'

export function PriorityDot({ priority }: { priority: TicketPriority }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 6, height: 6, borderRadius: '50%',
      background: PRIORITY_COLORS[priority] ?? C.textMut,
      flexShrink: 0,
    }} />
  )
}
