import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}

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

  // ── Dados por mês ─────────────────────────────────────────
  const dadosPorMes = (() => {
    const meses = {}
    leads.forEach(l => {
      if (!l.created_at) return
      const d   = new Date(l.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (!meses[key]) meses[key] = {
        key, mes:'', receita:0, qtdFechados:0, qtdPerdidos:0,
        valorPerdas:0, leads:0, inad:0, estornados:0
      }
      meses[key].leads++
      if (l.status==='Fechados'&&l.aprovado===true&&!l.estornado) {
        meses[key].receita    += parseFloat(l.valor)||0
        meses[key].qtdFechados++
      }
      if (l.status==='Perdidos') {
        meses[key].qtdPerdidos++
        meses[key].valorPerdas += parseFloat(l.valor)||0
      }
      if (l.is_inadimplente && !l.estornado) meses[key].inad++
      if (l.estornado) meses[key].estornados++
    })
    return Object.values(meses).sort((a,b)=>b.key.localeCompare(a.key)).map(m => ({
      ...m,
      mes: new Date(m.key+'-01').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
      conv: m.leads>0 ? Math.round((m.qtdFechados/m.leads)*100) : 0,
    }))
  })()

  // ── Receita acumulada ─────────────────────────────────────
  const receitaAcumulada = (() => {
    let acum = 0
    return [...dadosPorMes].reverse().map(m => { acum+=m.receita; return { ...m, acumulado:acum } })
  })()

  // ── Total geral ───────────────────────────────────────────
  const totais = {
    receita:      dadosPorMes.reduce((s,m)=>s+m.receita,0),
    perdas:       dadosPorMes.reduce((s,m)=>s+m.valorPerdas,0),
    fechados:     dadosPorMes.reduce((s,m)=>s+m.qtdFechados,0),
    perdidos:     dadosPorMes.reduce((s,m)=>s+m.qtdPerdidos,0),
    leads:        dadosPorMes.reduce((s,m)=>s+m.leads,0),
    inad:         dadosPorMes.reduce((s,m)=>s+m.inad,0),
    estornados:   dadosPorMes.reduce((s,m)=>s+m.estornados,0),
  }
  totais.conv = totais.leads>0 ? Math.round((totais.fechados/totais.leads)*100) : 0

  function exportarCSV() {
    const cols = ['Mês','Leads','Fechados','Perdidos','Receita','Valor Perdas','Conversão %','Inadimplentes','Estornados','Acumulado']
    const rows = receitaAcumulada.map(m=>[m.mes,m.leads,m.qtdFechados,m.qtdPerdidos,m.receita.toFixed(2),m.valorPerdas.toFixed(2),m.conv,m.inad,m.estornados,m.acumulado.toFixed(2)])
    const csv  = [cols.join(','), ...rows.map(r=>r.join(','))].join('\n')
    const a    = document.createElement('a')
    a.href     = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv)
    a.download = `hapsis_relatorio_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const maxReceita = Math.max(...dadosPorMes.map(m=>m.receita), 1)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <motion.div style={{width:36,height:36,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429'}}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff'}}>{isGestor?'Relatório Geral':'Meu Relatório'}</h1>
          <p style={{fontSize:13,color:'#4c5070',marginTop:4}}>Faturamento e perdas por mês</p>
        </div>
        <motion.button onClick={exportarCSV} whileHover={{y:-1}} whileTap={{scale:0.97}}
          style={{display:'flex',alignItems:'center',gap:7,padding:'9px 16px',background:'linear-gradient(180deg,rgba(33,163,102,0.16),rgba(33,163,102,0.08))',border:'1px solid rgba(33,163,102,0.28)',borderRadius:10,color:'#21a366',fontWeight:700,fontSize:13,cursor:'pointer'}}>
          📥 Exportar CSV
        </motion.button>
      </div>

      {/* Totais gerais */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
        {[
          {label:'Receita Total',   v:fmt(totais.receita),  cor:'#f0b429'},
          {label:'Valor de Perdas', v:fmt(totais.perdas),   cor:'#ff4d6a'},
          {label:'Fechados',        v:totais.fechados,       cor:'#00c896'},
          {label:'Conversão Geral', v:totais.conv+'%',       cor:'#9d6fff'},
        ].map(s=>(
          <div key={s.label} style={{padding:'16px 18px',borderRadius:12,background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',backdropFilter:'blur(32px)',border:'1px solid #1e2030',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.cor},transparent)`,opacity:0.5}} />
            <p style={{fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.7px',marginBottom:8}}>{s.label}</p>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:s.cor}}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{display:'flex',gap:8,marginBottom:18}}>
        {[['mensal','📅 Por Mês'],['grafico','📊 Gráfico'],['acumulado','📈 Acumulado']].map(([id,label])=>(
          <button key={id} onClick={()=>setAbaAtiva(id)}
            style={{padding:'8px 16px',borderRadius:9,border:'1px solid',
              background:abaAtiva===id?'rgba(240,180,41,0.12)':'transparent',
              borderColor:abaAtiva===id?'rgba(240,180,41,0.36)':'rgba(255,255,255,0.10)',
              color:abaAtiva===id?'#f0b429':'#4c5070',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>

      {/* ABA POR MÊS */}
      {abaAtiva==='mensal'&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{background:'rgba(0,0,0,0.22)'}}>
              <tr>{['Mês','Leads','Fechados','Perdidos','Receita','Perdas','Conversão','Inad.','Estornos'].map(h=>(
                <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {dadosPorMes.map((m,i)=>(
                <motion.tr key={m.key} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
                  style={{borderBottom:'1px solid rgba(30,32,48,0.42)',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 14px',color:'#f0f1ff',fontWeight:600,textTransform:'capitalize'}}>{m.mes}</td>
                  <td style={{padding:'12px 14px',color:'#4d9fff',fontWeight:600}}>{m.leads}</td>
                  <td style={{padding:'12px 14px',color:'#00c896',fontWeight:700}}>{m.qtdFechados}</td>
                  <td style={{padding:'12px 14px',color:'#ff4d6a'}}>{m.qtdPerdidos}</td>
                  <td style={{padding:'12px 14px',color:'#f0b429',fontWeight:700}}>{fmt(m.receita)}</td>
                  <td style={{padding:'12px 14px',color:'#ff4d6a'}}>{m.valorPerdas>0?fmt(m.valorPerdas):'—'}</td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{fontSize:12,fontWeight:700,color:m.conv>=50?'#00c896':m.conv>=30?'#f0b429':'#ff4d6a'}}>{m.conv}%</span>
                  </td>
                  <td style={{padding:'12px 14px',color:m.inad>0?'#ff4d6a':'#4c5070'}}>{m.inad||'—'}</td>
                  <td style={{padding:'12px 14px',color:m.estornados>0?'#ff8c42':'#4c5070'}}>{m.estornados||'—'}</td>
                </motion.tr>
              ))}
              {dadosPorMes.length===0&&<tr><td colSpan={9} style={{padding:'40px',textAlign:'center',color:'#4c5070',fontSize:13}}>Nenhum dado disponível</td></tr>}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* ABA GRÁFICO */}
      {abaAtiva==='grafico'&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{padding:'22px 24px',borderRadius:14,background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030'}}>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'#f0f1ff',marginBottom:20}}>Receita vs Perdas por Mês</h3>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {[...dadosPorMes].reverse().map((m,i)=>(
              <motion.div key={m.key} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:13,color:'#8f94b0',textTransform:'capitalize',minWidth:140}}>{m.mes}</span>
                  <div style={{display:'flex',gap:16,fontSize:12}}>
                    <span style={{color:'#f0b429',fontWeight:700}}>{fmt(m.receita)}</span>
                    {m.valorPerdas>0&&<span style={{color:'#ff4d6a'}}>-{fmt(m.valorPerdas)}</span>}
                    <span style={{color:'#4c5070'}}>{m.conv}%</span>
                  </div>
                </div>
                {/* Barra receita */}
                <div style={{height:10,background:'rgba(0,0,0,0.42)',borderRadius:6,overflow:'hidden',marginBottom:4}}>
                  <motion.div initial={{width:0}} animate={{width:`${(m.receita/maxReceita)*100}%`}}
                    transition={{duration:1,delay:i*0.04,ease:[0.22,1,0.36,1]}}
                    style={{height:'100%',background:'linear-gradient(90deg,#f0b429,#c9960e)',borderRadius:6}} />
                </div>
                {/* Barra perdas */}
                {m.valorPerdas>0&&(
                  <div style={{height:6,background:'rgba(0,0,0,0.42)',borderRadius:6,overflow:'hidden'}}>
                    <motion.div initial={{width:0}} animate={{width:`${(m.valorPerdas/maxReceita)*100}%`}}
                      transition={{duration:1,delay:i*0.04+0.1,ease:[0.22,1,0.36,1]}}
                      style={{height:'100%',background:'linear-gradient(90deg,#ff4d6a,#cc2d4a)',borderRadius:6}} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div style={{display:'flex',gap:20,marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:12,height:12,borderRadius:3,background:'#f0b429'}} />
              <span style={{fontSize:12,color:'#8f94b0'}}>Receita</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:12,height:12,borderRadius:3,background:'#ff4d6a'}} />
              <span style={{fontSize:12,color:'#8f94b0'}}>Perdas</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ABA ACUMULADO */}
      {abaAtiva==='acumulado'&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{background:'rgba(0,0,0,0.22)'}}>
              <tr>{['Mês','Receita do Mês','Receita Acumulada','Crescimento'].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {receitaAcumulada.map((m,i)=>{
                const anterior = receitaAcumulada[i-1]
                const cresc    = anterior&&anterior.receita>0 ? Math.round(((m.receita-anterior.receita)/anterior.receita)*100) : null
                return(
                  <tr key={m.key} style={{borderBottom:'1px solid rgba(30,32,48,0.42)',transition:'background 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'13px 16px',color:'#f0f1ff',fontWeight:600,textTransform:'capitalize'}}>{m.mes}</td>
                    <td style={{padding:'13px 16px',color:'#f0b429',fontWeight:700,fontSize:15}}>{fmt(m.receita)}</td>
                    <td style={{padding:'13px 16px',color:'#00c896',fontWeight:700,fontSize:15}}>{fmt(m.acumulado)}</td>
                    <td style={{padding:'13px 16px'}}>
                      {cresc!==null&&(
                        <span style={{fontSize:13,fontWeight:700,color:cresc>=0?'#00c896':'#ff4d6a'}}>
                          {cresc>=0?'↑':'↓'} {Math.abs(cresc)}%
                        </span>
                      )}
                      {cresc===null&&<span style={{color:'#4c5070',fontSize:12}}>—</span>}
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