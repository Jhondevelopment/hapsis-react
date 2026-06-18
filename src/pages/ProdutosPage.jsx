import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Modal de confirmação interno ──────────────────────────────
function ModalConfirm({ titulo, mensagem, corBotao='#ff4d6a', labelBotao='Confirmar', onConfirmar, onCancelar }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.80)', backdropFilter:'blur(16px)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{ opacity:0, scale:0.95, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
        style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:380,
          background:'rgba(8,8,14,0.99)', backdropFilter:'blur(52px)',
          border:`1px solid ${corBotao}33`, boxShadow:'0 40px 100px rgba(0,0,0,0.80)' }}>
        <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:`linear-gradient(90deg,transparent,${corBotao}55,transparent)` }} />
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:`${corBotao}14`, border:`1px solid ${corBotao}30`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 14px' }}>🗑️</div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:17, color:'#f0f1ff', marginBottom:8 }}>{titulo}</h3>
          <p style={{ fontSize:13, color:'#8f94b0', lineHeight:1.6 }}>{mensagem}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancelar}
            style={{ flex:1, padding:'11px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, color:'#8f94b0', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Cancelar
          </button>
          <button onClick={onConfirmar}
            style={{ flex:2, padding:'11px', background:`linear-gradient(160deg,${corBotao}dd,${corBotao}aa)`, border:'1px solid rgba(255,255,255,0.18)', borderRadius:10, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
            {labelBotao}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Toast interno ─────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
      style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
        padding:'10px 20px', borderRadius:99, fontSize:13, fontWeight:700, zIndex:999,
        background: type==='success' ? '#00c896' : '#ff4d6a',
        color: type==='success' ? '#060609' : '#fff',
        boxShadow:'0 8px 24px rgba(0,0,0,0.4)', whiteSpace:'nowrap' }}>
      {msg}
    </motion.div>
  )
}

