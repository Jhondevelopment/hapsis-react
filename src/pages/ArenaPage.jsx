import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function ArenaPage({ perfil }) {
  const [vendedores, setVendedores] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { carregarArena() }, [])

  async function carregarArena() {
    try {
      const { data: profiles } = await supabase.from('profiles').select('*').in('role', ['vendedor','gestor_sub','gestor_geral'])
      const { data: leads }    = await supabase.from('leads').select('user_id, status, valor, aprovado, estornado').eq('status', 'Fechados')

      const ranking = (profiles || []).map(p => {
        const leadsP  = (leads || []).filter(l => l.user_id === p.id && l.aprovado && !l.estornado)
        const receita = leadsP.reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
        return { ...p, fechados: leadsP.length, receita }
      }).sort((a, b) => b.receita - a.receita)

      setVendedores(ranking)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  const top3  = vendedores.slice(0, 3)
  const resto = vendedores.slice(3)
  const podios   = [top3[1], top3[0], top3[2]].filter(Boolean)
  const cores    = ['#c0c0c0', '#ffd700', '#cd7f32']
  const alturas  = [130, 170, 100]

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Arena de Vendas</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Ranking em tempo real da equipe</p>
      </div>

      {/* Pódio */}
      <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:16, margin:'48px 0 32px', minHeight:280 }}>
        {podios.map((v, i) => {
          const posReal = vendedores.indexOf(v) + 1
          const cor     = cores[i]
          const h       = alturas[i]
          return (
            <motion.div key={v.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', width:180, paddingTop:48 }}>
              {posReal === 1 && (
                <motion.div animate={{ y:[0,-8,0] }} transition={{ duration:2.8, repeat:Infinity }}
                  style={{ fontSize:30, color:'#ffd700', filter:'drop-shadow(0 0 12px rgba(255,215,0,0.7))', marginBottom:-10 }}>
                  👑
                </motion.div>
              )}
              <div style={{ width:posReal===1?76:60, height:posReal===1?76:60, borderRadius:'50%', border:`2px solid ${cor}`, display:'grid', placeItems:'center', fontFamily:'Syne,sans-serif', fontSize:posReal===1?28:22, fontWeight:'bold', color:cor, marginBottom:-20, zIndex:3, boxShadow:`0 0 30px ${cor}50`, background:'rgba(18,20,30,0.8)' }}>
                {v.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', padding:`28px 14px 16px`, borderRadius:'12px 12px 0 0', background:`linear-gradient(180deg,${cor}22,${cor}05), rgba(18,20,30,0.62)`, border:`1px solid ${cor}44`, borderBottom:'none', minHeight:h, textAlign:'center' }}>
                <h4 style={{ fontSize:14, color:'#fff', marginBottom:4 }}>{v.full_name}</h4>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{v.role}</span>
                <strong style={{ fontSize:16, fontFamily:'Syne,sans-serif', color:cor, marginTop:8, display:'block' }}>
                  R$ {v.receita.toLocaleString('pt-BR')}
                </strong>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:3 }}>{v.fechados} fechados</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Resto do ranking */}
      {resto.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:14 }}>
          {resto.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
              style={{ padding:18, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#f0b429', fontSize:16, fontFamily:'Syne,sans-serif', flexShrink:0 }}>
                {v.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#f0f1ff' }}>{v.full_name}</p>
                <p style={{ fontSize:12, color:'#4c5070', marginTop:2 }}>{v.fechados} fechados</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#00c896' }}>R$ {v.receita.toLocaleString('pt-BR')}</p>
                <p style={{ fontSize:11, color:'#4c5070', marginTop:2 }}>#{vendedores.indexOf(v)+1}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}