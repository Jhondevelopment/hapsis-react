import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function sanitizar(dados) {
  const clean = { ...dados }
  const datas = ['data_followup', 'data_vencimento']
  datas.forEach(campo => {
    if (campo in clean && (!clean[campo] || clean[campo] === '')) clean[campo] = null
  })
  if ('valor' in clean && (!clean.valor || clean.valor === '')) clean.valor = null
  const opcionais = ['motivo_perda','origem_lead','forma_pagamento','telefone','produto','observacoes']
  opcionais.forEach(campo => {
    if (campo in clean && clean[campo] === '') clean[campo] = null
  })
  return clean
}

export function useLeads(perfil) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const carregar = useCallback(async () => {
    if (!perfil) return
    setLoading(true)
    try {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (perfil.role === 'vendedor') query = query.eq('user_id', perfil.id)
      const { data, error } = await query
      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [perfil])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!perfil) return
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'leads' }, () => carregar())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [perfil, carregar])

  async function criarLead(dados) {
    const clean = sanitizar({ ...dados, user_id: perfil.id })
    // Sempre começa sem aprovação — só entra no caixa após gestor aprovar
    if (clean.status === 'Fechados') {
      clean.aprovado = false
    }
    const { data, error } = await supabase.from('leads').insert([clean]).select().single()
    if (error) throw error
    await carregar()
    return data
  }

  async function atualizarLead(id, dados) {
    const clean = sanitizar(dados)
    // Ao mover para Fechados pela primeira vez — seta aprovado=false
    const leadAtual = leads.find(l => l.id === id)
    if (clean.status === 'Fechados' && leadAtual?.status !== 'Fechados') {
      clean.aprovado = false
      const hist = [...(leadAtual?.historico||[])]
      hist.push({ data: new Date().toISOString(), msg: `🎉 Venda fechada por ${perfil?.full_name}` })
      clean.historico = hist
    }
    const { error } = await supabase.from('leads').update(clean).eq('id', id)
    if (error) throw error
    await carregar()
  }

  async function deletarLead(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
    await carregar()
  }

  async function moverLead(id, novoStatus) {
    const lead    = leads.find(l => l.id === id)
    if (!lead) return
    const payload = sanitizar({ status: novoStatus })

    // AO ARRASTAR PARA FECHADOS — aprovado=false automaticamente
    if (novoStatus === 'Fechados' && lead.status !== 'Fechados') {
      payload.aprovado = false
      const hist = [...(lead.historico||[])]
      hist.push({ data: new Date().toISOString(), msg: `🎉 Movido para Fechados por ${perfil?.full_name} — aguardando aprovação` })
      payload.historico = hist
    }

    // Se sair de Fechados — limpa aprovação
    if (lead.status === 'Fechados' && novoStatus !== 'Fechados') {
      payload.aprovado  = null
      payload.estornado = false
    }

    const { error } = await supabase.from('leads').update(payload).eq('id', id)
    if (error) throw error
    await carregar()
  }

  const porStatus = (status) => leads.filter(l => l.status === status)
  const fechados   = leads.filter(l => l.status==='Fechados' && l.aprovado===true && !l.estornado)
  const receita    = fechados.reduce((s,l) => s+(parseFloat(l.valor)||0), 0)

  return { leads, loading, error, carregar, criarLead, atualizarLead, deletarLead, moverLead, porStatus, fechados, receita }
}