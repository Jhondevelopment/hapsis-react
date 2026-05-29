import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

function sanitizar(dados) {
  const clean = { ...dados }
  const datas = ['data_followup', 'data_vencimento']
  datas.forEach(campo => {
    if (campo in clean && (!clean[campo] || clean[campo] === '')) clean[campo] = null
  })
  if ('valor' in clean && (!clean.valor || clean.valor === '')) clean.valor = null
  ;['motivo_perda','origem_lead','forma_pagamento','telefone','produto','observacoes']
    .forEach(k => { if (k in clean && clean[k] === '') clean[k] = null })
  return clean
}

export function useLeads(perfil) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const canalRef = useRef(null)

  const carregar = useCallback(async () => {
    if (!perfil?.id) return
    try {
      let q = supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (perfil.role === 'vendedor') q = q.eq('user_id', perfil.id)
      const { data, error } = await q
      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('useLeads erro:', err)
    } finally {
      setLoading(false)
    }
  }, [perfil?.id, perfil?.role])

  useEffect(() => {
    if (!perfil?.id) return
    carregar()

    // Canal único por usuário — evita conflitos
    const canalNome = `leads-${perfil.id}`
    if (canalRef.current) supabase.removeChannel(canalRef.current)

    canalRef.current = supabase
      .channel(canalNome)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'leads'
      }, () => carregar())
      .subscribe()

    return () => {
      if (canalRef.current) {
        supabase.removeChannel(canalRef.current)
        canalRef.current = null
      }
    }
  }, [perfil?.id, carregar])

  async function criarLead(dados) {
    const clean = sanitizar({ ...dados, user_id: perfil.id })
    if (clean.status === 'Fechados') clean.aprovado = false
    const { data, error } = await supabase.from('leads').insert([clean]).select().single()
    if (error) throw error
    return data
  }

  async function atualizarLead(id, dados) {
    const clean     = sanitizar(dados)
    const leadAtual = leads.find(l => l.id === id)
    if (clean.status === 'Fechados' && leadAtual?.status !== 'Fechados') {
      clean.aprovado = false
      const hist = [...(leadAtual?.historico || [])]
      hist.push({ data: new Date().toISOString(), msg: `🎉 Venda fechada` })
      clean.historico = hist
    }
    const { error } = await supabase.from('leads').update(clean).eq('id', id)
    if (error) throw error
  }

  async function deletarLead(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
  }

  async function moverLead(id, novoStatus) {
    const lead    = leads.find(l => l.id === id)
    if (!lead) return
    const payload = sanitizar({ status: novoStatus })
    if (novoStatus === 'Fechados' && lead.status !== 'Fechados') {
      payload.aprovado = false
      const hist = [...(lead.historico || [])]
      hist.push({ data: new Date().toISOString(), msg: `🎉 Movido para Fechados — aguardando aprovação` })
      payload.historico = hist
    }
    if (lead.status === 'Fechados' && novoStatus !== 'Fechados') {
      payload.aprovado  = null
      payload.estornado = false
    }
    const { error } = await supabase.from('leads').update(payload).eq('id', id)
    if (error) throw error
  }

  const porStatus = (status) => leads.filter(l => l.status === status)
  const fechados   = leads.filter(l => l.status === 'Fechados' && l.aprovado === true && !l.estornado)
  const receita    = fechados.reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)

  return { leads, loading, carregar, criarLead, atualizarLead, deletarLead, moverLead, porStatus, fechados, receita }
}