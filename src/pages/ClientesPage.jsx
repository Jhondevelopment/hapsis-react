import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function ClientesPage({ perfil }) {
  const [clientes,    setClientes]    = useState([])
  const [vendedores,  setVendedores]  = useState({})
  const [loading,     setLoading]     = useState(true)
  const [busca,       setBusca]       = useState('')
  const [filtro,      setFiltro]      = useState('todos')
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      // Buscar TODOS os leads fechados — aprovados, pendentes e estornados
      let q = supabase.from('leads').select('*').eq('status','Fechados').order('created_at',{ascending:false})
      if (perfil?.role === 'vendedor') q = q.eq('user_id', perfil.id)
      const { data } = await q
      setClientes(data || [])

      // Buscar nomes dos vendedores
      const ids = [...new Set((data||[]).map(l=>l.user_id).filter(Boolean))]
      if (ids.length > 0) {
        const { data: perfis } = await supabase.from('profiles').select('id,full_name').in('id',ids)
        const map = {}
        ;(perfis||[]).forEach(p => { map[p.id] = p.full_name })
        setVendedores(map)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtrados = clientes.filter(c => {
    const matchBusca  = !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca) || c.produto?.toLowerCase().includes(busca.toLowerCase())
    const matchFiltro = filtro==='todos'
      || (filtro==='aprovados'   && c.aprovado===true  && !c.estornado)
      || (filtro==='pendentes'   && (c.aprovado===false||c.aprovado===null) && !c.estornado)
      || (filtro==='recorrente'  && c.is_recorrente    && !c.estornado)
      || (filtro==='inadimplente'&& c.is_inadimplente  && !c.estornado)
      || (filtro==='estornado'   && c.estornado)
    return matchBusca && matchFiltro
  })

  const receitaTotal = clientes.filter(c=>c.aprovado===true&&!c.estornado).reduce((s,c)=>s+(parseFloat(c.valor)||0),0)
  const mrr          = clientes.filter(c=>c.is_recorrente&&c.aprovado===true&&!c.estornado).reduce((s,c)=>s+(parseFloat(c.valor)||0),0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>Base de Clientes</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Todos os leads fechados · {clientes.length} registros</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
        {[
          { label:'Total Clientes', v:clientes.length,                                                                               cor:'#4d9fff' },
          { label:'Receita Total',  v:receitaTotal.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}), cor:'#00c896' },
          { label:'MRR Base',       v:mrr.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}),           cor:'#f0b429' },
          { label:'Inadimplentes',  v:clientes.filter(c=>c.is_inadimplente).length,                                                  cor:'#ff4d6a' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'16px 18px', borderRadius:12,
            background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
            backdropFilter:'blur(32px)', border:'1px solid #1e2030', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,
              background:`linear-gradient(90deg,transparent,${s.cor},transparent)`, opacity:0.5 }} />
            <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:s.cor }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cliente..."
            style={{ padding:'8px 14px 8px 34px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, color:'#f0f1ff', fontSize:13, outline:'none', width:220, fontFamily:'inherit',
              transition:'border-color 0.2s' }}
            onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
          <span style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#4c5070' }}>🔍</span>
        </div>
        {[
          ['todos','Todos'],['aprovados','✅ Aprovados'],['pendentes','⏳ Pendentes'],
          ['recorrente','📈 MRR'],['inadimplente','⚠️ Inad.'],['estornado','↩️ Estornados']
        ].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltro(v)}
            style={{ padding:'7px 14px', borderRadius:8, border:'1px solid',
              background:filtro===v?'rgba(240,180,41,0.12)':'transparent',
              borderColor:filtro===v?'rgba(240,180,41,0.36)':'rgba(255,255,255,0.10)',
              color:filtro===v?'#f0b429':'#4c5070', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            {l}
          </button>
        ))}
        <span style={{ fontSize:12, color:'#4c5070', marginLeft:'auto' }}>{filtrados.length} registros</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:selecionado?'1fr 360px':'1fr', gap:14 }}>
        {/* Tabela */}
        <div style={{ background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:14, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'rgba(0,0,0,0.22)' }}>
              <tr>{['Cliente','Produto','Valor','Vendedor','Status','Data'].map(h=>(
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700,
                  color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px',
                  borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtrados.map(c=>{
                const statusCor   = c.estornado?'#ff8c42':c.is_inadimplente?'#ff4d6a':c.aprovado===true?'#00c896':'#ff8c42'
                const statusLabel = c.estornado?'↩️ Estornado':c.is_inadimplente?'⚠️ Inadimplente':c.aprovado===true?'✅ Aprovado':'⏳ Pendente'
                return(
                  <tr key={c.id} onClick={()=>setSelecionado(selecionado?.id===c.id?null:c)}
                    style={{ cursor:'pointer', borderBottom:'1px solid rgba(30,32,48,0.42)', transition:'background 0.15s',
                      background:selecionado?.id===c.id?'rgba(240,180,41,0.05)':'transparent' }}
                    onMouseEnter={e=>{ if(selecionado?.id!==c.id) e.currentTarget.style.background='rgba(255,255,255,0.025)' }}
                    onMouseLeave={e=>{ if(selecionado?.id!==c.id) e.currentTarget.style.background='transparent' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%',
                          background:`${statusCor}18`, border:`1px solid ${statusCor}28`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:13, fontWeight:700, color:statusCor, flexShrink:0 }}>
                          {c.nome?.[0]?.toUpperCase()||'?'}
                        </div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:600, color:'#f0f1ff', margin:0 }}>{c.nome}</p>
                          {c.telefone && <p style={{ fontSize:11, color:'#4c5070', margin:0 }}>{c.telefone}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#8f94b0', fontSize:13 }}>{c.produto||'—'}</td>
                    <td style={{ padding:'12px 16px', color:'#00c896', fontWeight:700, fontSize:13 }}>
                      {parseFloat(c.valor)>0?`R$ ${parseFloat(c.valor).toLocaleString('pt-BR')}`:'—'}
                    </td>
                    <td style={{ padding:'12px 16px', color:'#9d6fff', fontSize:12 }}>{vendedores[c.user_id]||'—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background:`${statusCor}18`, color:statusCor }}>{statusLabel}</span>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#4c5070', fontSize:12 }}>
                      {c.created_at?new Date(c.created_at).toLocaleDateString('pt-BR'):'—'}
                    </td>
                  </tr>
                )
              })}
              {filtrados.length===0 && (
                <tr><td colSpan={6} style={{ padding:'40px', textAlign:'center', color:'#4c5070', fontSize:13 }}>
                  Nenhum cliente encontrado
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Painel detalhe */}
        {selecionado && (
          <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}
            style={{ padding:20, borderRadius:14,
              background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
              backdropFilter:'blur(24px)', border:'1px solid #1e2030',
              alignSelf:'flex-start', position:'sticky', top:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'#f0f1ff' }}>Detalhes</h3>
              <button onClick={()=>setSelecionado(null)} style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:18 }}>×</button>
            </div>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(0,200,150,0.12)',
              border:'2px solid rgba(0,200,150,0.30)', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:22, fontWeight:700, color:'#00c896',
              margin:'0 auto 14px', fontFamily:'Syne,sans-serif' }}>
              {selecionado.nome?.[0]?.toUpperCase()||'?'}
            </div>
            <h4 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#f0f1ff', textAlign:'center', marginBottom:4 }}>{selecionado.nome}</h4>
            <p style={{ fontSize:12, color:'#4c5070', textAlign:'center', marginBottom:16 }}>{selecionado.telefone||'Sem telefone'}</p>

            {[
              { l:'Produto',    v:selecionado.produto||'—' },
              { l:'Valor',      v:parseFloat(selecionado.valor)>0?`R$ ${parseFloat(selecionado.valor).toLocaleString('pt-BR')}`:'—' },
              { l:'Origem',     v:selecionado.origem_lead||'—' },
              { l:'Pagamento',  v:selecionado.forma_pagamento||'—' },
              { l:'Vendedor',   v:vendedores[selecionado.user_id]||'—' },
              { l:'Data',       v:selecionado.created_at?new Date(selecionado.created_at).toLocaleDateString('pt-BR'):'—' },
            ].map(({l,v})=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize:12, color:'#4c5070' }}>{l}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'#f0f1ff' }}>{v}</span>
              </div>
            ))}

            {/* Documentos */}
            {(selecionado.comprovante_url||selecionado.contrato_url||selecionado.doc_importante_url) && (
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#4c5070', marginBottom:10 }}>Documentos</p>
                {selecionado.comprovante_url && <a href={selecionado.comprovante_url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'7px 12px', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.20)', borderRadius:8, color:'#00c896', fontSize:12, fontWeight:600, textDecoration:'none', marginBottom:6 }}>💳 Comprovante</a>}
                {selecionado.contrato_url && <a href={selecionado.contrato_url} target="_blank" rel="noreferrer" style={{ display:'block', padding:'7px 12px', background:'rgba(77,159,255,0.08)', border:'1px solid rgba(77,159,255,0.20)', borderRadius:8, color:'#4d9fff', fontSize:12, fontWeight:600, textDecoration:'none', marginBottom:6 }}>📄 Contrato</a>}
              </div>
            )}

            {selecionado.observacoes && (
              <div style={{ marginTop:14, padding:'12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize:11, color:'#4c5070', marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>Observações</p>
                <p style={{ fontSize:12.5, color:'#8f94b0', lineHeight:1.6 }}>{selecionado.observacoes}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}