import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}

// ── Sistema tipográfico enterprise ────────────────────────────
const T = {
  label:     { fontSize:10, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.9px', fontFamily:'DM Sans,sans-serif', margin:'0 0 8px', display:'block' },
  value:     { fontSize:26, fontWeight:700, lineHeight:1, fontFamily:'Syne,sans-serif', margin:0, fontVariantNumeric:'tabular-nums' },
  sub:       { fontSize:11.5, fontWeight:400, color:'#8f94b0', margin:'5px 0 0', fontFamily:'DM Sans,sans-serif' },
  cardTitle: { fontSize:13.5, fontWeight:700, color:'#f0f1ff', fontFamily:'Syne,sans-serif', margin:0, letterSpacing:'-0.1px' },
  pageTitle: { fontSize:22, fontWeight:700, color:'#f0f1ff', fontFamily:'Syne,sans-serif', margin:0, letterSpacing:'-0.4px' },
  pageSub:   { fontSize:12, fontWeight:400, color:'#4c5070', fontFamily:'DM Sans,sans-serif', margin:'4px 0 0' },
  thead:     { fontSize:10, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Sans,sans-serif', padding:'11px 14px', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)', whiteSpace:'nowrap' },
  cell:      { padding:'12px 14px', fontFamily:'DM Sans,sans-serif', fontSize:13, fontVariantNumeric:'tabular-nums' },
  num:       { fontVariantNumeric:'tabular-nums', fontFamily:'DM Sans,sans-serif', fontFeatureSettings:'"tnum"' },
}

const SURFACE = { background:'rgba(14,15,22,0.88)', backdropFilter:'blur(28px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }
const ACCENT  = (cor) => ({ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${cor},transparent)`, opacity:0.5 })

export function RelatorioPage({ perfil }) {
  const [leads,    setLeads]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('mensal')
  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      let q = supabase.from('leads').select('*').order('created_at',{ascending:false})
      if (!isGestor) q = q.eq('user_id', perfil.id)
      const { data } = await q
      setLeads(data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const dadosPorMes = (() => {
    const meses = {}
    leads.forEach(l => {
      if (!l.created_at) return
      const d   = new Date(l.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (!meses[key]) meses[key] = { key, receita:0, qtdFechados:0, qtdPerdidos:0, valorPerdas:0, leads:0, inad:0, estornados:0 }
      meses[key].leads++
      if (l.status==='Fechados'&&l.aprovado===true&&!l.estornado) { meses[key].receita+=parseFloat(l.valor)||0; meses[key].qtdFechados++ }
      if (l.status==='Perdidos') { meses[key].qtdPerdidos++; meses[key].valorPerdas+=parseFloat(l.valor)||0 }
      if (l.is_inadimplente&&!l.estornado) meses[key].inad++
      if (l.estornado) meses[key].estornados++
    })
    return Object.values(meses).sort((a,b)=>b.key.localeCompare(a.key)).map(m => ({
      ...m,
      mes: new Date(m.key+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
      conv: m.leads>0 ? Math.round((m.qtdFechados/m.leads)*100) : 0,
    }))
  })()

  const receitaAcumulada = (() => {
    let acum = 0
    return [...dadosPorMes].reverse().map(m => { acum+=m.receita; return { ...m, acumulado:acum } })
  })()

  const totais = {
    receita:    dadosPorMes.reduce((s,m)=>s+m.receita,0),
    perdas:     dadosPorMes.reduce((s,m)=>s+m.valorPerdas,0),
    fechados:   dadosPorMes.reduce((s,m)=>s+m.qtdFechados,0),
    leads:      dadosPorMes.reduce((s,m)=>s+m.leads,0),
  }
  totais.conv = totais.leads>0 ? Math.round((totais.fechados/totais.leads)*100) : 0

  const maxReceita = Math.max(...dadosPorMes.map(m=>m.receita), 1)

  function exportarCSV() {
    const cols = ['Mês','Leads','Fechados','Perdidos','Receita','Valor Perdas','Conversão %','Inadimplentes','Estornados','Acumulado']
    const rows = receitaAcumulada.map(m=>[m.mes,m.leads,m.qtdFechados,m.qtdPerdidos,m.receita.toFixed(2),m.valorPerdas.toFixed(2),m.conv,m.inad,m.estornados,m.acumulado.toFixed(2)])
    const csv  = [cols.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const a    = document.createElement('a')
    a.href     = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv)
    a.download = `hapsis_relatorio_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <motion.div style={{width:36,height:36,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429'}}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{...T.pageTitle}}>{isGestor ? 'Relatório Geral' : 'Meu Relatório'}</h1>
          <p style={{...T.pageSub}}>Faturamento e perdas por mês</p>
        </div>
        <motion.button onClick={exportarCSV} whileHover={{y:-1}} whileTap={{scale:0.97}}
          style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',
            background:'rgba(33,163,102,0.10)',border:'1px solid rgba(33,163,102,0.25)',
            borderRadius:10,color:'#21a366',fontWeight:700,fontSize:12.5,cursor:'pointer',
            fontFamily:'DM Sans,sans-serif',letterSpacing:'0.2px'}}>
          📥 Exportar CSV
        </motion.button>
      </div>

      {/* Stat cards — valores nivelados */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'Receita Total',   v:fmt(totais.receita),  cor:'#f0b429'},
          {label:'Valor de Perdas', v:fmt(totais.perdas),   cor:'#ff4d6a'},
          {label:'Fechados',        v:String(totais.fechados), cor:'#00c896'},
          {label:'Conversão Geral', v:totais.conv+'%',      cor:'#9d6fff'},
        ].map(s=>(
          <div key={s.label} style={{...SURFACE, padding:'18px 20px', position:'relative', overflow:'hidden'}}>
            <div style={{...ACCENT(s.cor)}} />
            <span style={{...T.label}}>{s.label}</span>
            <p style={{...T.value, color:s.cor}}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16,padding:'4px',background:'rgba(0,0,0,0.28)',borderRadius:11,border:'1px solid rgba(255,255,255,0.07)',width:'fit-content'}}>
        {[['mensal','📅 Por Mês'],['grafico','📊 Gráfico'],['acumulado','📈 Acumulado']].map(([id,label])=>(
          <button key={id} onClick={()=>setAbaAtiva(id)}
            style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
              background:abaAtiva===id?'rgba(240,180,41,0.13)':'transparent',
              color:abaAtiva===id?'#f0b429':'#4c5070',
              fontSize:12.5,fontWeight:700,fontFamily:'DM Sans,sans-serif',
              transition:'all 0.15s',outline:'none'}}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA POR MÊS */}
      {abaAtiva==='mensal' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{...SURFACE, overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{background:'rgba(0,0,0,0.20)'}}>
              <tr>
                {['Mês','Leads','Fechados','Perdidos','Receita','Perdas','Conversão','Inad.','Estornos'].map(h=>(
                  <th key={h} style={{...T.thead}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosPorMes.map((m,i)=>(
                <motion.tr key={m.key} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*0.025}}
                  style={{borderBottom:'1px solid rgba(30,32,48,0.45)',transition:'background 0.15s',cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...T.cell, color:'#f0f1ff', fontWeight:600, textTransform:'capitalize'}}>{m.mes}</td>
                  <td style={{...T.cell, color:'#4d9fff', fontWeight:700}}>{m.leads}</td>
                  <td style={{...T.cell, color:'#00c896', fontWeight:700}}>{m.qtdFechados}</td>
                  <td style={{...T.cell, color:'#ff4d6a'}}>{m.qtdPerdidos}</td>
                  <td style={{...T.cell, color:'#f0b429', fontWeight:700}}>{fmt(m.receita)}</td>
                  <td style={{...T.cell, color:'#ff4d6a'}}>{m.valorPerdas>0 ? fmt(m.valorPerdas) : <span style={{color:'#4c5070'}}>—</span>}</td>
                  <td style={{...T.cell}}>
                    <span style={{fontSize:12.5,fontWeight:700,...T.num,color:m.conv>=50?'#00c896':m.conv>=30?'#f0b429':'#ff4d6a'}}>{m.conv}%</span>
                  </td>
                  <td style={{...T.cell, color:m.inad>0?'#ff4d6a':'#4c5070'}}>{m.inad||<span style={{color:'#4c5070'}}>—</span>}</td>
                  <td style={{...T.cell, color:m.estornados>0?'#ff8c42':'#4c5070'}}>{m.estornados||<span style={{color:'#4c5070'}}>—</span>}</td>
                </motion.tr>
              ))}
              {dadosPorMes.length===0 && (
                <tr><td colSpan={9} style={{padding:'40px',textAlign:'center',color:'#4c5070',fontSize:13,fontFamily:'DM Sans,sans-serif'}}>Nenhum dado disponível</td></tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* ABA GRÁFICO */}
      {abaAtiva==='grafico' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{...SURFACE, padding:'22px 24px'}}>
          <h3 style={{...T.cardTitle, marginBottom:20}}>Receita vs Perdas por Mês</h3>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[...dadosPorMes].reverse().map((m,i)=>(
              <motion.div key={m.key} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                  <span style={{fontSize:12.5,color:'#8f94b0',textTransform:'capitalize',minWidth:150,fontFamily:'DM Sans,sans-serif'}}>{m.mes}</span>
                  <div style={{display:'flex',gap:16,alignItems:'baseline'}}>
                    <span style={{fontSize:13,color:'#f0b429',fontWeight:700,...T.num}}>{fmt(m.receita)}</span>
                    {m.valorPerdas>0 && <span style={{fontSize:12,color:'#ff4d6a',...T.num}}>-{fmt(m.valorPerdas)}</span>}
                    <span style={{fontSize:11,color:'#4c5070',fontWeight:700,...T.num}}>{m.conv}%</span>
                  </div>
                </div>
                <div style={{height:8,background:'rgba(0,0,0,0.38)',borderRadius:6,overflow:'hidden',marginBottom:3}}>
                  <motion.div initial={{width:0}} animate={{width:`${(m.receita/maxReceita)*100}%`}}
                    transition={{duration:1,delay:i*0.04,ease:[0.22,1,0.36,1]}}
                    style={{height:'100%',background:'linear-gradient(90deg,#f0b429,#c9960e)',borderRadius:6}} />
                </div>
                {m.valorPerdas>0 && (
                  <div style={{height:5,background:'rgba(0,0,0,0.38)',borderRadius:6,overflow:'hidden'}}>
                    <motion.div initial={{width:0}} animate={{width:`${(m.valorPerdas/maxReceita)*100}%`}}
                      transition={{duration:1,delay:i*0.04+0.1,ease:[0.22,1,0.36,1]}}
                      style={{height:'100%',background:'linear-gradient(90deg,#ff4d6a,#cc2d4a)',borderRadius:6}} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div style={{display:'flex',gap:20,marginTop:20,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            {[['#f0b429','Receita'],['#ff4d6a','Perdas']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:10,height:10,borderRadius:2,background:c}} />
                <span style={{fontSize:12,color:'#8f94b0',fontFamily:'DM Sans,sans-serif'}}>{l}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ABA ACUMULADO */}
      {abaAtiva==='acumulado' && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{...SURFACE, overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{background:'rgba(0,0,0,0.20)'}}>
              <tr>
                {['Mês','Receita do Mês','Receita Acumulada','Crescimento'].map(h=>(
                  <th key={h} style={{...T.thead}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receitaAcumulada.map((m,i)=>{
                const ant   = receitaAcumulada[i-1]
                const cresc = ant&&ant.receita>0 ? Math.round(((m.receita-ant.receita)/ant.receita)*100) : null
                return (
                  <tr key={m.key} style={{borderBottom:'1px solid rgba(30,32,48,0.45)',transition:'background 0.15s',cursor:'default'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...T.cell, color:'#f0f1ff', fontWeight:600, textTransform:'capitalize'}}>{m.mes}</td>
                    <td style={{...T.cell, color:'#f0b429', fontWeight:700, fontSize:14, ...T.num}}>{fmt(m.receita)}</td>
                    <td style={{...T.cell, color:'#00c896', fontWeight:700, fontSize:14, ...T.num}}>{fmt(m.acumulado)}</td>
                    <td style={{...T.cell}}>
                      {cresc!==null
                        ? <span style={{fontSize:12.5,fontWeight:700,...T.num,color:cresc>=0?'#00c896':'#ff4d6a'}}>{cresc>=0?'↑':'↓'} {Math.abs(cresc)}%</span>
                        : <span style={{color:'#4c5070',fontSize:12}}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}