import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function ExportacaoPage({ perfil }) {
  const [leads,      setLeads]      = useState([])
  const [vendedores, setVendedores] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [abaAtiva,   setAbaAtiva]   = useState('vendas')
  const [filtroMes,  setFiltroMes]  = useState('')
  const [filtroVend, setFiltroVend] = useState('')
  const [filtroSt,   setFiltroSt]   = useState('')

  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      let q = supabase.from('leads').select('*').order('created_at',{ascending:false})
      if (!isGestor) q = q.eq('user_id', perfil.id)
      const { data: l } = await q
      setLeads(l || [])

      if (isGestor) {
        const { data: p } = await supabase.from('profiles').select('id,full_name')
        setVendedores(p || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Filtros
  const leadsFiltrados = leads.filter(l => {
    if (filtroMes  && l.created_at && !l.created_at.startsWith(filtroMes)) return false
    if (filtroVend && l.user_id !== filtroVend) return false
    if (filtroSt   && l.status !== filtroSt) return false
    return true
  })

  // Relatório por vendedor
  const relatorioVendedor = vendedores.map(v => {
    const vLeads  = leads.filter(l => l.user_id === v.id)
    const vFech   = vLeads.filter(l => l.status==='Fechados' && l.aprovado===true && !l.estornado)
    const vPerc   = vLeads.filter(l => l.status==='Perdidos')
    const vRec    = vFech.reduce((s,l) => s+(parseFloat(l.valor)||0), 0)
    const vConv   = vLeads.length>0 ? Math.round((vFech.length/vLeads.length)*100) : 0
    const vTicket = vFech.length>0 ? Math.round(vRec/vFech.length) : 0
    return { ...v, total:vLeads.length, fechados:vFech.length, perdidos:vPerc.length, receita:vRec, conv:vConv, ticket:vTicket }
  }).sort((a,b) => b.receita - a.receita)

  // Vendas por mês
  const vendasMes = (() => {
    const m = {}
    leads.filter(l=>l.status==='Fechados'&&l.aprovado===true&&!l.estornado).forEach(l=>{
      const d = new Date(l.created_at||Date.now())
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (!m[k]) m[k] = { qtd:0, receita:0 }
      m[k].qtd++
      m[k].receita += parseFloat(l.valor)||0
    })
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([k,v]) => ({ mes:new Date(k+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}), ...v }))
  })()

  function exportarCSV(dados, colunas, nomeArquivo) {
    const csv = [
      colunas.map(c=>c.label).join(','),
      ...dados.map(row => colunas.map(c=>`"${String(row[c.campo]||'').replace(/"/g,'""')}"`).join(','))
    ].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv)
    a.download = `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function exportarVendas() {
    exportarCSV(leadsFiltrados, [
      { label:'Cliente',    campo:'nome' },
      { label:'Telefone',   campo:'telefone' },
      { label:'Produto',    campo:'produto' },
      { label:'Valor',      campo:'valor' },
      { label:'Status',     campo:'status' },
      { label:'Origem',     campo:'origem_lead' },
      { label:'Pagamento',  campo:'forma_pagamento' },
      { label:'Follow-up',  campo:'data_followup' },
      { label:'Data',       campo:'created_at' },
      { label:'Observações',campo:'observacoes' },
    ], 'hapsis_vendas')
  }

  function exportarDesempenho() {
    exportarCSV(relatorioVendedor, [
      { label:'Vendedor',     campo:'full_name' },
      { label:'Total Leads',  campo:'total' },
      { label:'Fechados',     campo:'fechados' },
      { label:'Perdidos',     campo:'perdidos' },
      { label:'Receita',      campo:'receita' },
      { label:'Conversão %',  campo:'conv' },
      { label:'Ticket Médio', campo:'ticket' },
    ], 'hapsis_desempenho')
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>Exportação & Relatórios</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Controle completo de vendas e desempenho</p>
      </div>

      {/* Abas */}
      <div style={{ display:'flex', gap:8, marginBottom:22 }}>
        {[
          ['vendas','📋 Controle de Vendas'],
          ...(isGestor?[['desempenho','👥 Desempenho por Vendedor'],['mensal','📈 Vendas por Mês']]:[])
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setAbaAtiva(id)}
            style={{ padding:'9px 16px', borderRadius:9, border:'1px solid',
              background:abaAtiva===id?'rgba(240,180,41,0.12)':'transparent',
              borderColor:abaAtiva===id?'rgba(240,180,41,0.36)':'rgba(255,255,255,0.10)',
              color:abaAtiva===id?'#f0b429':'#4c5070', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA CONTROLE DE VENDAS */}
      {abaAtiva==='vendas' && (
        <div>
          {/* Filtros */}
          <div style={{ display:'flex', gap:10, marginBottom:16, padding:'14px 16px',
            background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
            backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:12,
            flexWrap:'wrap', alignItems:'center' }}>
            <input type="month" value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
              style={{ padding:'8px 12px', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, color:'#fff', fontSize:13, outline:'none' }} />
            <select value={filtroSt} onChange={e=>setFiltroSt(e.target.value)}
              style={{ padding:'8px 12px', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, color:'#fff', fontSize:13, outline:'none' }}>
              <option value="">Todos os status</option>
              {['Novos','Contato','Negociacao','Fechados','Perdidos'].map(s=><option key={s}>{s}</option>)}
            </select>
            {isGestor && (
              <select value={filtroVend} onChange={e=>setFiltroVend(e.target.value)}
                style={{ padding:'8px 12px', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:8, color:'#fff', fontSize:13, outline:'none' }}>
                <option value="">Todos os vendedores</option>
                {vendedores.map(v=><option key={v.id} value={v.id}>{v.full_name}</option>)}
              </select>
            )}
            <span style={{ fontSize:13, color:'#8f94b0' }}>{leadsFiltrados.length} registros</span>
            <motion.button onClick={exportarVendas} whileHover={{y:-1}} whileTap={{scale:0.97}}
              style={{ marginLeft:'auto', padding:'8px 18px', background:'linear-gradient(180deg,rgba(33,163,102,0.16),rgba(33,163,102,0.08))',
                border:'1px solid rgba(33,163,102,0.28)', borderRadius:9, color:'#21a366', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              📥 Exportar CSV
            </motion.button>
          </div>

          {/* Tabela */}
          <div style={{ background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:14, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ background:'rgba(0,0,0,0.22)' }}>
                <tr>{['Nome','Produto','Valor','Status','Vendedor','Origem','Data'].map(h=>(
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {leadsFiltrados.slice(0,100).map(l=>{
                  const cor={Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}[l.status]||'#4c5070'
                  const nomeV = vendedores.find(v=>v.id===l.user_id)?.full_name || perfil?.full_name || '—'
                  return(
                    <tr key={l.id} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)', transition:'background 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 14px', color:'#f0f1ff', fontWeight:600 }}>{l.nome}</td>
                      <td style={{ padding:'11px 14px', color:'#8f94b0', fontSize:13 }}>{l.produto||'—'}</td>
                      <td style={{ padding:'11px 14px', color:'#00c896', fontWeight:700, fontSize:13 }}>{parseFloat(l.valor)>0?`R$ ${parseFloat(l.valor).toLocaleString('pt-BR')}`:'—'}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:99, background:`${cor}18`, color:cor }}>{l.status}</span>
                      </td>
                      <td style={{ padding:'11px 14px', color:'#9d6fff', fontSize:12 }}>{nomeV}</td>
                      <td style={{ padding:'11px 14px', color:'#8f94b0', fontSize:12 }}>{l.origem_lead||'—'}</td>
                      <td style={{ padding:'11px 14px', color:'#4c5070', fontSize:12 }}>{l.created_at?new Date(l.created_at).toLocaleDateString('pt-BR'):'—'}</td>
                    </tr>
                  )
                })}
                {leadsFiltrados.length===0 && <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#4c5070', fontSize:13 }}>Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
            {leadsFiltrados.length>100 && <div style={{ padding:'12px 16px', fontSize:12, color:'#4c5070', textAlign:'center' }}>Mostrando 100 de {leadsFiltrados.length}. CSV exporta todos.</div>}
          </div>
        </div>
      )}

      {/* ABA DESEMPENHO POR VENDEDOR */}
      {abaAtiva==='desempenho' && isGestor && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <motion.button onClick={exportarDesempenho} whileHover={{y:-1}} whileTap={{scale:0.97}}
              style={{ padding:'8px 18px', background:'linear-gradient(180deg,rgba(33,163,102,0.16),rgba(33,163,102,0.08))',
                border:'1px solid rgba(33,163,102,0.28)', borderRadius:9, color:'#21a366', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              📥 Exportar CSV
            </motion.button>
          </div>
          <div style={{ background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:14, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ background:'rgba(0,0,0,0.22)' }}>
                <tr>{['#','Vendedor','Leads','Fechados','Perdidos','Receita','Conversão','Ticket Médio'].map(h=>(
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {relatorioVendedor.map((v,i)=>(
                  <tr key={v.id} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)', transition:'background 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px', color:'#f0b429', fontWeight:700 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                    </td>
                    <td style={{ padding:'12px 14px', color:'#f0f1ff', fontWeight:600 }}>{v.full_name||'—'}</td>
                    <td style={{ padding:'12px 14px', color:'#4d9fff', fontWeight:600 }}>{v.total}</td>
                    <td style={{ padding:'12px 14px', color:'#00c896', fontWeight:700 }}>{v.fechados}</td>
                    <td style={{ padding:'12px 14px', color:'#ff4d6a' }}>{v.perdidos}</td>
                    <td style={{ padding:'12px 14px', color:'#f0b429', fontWeight:700 }}>
                      {v.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:v.conv>=50?'#00c896':v.conv>=30?'#f0b429':'#ff4d6a' }}>{v.conv}%</span>
                    </td>
                    <td style={{ padding:'12px 14px', color:'#8f94b0' }}>
                      {v.ticket.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                    </td>
                  </tr>
                ))}
                {relatorioVendedor.length===0 && <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center', color:'#4c5070' }}>Sem dados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA VENDAS POR MÊS */}
      {abaAtiva==='mensal' && isGestor && (
        <div style={{ background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'rgba(0,0,0,0.22)' }}>
              <tr>{['Mês','Vendas Fechadas','Receita Total','Receita Acumulada'].map(h=>(
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {vendasMes.length === 0 ? (
                <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#4c5070' }}>Sem dados de vendas fechadas</td></tr>
              ) : (() => {
                let acum = 0
                return vendasMes.map((m,i)=>{
                  acum += m.receita
                  return(
                    <tr key={i} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)' }}>
                      <td style={{ padding:'13px 16px', color:'#f0f1ff', fontWeight:600, textTransform:'capitalize' }}>{m.mes}</td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ fontSize:15, fontWeight:700, color:'#4d9fff' }}>{m.qtd}</span>
                        <span style={{ fontSize:11, color:'#4c5070', marginLeft:6 }}>vendas</span>
                      </td>
                      <td style={{ padding:'13px 16px', color:'#00c896', fontWeight:700, fontSize:15 }}>
                        {m.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                      </td>
                      <td style={{ padding:'13px 16px', color:'#f0b429', fontWeight:600 }}>
                        {acum.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}