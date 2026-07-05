import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchConflictResolutions,
  upsertConflictResolution,
  deleteConflictResolution,
} from '../lib/db'
import { sortedPair } from '../lib/conflict'
import { useAuthStore } from '../stores/authStore'

export const RESOLUTIONS_KEY = ['conflict_resolutions'] as const

export function useConflictResolutions() {
  return useQuery({
    queryKey: RESOLUTIONS_KEY,
    queryFn: fetchConflictResolutions,
  })
}

export function useSaveResolution() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: (input: {
      projectId: string
      ticket1Id: string
      ticket2Id: string
      link: string
      note: string
    }) => {
      const [ticketA, ticketB] = sortedPair(input.ticket1Id, input.ticket2Id)
      return upsertConflictResolution({
        projectId: input.projectId,
        ticketA,
        ticketB,
        link: input.link,
        note: input.note,
        userId: user!.id,
      })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: RESOLUTIONS_KEY }),
  })
}

export function useDeleteResolution() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: deleteConflictResolution,
    onSettled: () => qc.invalidateQueries({ queryKey: RESOLUTIONS_KEY }),
  })
}
