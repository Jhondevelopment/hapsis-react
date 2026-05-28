import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Normaliza roles antigos do sistema JS para o padrão React
function normalizarRole(role) {
  const mapa = {
    'gestor': 'gestor_geral', 'admin': 'gestor_geral',
    'cfo': 'gestor_sub', 'manager': 'gestor_sub',
    'sdr': 'vendedor', 'cs': 'vendedor', 'marketing': 'vendedor',
  }
  return mapa[role] || role || 'vendedor'
}

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      else setLoading(false)
    })

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) carregarPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function carregarPerfil(userId, tentativa = 1) {
    try {
      // Timeout de 8s igual ao sistema original
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
      ])

      if (error || !data) {
        // Retry automático após 1.5s — igual ao original
        if (tentativa < 2) {
          await new Promise(r => setTimeout(r, 1500))
          return carregarPerfil(userId, tentativa + 1)
        }
        throw new Error('Perfil não encontrado')
      }

      // Verificar se está suspenso
      if (data.suspended === true) {
        await supabase.auth.signOut()
        throw new Error('Conta suspensa. Contate o administrador.')
      }

      // Normalizar role
      const perfilNormalizado = { ...data, role: normalizarRole(data.role) }
      setPerfil(perfilNormalizado)
    } catch (err) {
      console.error('Erro ao carregar perfil:', err)
      if (err.message?.includes('suspensa')) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password, nome) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: nome } }
    })
    if (error) throw error

    // Criar perfil como vendedor — auto-cadastro sempre vendedor
    if (data.user) {
      await supabase.from('profiles').upsert({
        id:        data.user.id,
        full_name: nome,
        email,
        role:      'vendedor',
      })
    }
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    if (error) throw error
  }

  // Helpers de permissão — mesmo RBAC do sistema original
  const isVendedor    = perfil?.role === 'vendedor'
  const isGestorSub   = perfil?.role === 'gestor_sub'
  const isGestorGeral = perfil?.role === 'gestor_geral'
  const isGestor      = isGestorSub || isGestorGeral
  const isAdmin       = isGestorGeral

  return {
    user, perfil, loading,
    signIn, signUp, signOut, resetPassword,
    isVendedor, isGestorSub, isGestorGeral, isGestor, isAdmin,
  }
}