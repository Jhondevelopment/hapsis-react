import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const roleInfo = {
  gestor_geral: {
    label: 'Gestor Geral', cor: '#9d6fff', icon: '👑',
    desc: 'Acesso completo a toda a plataforma',
    permissoes: [
      'Dashboard CEO completo', 'Pipeline de toda equipe', 'Gestão de equipes',
      'Aprovações de vendas', 'Financeiro completo', 'MRR e base de clientes',
      'OKRs e Playbook', 'IA Preditiva', 'Exportação de dados',
      'Inadimplência', 'Produtos e regras', 'HAPSIS Intel',
    ],
  },
  gestor_sub: {
    label: 'Sub Gerente', cor: '#f0b429', icon: '💼',
    desc: 'Gestão financeira e operacional da equipe',
    permissoes: [
      'Dashboard operacional', 'Pipeline da equipe', 'Aprovações de vendas',
      'Caixa e comissões', 'MRR', 'Contas a pagar', 'Inadimplência',
      'Base de clientes', 'Gestão de equipes',
    ],
  },
  vendedor: {
    label: 'Vendedor', cor: '#4d9fff', icon: '🧑‍💼',
    desc: 'Acesso ao pipeline e relatórios pessoais',
    permissoes: [
      'Meu pipeline', 'Agenda de follow-ups', 'Arena de vendas',
      'Meu relatório', 'IA Preditiva', 'Meu perfil',
    ],
  },
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#4c5070', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function InputField({ value, onChange, type = 'text', placeholder, readOnly }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type} value={value || ''} onChange={onChange}
      placeholder={placeholder} readOnly={readOnly}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', background: readOnly ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${focused ? 'rgba(240,180,41,0.45)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10, padding: '12px 16px', fontSize: 14, color: readOnly ? '#4c5070' : '#f0f1ff',
        outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s',
        cursor: readOnly ? 'not-allowed' : 'text',
        boxShadow: focused ? '0 0 0 3px rgba(240,180,41,0.09)' : 'none',
      }}
    />
  )
}

function Alert({ type, children }) {
  const cor = type === 'success' ? '#00c896' : '#ff4d6a'
  const bg  = type === 'success' ? 'rgba(0,200,150,0.08)' : 'rgba(255,77,106,0.08)'
  const bd  = type === 'success' ? 'rgba(0,200,150,0.22)' : 'rgba(255,77,106,0.22)'
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ padding: '11px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, color: cor, background: bg, border: `1px solid ${bd}` }}>
      {children}
    </motion.div>
  )
}