export function ProdutosPage({ perfil }) {
  const [aba,         setAba]         = useState('catalogo') // 'catalogo' | 'auditoria'
  const [produtos,    setProdutos]    = useState([])
  const [leads,       setLeads]       = useState([])
  const [vendedores,  setVendedores]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [modal,       setModal]       = useState(false)
  const [editando,    setEditando]    = useState(null)
  const [confirmarId, setConfirmarId] = useState(null)
  const [toast,       setToast]       = useState(null)
  const [form,        setForm]        = useState({ nome:'', valor:'', taxa_comissao:5 })
  const [filtroVend,  setFiltroVend]  = useState('')
  const [filtroPeriodo,setFiltroPeriodo] = useState('30')

  useEffect(() => { carregar() }, [])

  function showToast(msg, type='success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  async function carregar() {
    try {
      const { data } = await supabase.from('produtos').select('*').order('nome')
      setProdutos(data || [])

      // Carregar leads com produto e valor preenchidos (para auditoria de desconto)
      const { data: leadsData } = await supabase.from('leads')
        .select('id,nome,produto,valor,user_id,created_at,status')
        .not('produto', 'is', null)
        .not('valor', 'is', null)
        .order('created_at', { ascending: false })
      setLeads(leadsData || [])

      // Carregar vendedores para mapear user_id -> nome
      const { data: vendData } = await supabase.from('profiles')
        .select('id,full_name,role')
      setVendedores(vendData || [])
    } catch { setProdutos([]) }
    finally { setLoading(false) }
  }

  async function salvar() {
    if (!form.nome.trim()) { showToast('Informe o nome do produto', 'error'); return }
    setSaving(true)
    try {
      if (editando) {
        await supabase.from('produtos').update(form).eq('id', editando)
        showToast('✅ Produto atualizado!')
      } else {
        await supabase.from('produtos').insert([form])
        showToast('✅ Produto cadastrado!')
      }
      fecharModal()
      carregar()
    } catch (err) {
      showToast('Erro: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmarDeletar() {
    try {
      await supabase.from('produtos').delete().eq('id', confirmarId)
      setConfirmarId(null)
      showToast('🗑️ Produto removido')
      carregar()
    } catch (err) {
      showToast('Erro ao deletar: ' + err.message, 'error')
      setConfirmarId(null)
    }
  }

  function fecharModal() {
    setModal(false)
    setEditando(null)
    setForm({ nome:'', valor:'', taxa_comissao:5 })
  }

  function editar(p) {
    setEditando(p.id)
    setForm({ nome:p.nome, valor:p.valor||'', taxa_comissao:p.taxa_comissao||5 })
    setModal(true)
  }

  // ── Processar auditoria de descontos ────────────────────────
  const diasFiltro = parseInt(filtroPeriodo, 10)
  const limiteData = new Date(); limiteData.setDate(limiteData.getDate() - diasFiltro)

  const descontos = leads
    .filter(l => l.created_at && new Date(l.created_at) >= limiteData)
    .map(l => {
      const prod = produtos.find(p => p.nome === l.produto)
      if (!prod || !prod.valor) return null
      const precoTabela = parseFloat(prod.valor) || 0
      const valorVendido = parseFloat(l.valor) || 0
      if (precoTabela <= 0 || valorVendido <= 0 || valorVendido >= precoTabela) return null
      const vend = vendedores.find(v => v.id === l.user_id)
      return {
        leadId: l.id,
        cliente: l.nome,
        produto: l.produto,
        vendedorNome: vend?.full_name || 'Desconhecido',
        vendedorId: l.user_id,
        precoTabela,
        valorVendido,
        diferenca: precoTabela - valorVendido,
        pct: Math.round(((precoTabela - valorVendido) / precoTabela) * 100),
        data: l.created_at,
        status: l.status,
      }
    })
    .filter(Boolean)
    .filter(d => !filtroVend || d.vendedorId === filtroVend)
    .sort((a,b) => b.pct - a.pct)

  const totalDescontos     = descontos.length
  const receitaPerdida     = descontos.reduce((s,d) => s + d.diferenca, 0)
  const mediaDescontoPct   = totalDescontos > 0 ? Math.round(descontos.reduce((s,d) => s + d.pct, 0) / totalDescontos) : 0

  // Ranking por vendedor
  const rankingMap = {}
  descontos.forEach(d => {
    if (!rankingMap[d.vendedorId]) rankingMap[d.vendedorId] = { nome: d.vendedorNome, count:0, total:0 }
    rankingMap[d.vendedorId].count += 1
    rankingMap[d.vendedorId].total += d.diferenca
  })
  const ranking = Object.values(rankingMap).sort((a,b) => b.total - a.total)

  const vendedoresLista = vendedores.filter(v => v.role === 'vendedor')

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Produtos & Regras</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>{produtos.length} produto{produtos.length!==1?'s':''} cadastrado{produtos.length!==1?'s':''}</p>
        </div>
        {aba === 'catalogo' && (
          <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
            onClick={() => { fecharModal(); setModal(true) }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px',
              background:'linear-gradient(180deg,rgba(240,180,41,0.18),rgba(240,180,41,0.09))',
              border:'1px solid rgba(240,180,41,0.28)', borderRadius:10,
              color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + Novo Produto
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:22, padding:4, borderRadius:12,
        background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', width:'fit-content' }}>
        {[
          ['catalogo','📦 Catálogo'],
          ['auditoria','🔍 Auditoria de Descontos'],
        ].map(([id,label]) => (
          <motion.button key={id} onClick={() => setAba(id)} whileTap={{ scale:0.97 }}
            style={{ padding:'9px 18px', border:'none', borderRadius:9,
              background: aba===id ? 'linear-gradient(180deg,rgba(240,180,41,0.20),rgba(240,180,41,0.10))' : 'transparent',
              color: aba===id ? '#f0b429' : '#4c5070', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.15s' }}>
            {label}
            {id==='auditoria' && totalDescontos > 0 && (
              <span style={{ marginLeft:8, fontSize:10.5, fontWeight:800, padding:'1px 7px', borderRadius:99,
                background: aba===id ? 'rgba(240,180,41,0.25)' : 'rgba(255,140,66,0.18)',
                color: aba===id ? '#f0b429' : '#ff8c42' }}>{totalDescontos}</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* ABA CATÁLOGO */}
      {aba === 'catalogo' && (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {produtos.map((p, i) => (
          <motion.div key={p.id}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
            whileHover={{ y:-2 }}
            style={{ padding:20, borderRadius:14,
              background:'linear-gradient(180deg,rgba(240,180,41,0.08) 0%,rgba(10,11,18,0.95) 60%)',
              backdropFilter:'blur(24px)', border:'1px solid rgba(240,180,41,0.18)',
              position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
              background:'linear-gradient(90deg,transparent,#f0b429,transparent)', opacity:0.45 }} />

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:'rgba(240,180,41,0.14)',
                border:'1px solid rgba(240,180,41,0.28)', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:19, flexShrink:0 }}>📦</div>
              <div style={{ display:'flex', gap:6 }}>
                <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }} onClick={() => editar(p)}
                  style={{ padding:'5px 12px', background:'rgba(77,159,255,0.12)',
                    border:'1px solid rgba(77,159,255,0.26)', borderRadius:7,
                    color:'#4d9fff', fontSize:11.5, cursor:'pointer', fontWeight:700 }}>
                  Editar
                </motion.button>
                <motion.button whileHover={{ y:-1 }} whileTap={{ scale:0.97 }} onClick={() => setConfirmarId(p.id)}
                  style={{ padding:'5px 12px', background:'rgba(255,77,106,0.10)',
                    border:'1px solid rgba(255,77,106,0.22)', borderRadius:7,
                    color:'#ff4d6a', fontSize:11.5, cursor:'pointer', fontWeight:700 }}>
                  Remover
                </motion.button>
              </div>
            </div>

            <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff', marginBottom:6 }}>{p.nome}</h3>
            

            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {p.valor && (
                <div style={{ padding:'5px 10px', borderRadius:8, background:'rgba(0,200,150,0.10)',
                  border:'1px solid rgba(0,200,150,0.22)' }}>
                  <span style={{ fontSize:12.5, color:'#00c896', fontWeight:700 }}>
                    💰 R$ {parseFloat(p.valor).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              <div style={{ padding:'5px 10px', borderRadius:8, background:'rgba(240,180,41,0.10)',
                border:'1px solid rgba(240,180,41,0.22)' }}>
                <span style={{ fontSize:12.5, color:'#f0b429', fontWeight:700 }}>
                  💸 {p.taxa_comissao}% comissão
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {produtos.length === 0 && (
          <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', height:220, color:'#4c5070' }}>
            <span style={{ fontSize:44, marginBottom:12, opacity:0.25 }}>📦</span>
            <p style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Nenhum produto cadastrado</p>
            <p style={{ fontSize:12, color:'#323448' }}>Crie o primeiro produto para liberar o pipeline dos vendedores</p>
          </div>
        )}
      </div>
      )}

      {/* ABA AUDITORIA DE DESCONTOS */}
      {aba === 'auditoria' && (
        <div>
          {/* Filtros */}
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
              style={{ padding:'9px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
                borderRadius:10, color:'#f0f1ff', fontSize:12.5, outline:'none', cursor:'pointer', fontWeight:600 }}>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
            <select value={filtroVend} onChange={e => setFiltroVend(e.target.value)}
              style={{ padding:'9px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
                borderRadius:10, color: filtroVend ? '#f0f1ff' : '#4c5070', fontSize:12.5, outline:'none', cursor:'pointer', fontWeight:600 }}>
              <option value="">Todos os vendedores</option>
              {vendedoresLista.map(v => <option key={v.id} value={v.id}>{v.full_name}</option>)}
            </select>
          </div>

          {/* Métricas-chave */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:22 }}>
            <div style={{ padding:'18px 20px', borderRadius:14,
              background:'linear-gradient(180deg,rgba(255,140,66,0.10) 0%,rgba(10,11,18,0.95) 60%)',
              border:'1px solid rgba(255,140,66,0.22)' }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Descontos no período</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'#ff8c42' }}>{totalDescontos}</p>
            </div>
            <div style={{ padding:'18px 20px', borderRadius:14,
              background:'linear-gradient(180deg,rgba(255,77,106,0.10) 0%,rgba(10,11,18,0.95) 60%)',
              border:'1px solid rgba(255,77,106,0.22)' }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Receita perdida</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#ff4d6a' }}>
                R$ {receitaPerdida.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
              </p>
            </div>
            <div style={{ padding:'18px 20px', borderRadius:14,
              background:'linear-gradient(180deg,rgba(240,180,41,0.10) 0%,rgba(10,11,18,0.95) 60%)',
              border:'1px solid rgba(240,180,41,0.22)' }}>
              <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Desconto médio</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:800, color:'#f0b429' }}>{mediaDescontoPct}%</p>
            </div>
          </div>

          {/* Ranking de vendedores */}
          {ranking.length > 0 && (
            <div style={{ marginBottom:22 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff', marginBottom:12 }}>
                🏆 Ranking — quem mais concede desconto
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ranking.slice(0,5).map((r,i) => {
                  const maxTotal = ranking[0]?.total || 1
                  const pct = (r.total / maxTotal) * 100
                  return (
                    <div key={r.nome} style={{ padding:'12px 16px', borderRadius:11,
                      background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#f0f1ff' }}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}º`} {r.nome}
                        </span>
                        <span style={{ fontSize:12.5, fontWeight:700, color:'#ff4d6a' }}>
                          R$ {r.total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} · {r.count}x
                        </span>
                      </div>
                      <div style={{ height:6, borderRadius:6, background:'rgba(0,0,0,0.35)', overflow:'hidden' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6, delay:i*0.05 }}
                          style={{ height:'100%', borderRadius:6, background:'linear-gradient(90deg,#ff8c42,#ff4d6a)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabela detalhada */}
          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff', marginBottom:12 }}>
            📋 Histórico Detalhado
          </h3>
          <div style={{ background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
            backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:14, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ background:'rgba(0,0,0,0.22)' }}>
                <tr>{['Vendedor','Cliente','Produto','Tabela','Vendido','Desconto','Data'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10.5, fontWeight:700,
                    color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px',
                    borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {descontos.map(d => (
                  <tr key={d.leadId} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)' }}>
                    <td style={{ padding:'12px 14px', color:'#f0f1ff', fontWeight:600, fontSize:13 }}>{d.vendedorNome}</td>
                    <td style={{ padding:'12px 14px', color:'#8f94b0', fontSize:13 }}>{d.cliente}</td>
                    <td style={{ padding:'12px 14px', color:'#8f94b0', fontSize:13 }}>{d.produto}</td>
                    <td style={{ padding:'12px 14px', color:'#00c896', fontSize:12.5, fontVariantNumeric:'tabular-nums' }}>
                      R$ {d.precoTabela.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td style={{ padding:'12px 14px', color:'#f0f1ff', fontSize:12.5, fontVariantNumeric:'tabular-nums' }}>
                      R$ {d.valorVendido.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:800, padding:'3px 9px', borderRadius:99,
                        background: d.pct>30 ? 'rgba(255,77,106,0.16)' : 'rgba(255,140,66,0.16)',
                        color: d.pct>30 ? '#ff4d6a' : '#ff8c42' }}>
                        -{d.pct}%
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px', color:'#4c5070', fontSize:12 }}>
                      {new Date(d.data).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {descontos.length === 0 && (
                  <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#4c5070', fontSize:13 }}>
                    Nenhum desconto registrado no período selecionado
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      <AnimatePresence>
        {modal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.65)', backdropFilter:'blur(14px)',
            zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e => e.target===e.currentTarget && fecharModal()}>
            <motion.div initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:10, scale:0.97 }}
              style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:420,
                background:'linear-gradient(160deg,rgba(12,13,22,0.99),rgba(8,8,14,0.97))',
                backdropFilter:'blur(52px)', border:'1px solid rgba(255,255,255,0.07)',
                boxShadow:'0 32px 84px rgba(0,0,0,0.70)' }}>
              <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1,
                background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.42),transparent)' }} />

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>
                  {editando ? '✏️ Editar Produto' : '📦 Novo Produto'}
                </h2>
                <motion.button whileHover={{ rotate:90, color:'#ff4d6a' }} onClick={fecharModal}
                  style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.07)',
                    border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:15 }}>×</motion.button>
              </div>

              {[
                { label:'Nome *',       campo:'nome',      placeholder:'Ex: Plano Premium', type:'text' },
                { label:'Preço (R$)',   campo:'valor',     placeholder:'0,00', type:'number' },
              ].map(f => (
                <div key={f.campo} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                  <input type={f.type} value={form[f.campo]} placeholder={f.placeholder}
                    onChange={e => setForm(prev => ({ ...prev, [f.campo]: e.target.value }))}
                    style={{ width:'100%', background:'rgba(255,255,255,0.035)',
                      border:'1px solid rgba(255,255,255,0.08)', borderRadius:10,
                      padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' }}
                    onFocus={e => e.target.style.borderColor='rgba(240,180,41,0.45)'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                </div>
              ))}

              <div style={{ marginBottom:24 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Taxa de Comissão (%)</label>
                <input type="number" value={form.taxa_comissao} min="0" max="100"
                  onChange={e => setForm(prev => ({ ...prev, taxa_comissao: parseFloat(e.target.value)||0 }))}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)',
                    border:'1px solid rgba(255,255,255,0.08)', borderRadius:10,
                    padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }}
                  onFocus={e => e.target.style.borderColor='rgba(240,180,41,0.45)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                <p style={{ fontSize:11, color:'#4c5070', marginTop:5 }}>
                  Comissão que o vendedor recebe por cada venda deste produto
                </p>
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={fecharModal}
                  style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.07)',
                    border:'1px solid rgba(255,255,255,0.10)', borderRadius:10,
                    color:'#8f94b0', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancelar
                </button>
                <motion.button onClick={salvar} disabled={saving} whileHover={{ y:-1 }} whileTap={{ scale:0.98 }}
                  style={{ flex:2, padding:'12px',
                    background: saving ? 'rgba(240,180,41,0.5)' : 'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',
                    border:'1px solid rgba(255,255,255,0.28)', borderRadius:10,
                    color:'#060709', fontWeight:700, fontSize:14, cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily:'Syne,sans-serif' }}>
                  {saving ? 'Salvando...' : editando ? 'Salvar Alterações' : '+ Criar Produto'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal confirmar deleção */}
      <AnimatePresence>
        {confirmarId && (
          <ModalConfirm
            titulo="Remover produto?"
            mensagem="Este produto será removido permanentemente e não poderá ser recuperado."
            corBotao="#ff4d6a"
            labelBotao="🗑️ Remover"
            onConfirmar={confirmarDeletar}
            onCancelar={() => setConfirmarId(null)}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </div>
  )
}