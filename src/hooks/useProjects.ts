import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProjects, createProject, updateProject } from '../lib/db'
import { useAuthStore } from '../stores/authStore'
import type { Project } from '../types'

export const PROJECTS_KEY = ['projects'] as const

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: fetchProjects,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  return useMutation({
    mutationFn: (input: { name: string; description: string }) =>
      createProject({ ...input, userId: user!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: updateProject,
    // Optimistic update
    onMutate: async (updated: Project) => {
      await qc.cancelQueries({ queryKey: PROJECTS_KEY })
      const prev = qc.getQueryData<Project[]>(PROJECTS_KEY)
      qc.setQueryData<Project[]>(PROJECTS_KEY, old =>
        old?.map(p => p.id === updated.id ? updated : p) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(PROJECTS_KEY, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}