export function PerfilPage({ perfil: perfilProp }) {
  const [perfil,        setPerfil]        = useState(perfilProp || {})
  const [loading,       setLoading]       = useState(false)
  const [msg,           setMsg]           = useState(null) // { type, text }
  const [abaAtiva,      setAbaAtiva]      = useState('dados')
  const [mudandoSenha,  setMudandoSenha]  = useState(false)
  const [senhas,        setSenhas]        = useState({ nova: '', confirmar: '' })
  const [mostrarSenha,  setMostrarSenha]  = useState(false)
  const [estatisticas,  setEstatisticas]  = useState(null)
  const [loadingStats,  setLoadingStats]  = useState(true)

  const info = roleInfo[perfil.role] || roleInfo.vendedor

  useEffect(() => { carregarEstatisticas() }, [perfil.id])

  async function carregarEstatisticas() {
    if (!perfil.id) return
    try {
      const { data: leads } = await supabase.from('leads').select('status, valor, aprovado, estornado').eq('user_id', perfil.id)
      const todos    = leads || []
      const fechados = todos.filter(l => l.status === 'Fechados' && l.aprovado && !l.estornado)
      const receita  = fechados.reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
      const perdidos = todos.filter(l => l.status === 'Perdidos').length
      const conv     = todos.length > 0 ? Math.round((fechados.length / todos.length) * 100) : 0
      setEstatisticas({ total: todos.length, fechados: fechados.length, receita, perdidos, conv })
    } catch (e) { console.error(e) }
    finally { setLoadingStats(false) }
  }

  function set(campo, valor) { setPerfil(p => ({ ...p, [campo]: valor })) }

  function showMsg(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  async function salvarPerfil() {
    if (!perfil.full_name?.trim()) { showMsg('error', 'O nome é obrigatório.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name:   perfil.full_name,
        telefone:    perfil.telefone || null,
        meta_mensal: perfil.meta_mensal ? parseFloat(perfil.meta_mensal) : null,
        nome_empresa: perfil.nome_empresa || null,
      }).eq('id', perfil.id)
      if (error) throw error
      showMsg('success', '✅ Perfil atualizado com sucesso!')
    } catch (err) { showMsg('error', err.message) }
    finally { setLoading(false) }
  }

  async function salvarSenha() {
    if (senhas.nova.length < 6) { showMsg('error', 'A senha deve ter pelo menos 6 caracteres.'); return }
    if (senhas.nova !== senhas.confirmar) { showMsg('error', 'As senhas não coincidem.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senhas.nova })
      if (error) throw error
      setSenhas({ nova: '', confirmar: '' })
      setMudandoSenha(false)
      showMsg('success', '✅ Senha alterada com sucesso!')
    } catch (err) { showMsg('error', err.message) }
    finally { setLoading(false) }
  }

  async function solicitarResetSenha() {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(perfil.email || '', { redirectTo: window.location.origin })
      if (error) throw error
      showMsg('success', '📧 Link de redefinição enviado para seu e-mail!')
    } catch (err) { showMsg('error', err.message) }
  }

  const abas = [
    { id: 'dados',       label: '👤 Dados',       show: true },
    { id: 'seguranca',   label: '🔐 Segurança',   show: true },
    { id: 'estatisticas',label: '📊 Estatísticas', show: true },
    { id: 'permissoes',  label: '🔑 Permissões',  show: true },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: '#f0f1ff' }}>Meu Perfil</h1>
        <p style={{ fontSize: 13, color: '#4c5070', marginTop: 4 }}>Gerencie sua conta e preferências</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

        {/* ── Coluna esquerda — Identidade ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Card de identidade */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: 24, borderRadius: 16, background: 'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))', backdropFilter: 'blur(32px)', border: '1px solid #1e2030', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${info.cor},transparent)`, opacity: 0.55 }} />

            {/* Avatar */}
            <motion.div whileHover={{ scale: 1.05 }}
              style={{ width: 80, height: 80, borderRadius: '50%', background: `${info.cor}18`, border: `3px solid ${info.cor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne,sans-serif', fontSize: 32, fontWeight: 700, color: info.cor, margin: '0 auto 16px', boxShadow: `0 0 28px ${info.cor}22` }}>
              {perfil.full_name?.[0]?.toUpperCase() || '?'}
            </motion.div>

            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 17, color: '#f0f1ff', marginBottom: 4 }}>
              {perfil.full_name || 'Sem nome'}
            </h3>
            <p style={{ fontSize: 12, color: '#4c5070', marginBottom: 14 }}>{perfil.email}</p>

            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 99, background: `${info.cor}18`, color: info.cor, border: `1px solid ${info.cor}30` }}>
              {info.icon} {info.label}
            </span>

            <p style={{ fontSize: 12, color: '#4c5070', marginTop: 10, lineHeight: 1.5 }}>{info.desc}</p>

            {perfil.equipe && (
              <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#8f94b0' }}>
                🏢 Equipe: <strong style={{ color: '#f0f1ff' }}>{perfil.equipe}</strong>
              </div>
            )}
          </motion.div>

          {/* Stats rápidos */}
          {estatisticas && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ padding: 20, borderRadius: 16, background: 'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))', backdropFilter: 'blur(32px)', border: '1px solid #1e2030' }}>
              <h4 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: '#f0f1ff', marginBottom: 14 }}>⚡ Seus Números</h4>
              {[
                { l: 'Total Leads',   v: estatisticas.total,                                                                                          c: '#4d9fff' },
                { l: 'Fechados',      v: estatisticas.fechados,                                                                                       c: '#00c896' },
                { l: 'Conversão',     v: estatisticas.conv + '%',                                                                                     c: '#f0b429' },
                { l: 'Receita',       v: estatisticas.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), c: '#00c896' },
                { l: 'Perdidos',      v: estatisticas.perdidos,                                                                                       c: '#ff4d6a' },
              ].map(s => (
                <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12.5, color: '#8f94b0' }}>{s.l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.c }}>{s.v}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Coluna direita — Conteúdo em abas ── */}
        <div>
          {/* Abas */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {abas.filter(a => a.show).map(aba => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)}
                style={{ padding: '10px 18px', border: 'none', background: abaAtiva === aba.id ? 'rgba(240,180,41,0.08)' : 'transparent',
                  color: abaAtiva === aba.id ? '#f0b429' : '#4c5070',
                  borderBottom: abaAtiva === aba.id ? '2px solid #f0b429' : '2px solid transparent',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: '8px 8px 0 0', transition: 'all 0.2s' }}>
                {aba.label}
              </button>
            ))}
          </div>

          <motion.div
            key={abaAtiva}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: '24px', borderRadius: '0 0 16px 16px', background: 'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))', backdropFilter: 'blur(32px)', border: '1px solid #1e2030', borderTop: 'none' }}
          >

            {/* ── ABA DADOS ── */}
            {abaAtiva === 'dados' && (
              <div>
                <h4 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: '#f0f1ff', marginBottom: 22 }}>Informações Pessoais</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Campo label="Nome completo *">
                    <InputField value={perfil.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Seu nome completo" />
                  </Campo>
                  <Campo label="Telefone / WhatsApp">
                    <InputField value={perfil.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" type="tel" />
                  </Campo>
                </div>

                <Campo label="E-mail (não editável)">
                  <InputField value={perfil.email} readOnly />
                </Campo>

                <Campo label="Cargo">
                  <InputField value={roleInfo[perfil.role]?.label || perfil.role} readOnly />
                </Campo>

                {/* Meta para todos os roles */
                true && (
                  <Campo label="Meta Mensal (R$)">
                    <InputField value={perfil.meta_mensal} onChange={e => set('meta_mensal', e.target.value)} placeholder="Ex: 10000" type="number" />
                  </Campo>
                )}

                {(perfil.role === 'gestor_geral') && (
                  <>
                    <Campo label="Nome da Empresa">
                      <InputField value={perfil.nome_empresa} onChange={e => set('nome_empresa', e.target.value)} placeholder="Ex: Empresa XPTO" />
                    </Campo>
                    <Campo label="Cor Primária (hex)">
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <InputField value={perfil.cor_primaria} onChange={e => set('cor_primaria', e.target.value)} placeholder="#f0b429" />
                        <input type="color" value={perfil.cor_primaria || '#f0b429'}
                          onChange={e => set('cor_primaria', e.target.value)}
                          style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', cursor: 'pointer', padding: 2 }} />
                      </div>
                    </Campo>
                  </>
                )}

                <AnimatePresence>
                  {msg && <Alert type={msg.type}>{msg.text}</Alert>}
                </AnimatePresence>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <motion.button onClick={salvarPerfil} disabled={loading}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    style={{ padding: '12px 28px', background: 'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 10, color: '#060709', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'Syne,sans-serif', opacity: loading ? 0.7 : 1 }}>
                    {loading ? 'Salvando...' : '💾 Salvar Alterações'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* ── ABA SEGURANÇA ── */}
            {abaAtiva === 'seguranca' && (
              <div>
                <h4 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: '#f0f1ff', marginBottom: 22 }}>Segurança da Conta</h4>

                {/* Info da conta */}
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#8f94b0' }}>E-mail da conta</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f1ff' }}>{perfil.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#8f94b0' }}>Status</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,200,150,0.12)', color: '#00c896' }}>✓ Ativa</span>
                  </div>
                </div>

                {/* Mudar senha */}
                <div style={{ padding: 20, borderRadius: 12, background: 'rgba(157,111,255,0.04)', border: '1px solid rgba(157,111,255,0.18)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mudandoSenha ? 18 : 0 }}>
                    <div>
                      <h5 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: '#f0f1ff', marginBottom: 3 }}>🔑 Alterar Senha</h5>
                      <p style={{ fontSize: 12, color: '#4c5070' }}>Escolha uma senha forte com letras, números e símbolos</p>
                    </div>
                    <button onClick={() => setMudandoSenha(v => !v)}
                      style={{ padding: '8px 16px', background: mudandoSenha ? 'rgba(255,77,106,0.12)' : 'rgba(157,111,255,0.12)', border: `1px solid ${mudandoSenha ? 'rgba(255,77,106,0.28)' : 'rgba(157,111,255,0.28)'}`, borderRadius: 8, color: mudandoSenha ? '#ff4d6a' : '#9d6fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {mudandoSenha ? 'Cancelar' : 'Alterar'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {mudandoSenha && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        {[
                          { label: 'Nova Senha', campo: 'nova' },
                          { label: 'Confirmar Nova Senha', campo: 'confirmar' },
                        ].map(f => (
                          <div key={f.campo} style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#4c5070', marginBottom: 8 }}>{f.label}</label>
                            <div style={{ position: 'relative' }}>
                              <input type={mostrarSenha ? 'text' : 'password'} value={senhas[f.campo]}
                                onChange={e => setSenhas(s => ({ ...s, [f.campo]: e.target.value }))}
                                placeholder="••••••••"
                                style={{ width: '100%', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 44px 12px 16px', fontSize: 14, color: '#f0f1ff', outline: 'none', fontFamily: 'inherit' }} />
                              {f.campo === 'nova' && (
                                <button type="button" onClick={() => setMostrarSenha(v => !v)}
                                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4c5070', cursor: 'pointer', fontSize: 16 }}>
                                  {mostrarSenha ? '🙈' : '👁️'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {senhas.nova && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                              {[0,1,2,3].map(i => {
                                const checks = [senhas.nova.length>=6, /[A-Z]/.test(senhas.nova), /[0-9]/.test(senhas.nova), /[^A-Za-z0-9]/.test(senhas.nova)]
                                const score  = checks.filter(Boolean).length
                                const cores  = ['#ff4d6a','#ff8c42','#f0b429','#00c896']
                                return <div key={i} style={{ flex:1, height:3, borderRadius:3, background: i<score?cores[score-1]:'rgba(255,255,255,0.06)', transition:'all 0.3s' }} />
                              })}
                            </div>
                            <p style={{ fontSize:11, color:['#ff4d6a','#ff8c42','#f0b429','#00c896'][[senhas.nova.length>=6,/[A-Z]/.test(senhas.nova),/[0-9]/.test(senhas.nova),/[^A-Za-z0-9]/.test(senhas.nova)].filter(Boolean).length-1]||'#4c5070' }}>
                              {['Muito fraca','Fraca','Média','Forte'][[senhas.nova.length>=6,/[A-Z]/.test(senhas.nova),/[0-9]/.test(senhas.nova),/[^A-Za-z0-9]/.test(senhas.nova)].filter(Boolean).length-1]||'Digite a senha'}
                            </p>
                          </div>
                        )}
                        <motion.button onClick={salvarSenha} disabled={loading}
                          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                          style={{ padding: '11px 24px', background: 'linear-gradient(180deg,rgba(157,111,255,0.88),rgba(139,92,246,0.82))', border: '1px solid rgba(255,255,255,0.24)', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'Syne,sans-serif' }}>
                          ✓ Confirmar nova senha
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Reset por e-mail */}
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h5 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: '#f0f1ff', marginBottom: 5 }}>📧 Redefinir por E-mail</h5>
                  <p style={{ fontSize: 12, color: '#4c5070', marginBottom: 12 }}>Receba um link de redefinição no seu e-mail</p>
                  <button onClick={solicitarResetSenha}
                    style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, color: '#8f94b0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    Enviar link de redefinição
                  </button>
                </div>

                <AnimatePresence>
                  {msg && <div style={{ marginTop: 16 }}><Alert type={msg.type}>{msg.text}</Alert></div>}
                </AnimatePresence>
              </div>
            )}

            {/* ── ABA ESTATÍSTICAS ── */}
            {abaAtiva === 'estatisticas' && (
              <div>
                <h4 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: '#f0f1ff', marginBottom: 22 }}>Seu Desempenho</h4>
                {loadingStats ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <motion.div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#f0b429' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                  </div>
                ) : estatisticas ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                      {[
                        { l: 'Total Leads',   v: estatisticas.total,                                                                                           c: '#4d9fff' },
                        { l: 'Fechados',      v: estatisticas.fechados,                                                                                        c: '#00c896' },
                        { l: 'Conversão',     v: estatisticas.conv + '%',                                                                                      c: '#f0b429' },
                        { l: 'Receita Total', v: estatisticas.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}),       c: '#00c896' },
                        { l: 'Perdidos',      v: estatisticas.perdidos,                                                                                        c: '#ff4d6a' },
                        { l: 'Em Andamento',  v: estatisticas.total - estatisticas.fechados - estatisticas.perdidos,                                           c: '#ff8c42' },
                      ].map(s => (
                        <div key={s.l} style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                          <p style={{ fontSize: 10.5, color: '#4c5070', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{s.l}</p>
                          <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</p>
                        </div>
                      ))}
                    </div>

                    {/* Barra de progresso de meta */}
                    {perfil.meta_mensal && (
                      <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f1ff' }}>Meta Mensal</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#f0b429' }}>
                            {Math.round((estatisticas.receita / parseFloat(perfil.meta_mensal)) * 100)}%
                          </span>
                        </div>
                        <div style={{ height: 8, background: 'rgba(0,0,0,0.42)', borderRadius: 6, overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }}
                            animate={{ width: `${Math.min((estatisticas.receita / parseFloat(perfil.meta_mensal)) * 100, 100)}%` }}
                            transition={{ duration: 1.2, ease: [0.22,1,0.36,1] }}
                            style={{ height: '100%', background: 'linear-gradient(90deg,#f0b429,#00c896)', borderRadius: 6 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: '#4c5070' }}>{estatisticas.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}</span>
                          <span style={{ fontSize: 11, color: '#4c5070' }}>Meta: {parseFloat(perfil.meta_mensal).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: '#4c5070', fontSize: 13 }}>Sem dados disponíveis</p>
                )}
              </div>
            )}

            {/* ── ABA PERMISSÕES ── */}
            {abaAtiva === 'permissoes' && (
              <div>
                <h4 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: '#f0f1ff', marginBottom: 6 }}>Permissões de Acesso</h4>
                <p style={{ fontSize: 13, color: '#4c5070', marginBottom: 22 }}>
                  Cargo: <strong style={{ color: info.cor }}>{info.icon} {info.label}</strong> — {info.desc}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {info.permissoes.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#00c896', fontSize: 13, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, color: '#8f94b0' }}>{p}</span>
                    </div>
                  ))}
                </div>

                {/* Todos os níveis de acesso */}
                <div style={{ padding: 18, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h5 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: '#f0f1ff', marginBottom: 14 }}>Hierarquia de Acesso</h5>
                  {[
                    { role: 'gestor_geral', info: roleInfo.gestor_geral },
                    { role: 'gestor_sub',   info: roleInfo.gestor_sub   },
                    { role: 'vendedor',     info: roleInfo.vendedor     },
                  ].map(({ role, info: ri }) => (
                    <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '10px 14px', borderRadius: 10, background: perfil.role === role ? `${ri.cor}10` : 'transparent', border: `1px solid ${perfil.role === role ? `${ri.cor}30` : 'rgba(255,255,255,0.04)'}` }}>
                      <span style={{ fontSize: 18 }}>{ri.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: perfil.role === role ? ri.cor : '#8f94b0' }}>{ri.label}</p>
                        <p style={{ fontSize: 11, color: '#4c5070' }}>{ri.desc}</p>
                      </div>
                      {perfil.role === role && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${ri.cor}18`, color: ri.cor, border: `1px solid ${ri.cor}30` }}>Seu cargo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  )
}