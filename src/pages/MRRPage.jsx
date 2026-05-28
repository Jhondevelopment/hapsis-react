import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/ui/StatCard'

export function MRRPage({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('leads').select('*').eq('status','Fechados').eq('aprovado', true).eq('estornado', false)
      setLeads(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const meses = {}
  leads.forEach(l => {
    const d   = l.created_at ? new Date(l.created_at) : new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!meses[key]) meses[key] = { receita:0, count:0 }
    meses[key].receita += parseFloat(l.valor||0)
    meses[key].count++
  })

  const mesesOrdenados = Object.entries(meses).sort((a,b) => a[0].localeCompare(b[0])).slice(-6)
  const mrr            = mesesOrdenados.length > 0 ? mesesOrdenados[mesesOrdenados.length-1][1].receita : 0
  const arr            = mrr * 12
  const totalClientes  = leads.length

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>MRR</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Monthly Recurring Revenue</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="MRR Atual"      value={mrr.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="green"   />
        <StatCard label="ARR Projetado"  value={arr.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="blue"    />
        <StatCard label="Total Clientes" value={totalClientes} color="default" />
      </div>

      <div style={{ padding:20, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1.5, background:'linear-gradient(90deg,transparent,#00c896,transparent)', opacity:0.42 }} />
        <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff', marginBottom:20 }}>📈 Receita por Mês</h3>
        {mesesOrdenados.length === 0 ? (
          <p style={{ color:'#4c5070', fontSize:13 }}>Nenhum dado disponível ainda.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {mesesOrdenados.map(([mes, dados]) => {
              const maxVal  = Math.max(...mesesOrdenados.map(m => m[1].receita))
              const pct     = maxVal > 0 ? (dados.receita / maxVal) * 100 : 0
              const [ano, m] = mes.split('-')
              const nomeMes  = new Date(parseInt(ano), parseInt(m)-1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' })
              return (
                <div key={mes}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'#8f94b0', textTransform:'capitalize' }}>{nomeMes}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'#00c896' }}>{dados.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}</span>
                  </div>
                  <div style={{ height:8, background:'rgba(0,0,0,0.42)', borderRadius:6, overflow:'hidden' }}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:1, delay:0.3 }}
                      style={{ height:'100%', background:'linear-gradient(90deg,#00c896,#4d9fff)', borderRadius:6 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}