import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const NOT_CONFIGURED = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  init: () => () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  configured: isSupabaseConfigured,

  signIn: async (email, password) => {
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signUp: async (email, password) => {
    if (!supabase) return NOT_CONFIGURED
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  init: () => {
    if (!supabase) {
      // No Supabase config — resolve immediately as unauthenticated
      set({ loading: false })
      return () => {}
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, session, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  },
}))
