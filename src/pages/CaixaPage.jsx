import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/ui/StatCard'

export function CaixaPage({ perfil }) {
  const [pagamentos, setPagamentos] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { carregarPagamentos() }, [])

  async function carregarPagamentos() {
    try {
      let q = supabase.from('pagamentos_comissao').select('*, profiles(full_name)').order('created_at', { ascending:false })
      if (perfil?.role === 'vendedor') q = q.eq('user_id', perfil.id)
      const { data } = await q
      setPagamentos(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const totalPago     = pagamentos.filter(p => p.pago).reduce((s,p) => s+(parseFloat(p.valor)||0), 0)
  const totalPendente = pagamentos.filter(p => !p.pago).reduce((s,p) => s+(parseFloat(p.valor)||0), 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Caixa & Comissões</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Controle financeiro de comissões</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total Pago"        value={totalPago.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}     color="green"   />
        <StatCard label="Pendente"          value={totalPendente.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}  color="orange"  />
        <StatCard label="Total Lançamentos" value={pagamentos.length}                                                                                 color="default" />
      </div>

      <div style={{ background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:14, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead style={{ background:'rgba(0,0,0,0.22)' }}>
            <tr>
              {['Vendedor','Valor','Status','Data'].map(h => (
                <th key={h} style={{ padding:'13px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagamentos.length === 0 ? (
              <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#323448', fontSize:13 }}>Nenhum lançamento encontrado</td></tr>
            ) : pagamentos.map(p => (
              <tr key={p.id} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)' }}>
                <td style={{ padding:'13px 16px', color:'#f0f1ff', fontWeight:600 }}>{p.profiles?.full_name || '—'}</td>
                <td style={{ padding:'13px 16px', color:'#00c896', fontWeight:700 }}>R$ {parseFloat(p.valor||0).toLocaleString('pt-BR')}</td>
                <td style={{ padding:'13px 16px' }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:12, background: p.pago?'rgba(0,200,150,0.12)':'rgba(255,140,66,0.12)', color: p.pago?'#00c896':'#ff8c42' }}>
                    {p.pago ? '✓ Pago' : '⏳ Pendente'}
                  </span>
                </td>
                <td style={{ padding:'13px 16px', color:'#8f94b0' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}