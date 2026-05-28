import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(val) {
  try { return Number(val||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }
  catch { return 'R$ 0' }
}

function pct(val, total) {
  if (!total || total === 0) return 0
  return Math.round((val/total)*100)
}

function Card({ title, accent='#f0b429', children }) {
  return (
    <div style={{ padding:'20px 22px', borderRadius:14,
      background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
      backdropFilter:'blur(32px)', border:'1px solid #1e2030', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${accent},transparent)`, opacity:0.45 }} />
      {title && <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#f0f1ff', marginBottom:16 }}>{title}</h3>}
      {children}
    </div>
  )
}

function StatBox({ label, value, cor='#f0b429', sub }) {
  return (
    <div style={{ padding:'16px 18px', borderRadius:12,
      background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
      backdropFilter:'blur(32px)', border:'1px solid #1e2030', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${cor},transparent)`, opacity:0.50 }} />
      <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>{label}</p>
      <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:cor, wordBreak:'break-word' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#4c5070', marginTop:4 }}>{sub}</p>}
    </div>
  )
}

export function IntelPage({ perfil, abaInicial = 'hub' }) {
  const [leads,    setLeads]    = useState([])
  const [equipe,   setEquipe]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [erro,     setErro]     = useState(null)
  const [abaAtiva, setAbaAtiva] = useState(abaInicial)

  useEffect(() => { carregar() }, [])
  useEffect(() => { setAbaAtiva(abaInicial) }, [abaInicial])

  async function carregar() {
    setLoading(true)
    setErro(null)
    try {
      const { data: l, error: e1 } = await supabase
        .from('leads').select('id,nome,status,valor,aprovado,estornado,is_inadimplente,origem_lead,produto,user_id,created_at,historico')
        .order('created_at', { ascending: false })
      if (e1) throw e1

      const { data: p, error: e2 } = await supabase.from('profiles').select('id,full_name,role')
      if (e2) throw e2

      setLeads(l || [])
      setEquipe(p || [])
    } catch (e) {
      console.error('IntelPage erro:', e)
      setErro(e.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  if (erro) return (
    <div style={{ padding:24, borderRadius:14, background:'rgba(255,77,106,0.08)', border:'1px solid rgba(255,77,106,0.24)', color:'#ff4d6a' }}>
      <h3 style={{ fontFamily:'Syne,sans-serif', marginBottom:8 }}>⚠️ Erro ao carregar Intel</h3>
      <p style={{ fontSize:13 }}>{erro}</p>
      <button onClick={carregar} style={{ marginTop:14, padding:'8px 18px', background:'rgba(255,77,106,0.14)', border:'1px solid rgba(255,77,106,0.28)', borderRadius:8, color:'#ff4d6a', cursor:'pointer', fontWeight:700 }}>Tentar novamente</button>
    </div>
  )

  // ── Cálculos seguros ──────────────────────────────────────
  const total       = leads.length
  const lFechados   = leads.filter(l => l.status==='Fechados' && l.aprovado===true && !l.estornado)
  const lPerdidos   = leads.filter(l => l.status==='Perdidos')
  const lEstornados = leads.filter(l => l.estornado===true)
  const lInad       = leads.filter(l => l.is_inadimplente===true && !l.estornado)
  const lPendentes  = leads.filter(l => l.status==='Fechados' && (l.aprovado===false||l.aprovado===null) && !l.estornado)
  const receita     = lFechados.reduce((s,l) => s + (parseFloat(l.valor)||0), 0)
  const ticket      = lFechados.length > 0 ? Math.round(receita/lFechados.length) : 0
  const taxaConv    = total > 0 ? Math.round((lFechados.length/total)*100) : 0

  // Por vendedor
  const porVendedor = equipe
    .filter(v => v && v.id)
    .map(v => {
      const vLeads  = leads.filter(l => l.user_id === v.id)
      const vFech   = vLeads.filter(l => l.status==='Fechados' && l.aprovado===true && !l.estornado)
      const vRec    = vFech.reduce((s,l) => s+(parseFloat(l.valor)||0), 0)
      const vConv   = vLeads.length > 0 ? Math.round((vFech.length/vLeads.length)*100) : 0
      return { id:v.id, nome:v.full_name||'—', total:vLeads.length, fechados:vFech.length, receita:vRec, conv:vConv }
    })
    .filter(v => v.total > 0)
    .sort((a,b) => b.receita - a.receita)
    .slice(0, 6)

  // Por origem
  const porOrigem = {}
  leads.forEach(l => {
    const k = (l.origem_lead || 'Não informado').trim()
    porOrigem[k] = (porOrigem[k]||0) + 1
  })
  const origemTop = Object.entries(porOrigem).sort((a,b)=>b[1]-a[1]).slice(0,6)

  // Por produto (receita)
  const porProduto = {}
  lFechados.forEach(l => {
    const k = (l.produto || 'Sem produto').trim()
    porProduto[k] = (porProduto[k]||0) + (parseFloat(l.valor)||0)
  })
  const produtoTop = Object.entries(porProduto).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Movimentações — com proteção contra historico não-array
  const movimentacoes = leads
    .filter(l => Array.isArray(l.historico) && l.historico.length > 0)
    .flatMap(l => l.historico.map(h => ({ ...h, leadNome: l.nome || '—' })))
    .filter(m => m && m.data)
    .sort((a,b) => {
      try { return new Date(b.data) - new Date(a.data) } catch { return 0 }
    })
    .slice(0, 40)

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>⚡ HAPSIS Intel</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Inteligência operacional em tempo real</p>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:8, marginBottom:22 }}>
        {[['hub','⚡ Central Intel'],['mov','📡 Movimentações']].map(([id,label]) => (
          <button key={id} onClick={() => setAbaAtiva(id)}
            style={{ padding:'9px 18px', borderRadius:9, border:'1px solid',
              background: abaAtiva===id ? 'rgba(157,111,255,0.14)' : 'transparent',
              borderColor: abaAtiva===id ? 'rgba(157,111,255,0.36)' : 'rgba(255,255,255,0.10)',
              color: abaAtiva===id ? '#9d6fff' : '#4c5070',
              cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CENTRAL INTEL ─────────────────────────────────── */}
      {abaAtiva === 'hub' && (
        <div>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
            <StatBox label="Total Leads"   value={total}           cor="#4d9fff" sub={`${leads.filter(l=>!['Fechados','Perdidos'].includes(l.status)).length} em andamento`} />
            <StatBox label="Receita Total" value={fmt(receita)}    cor="#00c896" sub={`${lFechados.length} vendas fechadas`} />
            <StatBox label="Tx Conversão"  value={taxaConv+'%'}    cor="#f0b429" sub={`ticket médio ${fmt(ticket)}`} />
            <StatBox label="Atenção"       value={lPendentes.length + lInad.length + lEstornados.length} cor="#ff4d6a" sub={`${lPendentes.length} pend · ${lInad.length} inad · ${lEstornados.length} est`} />
          </div>

          {/* Ranking + Origem */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:18 }}>
            <Card title="🏆 Ranking Geral" accent="#9d6fff">
              {porVendedor.length === 0 ? (
                <p style={{ color:'#4c5070', fontSize:13 }}>Nenhum dado de vendedores ainda.</p>
              ) : porVendedor.map((v, i) => (
                <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12,
                  padding:'10px 12px', borderRadius:10,
                  background: i===0 ? 'rgba(240,180,41,0.06)' : 'rgba(255,255,255,0.02)',
                  border:`1px solid ${i===0?'rgba(240,180,41,0.18)':'rgba(255,255,255,0.04)'}` }}>
                  <span style={{ fontSize:14, width:24, textAlign:'center', flexShrink:0 }}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#f0f1ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.nome}</p>
                    <p style={{ fontSize:11, color:'#4c5070' }}>{v.fechados} fechados · {v.conv}% conv · {v.total} leads</p>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:'#00c896', flexShrink:0 }}>{fmt(v.receita)}</span>
                </div>
              ))}
            </Card>

            <Card title="📍 Origem dos Leads" accent="#4d9fff">
              {origemTop.length === 0 ? (
                <p style={{ color:'#4c5070', fontSize:13 }}>Sem dados de origem ainda.</p>
              ) : origemTop.map(([origem, qtd]) => (
                <div key={origem} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, color:'#8f94b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>{origem}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#4d9fff', flexShrink:0 }}>{qtd} ({pct(qtd,total)}%)</span>
                  </div>
                  <div style={{ height:4, background:'rgba(0,0,0,0.42)', borderRadius:4, overflow:'hidden' }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct(qtd,total)}%` }} transition={{ duration:0.8 }}
                      style={{ height:'100%', background:'#4d9fff', borderRadius:4 }} />
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Receita por produto */}
          <Card title="📦 Receita por Produto" accent="#f0b429">
            {produtoTop.length === 0 ? (
              <p style={{ color:'#4c5070', fontSize:13 }}>Nenhuma venda com produto cadastrado ainda.</p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
                {produtoTop.map(([prod, val]) => (
                  <div key={prod} style={{ padding:'12px 14px', borderRadius:10,
                    background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize:12, color:'#8f94b0', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prod}</p>
                    <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#f0b429' }}>{fmt(val)}</p>
                    <p style={{ fontSize:11, color:'#4c5070', marginTop:2 }}>{pct(val,receita)}% da receita</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MOVIMENTAÇÕES ─────────────────────────────────── */}
      {abaAtiva === 'mov' && (
        <Card title="📡 Histórico de Movimentações" accent="#ff8c42">
          {movimentacoes.length === 0 ? (
            <div style={{ textAlign:'center', color:'#4c5070', padding:'40px 0' }}>
              <span style={{ fontSize:40, display:'block', marginBottom:10, opacity:0.3 }}>📡</span>
              <p>Nenhuma movimentação registrada ainda.</p>
            </div>
          ) : movimentacoes.map((m, i) => {
            const cor = m.msg?.includes('✅') ? '#00c896'
              : (m.msg?.includes('❌') || m.msg?.includes('↩️')) ? '#ff4d6a'
              : m.msg?.includes('⚠️') ? '#ff8c42'
              : m.msg?.includes('🎉') ? '#f0b429'
              : '#4d9fff'
            let dataStr = '—'
            try { dataStr = new Date(m.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) } catch {}

            return (
              <motion.div key={i}
                initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.02 }}
                style={{ display:'flex', gap:14, padding:'11px 0',
                  borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'flex-start' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:cor,
                  boxShadow:`0 0 6px ${cor}`, flexShrink:0, marginTop:4 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'#f0f1ff',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>
                      {m.leadNome}
                    </span>
                    <span style={{ fontSize:10.5, color:'#4c5070', flexShrink:0 }}>{dataStr}</span>
                  </div>
                  <p style={{ fontSize:12, color:'#8f94b0', margin:0 }}>{m.msg || '—'}</p>
                </div>
              </motion.div>
            )
          })}
        </Card>
      )}
    </div>
  )
}