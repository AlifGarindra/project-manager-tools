import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllTickets, upsertTicket, deleteTicketById } from '../lib/db'
import { useAuthStore } from '../stores/authStore'
import type { Ticket } from '../types'

export const TICKETS_KEY = ['tickets'] as const

export function useTickets() {
  return useQuery({
    queryKey: TICKETS_KEY,
    queryFn: fetchAllTickets,
  })
}

export function useSaveTicket() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: (ticket: Ticket) => upsertTicket(ticket, user!.id),
    onMutate: async (ticket: Ticket) => {
      await qc.cancelQueries({ queryKey: TICKETS_KEY })
      const prev = qc.getQueryData<Ticket[]>(TICKETS_KEY)
      qc.setQueryData<Ticket[]>(TICKETS_KEY, old => {
        if (!old) return [ticket]
        const exists = old.some(t => t.id === ticket.id)
        return exists
          ? old.map(t => t.id === ticket.id ? ticket : t)
          : [...old, ticket]
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(TICKETS_KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TICKETS_KEY }),
  })
}

export function useDeleteTicket() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: deleteTicketById,
    onMutate: async (ticketId: string) => {
      await qc.cancelQueries({ queryKey: TICKETS_KEY })
      const prev = qc.getQueryData<Ticket[]>(TICKETS_KEY)
      qc.setQueryData<Ticket[]>(TICKETS_KEY, old =>
        old?.filter(t => t.id !== ticketId) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(TICKETS_KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TICKETS_KEY }),
  })
}
