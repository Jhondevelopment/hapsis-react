import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }

function PodioCard({ vendedor, pos, delay=0 }) {
  const configs = {
    1: { emoji:'🥇', cor:'#f0b429', altura:130, label:'1º Lugar', glow:'rgba(240,180,41,0.35)' },
    2: { emoji:'🥈', cor:'#9d9dbd', altura:90,  label:'2º Lugar', glow:'rgba(157,157,189,0.25)' },
    3: { emoji:'🥉', cor:'#c87941', altura:70,  label:'3º Lugar', glow:'rgba(200,121,65,0.25)' },
  }
  const cfg = configs[pos]
  return (
    <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, type:'spring', stiffness:200, damping:20 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      {/* Avatar */}
      <motion.div
        animate={pos===1 ? { boxShadow:[`0 0 20px ${cfg.glow}`,`0 0 40px ${cfg.glow}`,`0 0 20px ${cfg.glow}`] } : {}}
        transition={{ duration:2, repeat:Infinity }}
        style={{ width:64, height:64, borderRadius:'50%',
          background:`linear-gradient(135deg,${cfg.cor}22,${cfg.cor}44)`,
          border:`2px solid ${cfg.cor}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:cfg.cor }}>
        {vendedor.full_name?.[0]?.toUpperCase()||'V'}
      </motion.div>
      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:24 }}>{cfg.emoji}</span>
        <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#f0f1ff', margin:'4px 0 2px' }}>{vendedor.full_name||'—'}</p>
        <p style={{ fontSize:12, color:cfg.cor, fontWeight:700 }}>{fmt(vendedor.receita)}</p>
        <p style={{ fontSize:11, color:'#4c5070' }}>{vendedor.qtd} vendas</p>
      </div>
      {/* Base do pódio */}
      <motion.div initial={{ height:0 }} animate={{ height:cfg.altura }}
        transition={{ delay:delay+0.3, duration:0.8, ease:[0.22,1,0.36,1] }}
        style={{ width:80, background:`linear-gradient(180deg,${cfg.cor}22,${cfg.cor}08)`,
          border:`1px solid ${cfg.cor}33`, borderRadius:'6px 6px 0 0',
          display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:10 }}>
        <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:cfg.cor }}>{pos}º</span>
      </motion.div>
    </motion.div>
  )
}

export function ArenaPage({ perfil }) {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const [{ data: leads }, { data: perfis }] = await Promise.all([
        supabase.from('leads').select('user_id,valor,status,aprovado,estornado'),
        supabase.from('profiles').select('id,full_name,role,equipe'),
      ])

      const vendedores = (perfis||[]).filter(p => ['vendedor','sdr','gestor_sub','gestor_geral'].includes(p.role))
      const rank = vendedores.map(v => {
        const fech   = (leads||[]).filter(l => l.user_id===v.id && l.status==='Fechados' && l.aprovado===true && !l.estornado)
        const receita = fech.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
        return { ...v, receita, qtd:fech.length }
      }).sort((a,b) => b.receita - a.receita)

      setRanking(rank)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const top3  = ranking.slice(0, 3)
  const resto = ranking.slice(3)
  const corVend = ['#f0b429','#4d9fff','#9d6fff','#00c896','#ff8c42']

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>🏆 Arena de Vendas</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Ranking de desempenho da equipe</p>
      </div>

      {ranking.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, color:'#323448' }}>
          <span style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>🏆</span>
          <p style={{ fontSize:14, color:'#4c5070' }}>Nenhum vendedor com vendas fechadas ainda.</p>
        </div>
      ) : (
        <>
          {/* Pódio */}
          {top3.length >= 1 && (
            <div style={{ padding:'30px 20px 0', marginBottom:28,
              background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
              backdropFilter:'blur(32px)', border:'1px solid #1e2030',
              borderRadius:16, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
                background:'linear-gradient(90deg,transparent,#f0b429,transparent)', opacity:0.5 }} />
              <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:20, paddingBottom:0 }}>
                {top3[1] && <PodioCard vendedor={top3[1]} pos={2} delay={0.15} />}
                {top3[0] && <PodioCard vendedor={top3[0]} pos={1} delay={0} />}
                {top3[2] && <PodioCard vendedor={top3[2]} pos={3} delay={0.30} />}
              </div>
            </div>
          )}

          {/* Resto do ranking */}
          {resto.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {resto.map((v, i) => (
                <motion.div key={v.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay:i*0.05 }}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                    background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
                    backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:12 }}>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#4c5070', width:32, textAlign:'center' }}>{i+4}º</span>
                  <div style={{ width:40, height:40, borderRadius:'50%',
                    background:`${corVend[i%5]}18`, border:`1px solid ${corVend[i%5]}30`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:corVend[i%5] }}>
                    {v.full_name?.[0]?.toUpperCase()||'V'}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:700, fontSize:14, color:'#f0f1ff', margin:0 }}>{v.full_name||'—'}</p>
                    <p style={{ fontSize:12, color:'#4c5070', margin:0 }}>{v.equipe||'Geral'} · {v.qtd} vendas</p>
                  </div>
                  <span style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#f0b429' }}>
                    {fmt(v.receita)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}