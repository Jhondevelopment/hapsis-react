import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { StatCard } from '../components/ui/StatCard'

export function DespesasPage({ perfil }) {
  const [despesas, setDespesas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ descricao:'', valor:'', vencimento:'', categoria:'Fixo' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('despesas').select('*').order('vencimento', { ascending:true })
      setDespesas(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function salvar() {
    try {
      await supabase.from('despesas').insert([{ ...form, pago: false }])
      setModal(false)
      setForm({ descricao:'', valor:'', vencimento:'', categoria:'Fixo' })
      carregar()
    } catch (err) { alert(err.message) }
  }

  async function quitar(id) {
    await supabase.from('despesas').update({ pago: true }).eq('id', id)
    carregar()
  }

  async function deletar(id) {
    if (!confirm('Deletar esta despesa?')) return
    await supabase.from('despesas').delete().eq('id', id)
    carregar()
  }

  const totalPendente = despesas.filter(d => !d.pago).reduce((s,d) => s+(parseFloat(d.valor)||0), 0)
  const totalPago     = despesas.filter(d =>  d.pago).reduce((s,d) => s+(parseFloat(d.valor)||0), 0)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Contas a Pagar</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>{despesas.filter(d=>!d.pago).length} pendentes</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))', border:'1px solid rgba(240,180,41,0.26)', borderRadius:10, color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Nova Despesa
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Pendente" value={totalPendente.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="red"     />
        <StatCard label="Pago"     value={totalPago.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}     color="green"   />
        <StatCard label="Total"    value={despesas.length} color="default" />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {despesas.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
            style={{ padding:16, borderRadius:12, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:`1px solid ${d.pago ? '#1e2030' : 'rgba(255,77,106,0.22)'}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <p style={{ fontWeight:700, fontSize:14, color:'#f0f1ff' }}>{d.descricao}</p>
              <div style={{ display:'flex', gap:12, fontSize:12, color:'#8f94b0', marginTop:3 }}>
                {d.categoria  && <span>🏷️ {d.categoria}</span>}
                {d.vencimento && <span>📅 {new Date(d.vencimento).toLocaleDateString('pt-BR')}</span>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <span style={{ fontSize:15, fontWeight:700, color: d.pago ? '#00c896' : '#ff4d6a' }}>
                R$ {parseFloat(d.valor||0).toLocaleString('pt-BR')}
              </span>
              {!d.pago && (
                <button onClick={() => quitar(d.id)}
                  style={{ padding:'6px 12px', background:'rgba(0,200,150,0.14)', border:'1px solid rgba(0,200,150,0.28)', borderRadius:7, color:'#00c896', fontWeight:700, fontSize:11, cursor:'pointer' }}>
                  ✓ Quitar
                </button>
              )}
              <button onClick={() => deletar(d.id)}
                style={{ width:28, height:28, background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.22)', borderRadius:7, color:'#ff4d6a', cursor:'pointer', fontSize:13 }}>
                ×
              </button>
            </div>
          </motion.div>
        ))}
        {despesas.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'#323448' }}>
            <span style={{ fontSize:40, marginBottom:10, opacity:0.35 }}>🧾</span>
            <p style={{ fontSize:13 }}>Nenhuma despesa cadastrada</p>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.62)', backdropFilter:'blur(12px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target===e.currentTarget && setModal(false)}>
          <motion.div initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
            style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:420, background:'linear-gradient(160deg,rgba(12,13,22,0.98),rgba(8,8,14,0.96))', backdropFilter:'blur(52px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 32px 84px rgba(0,0,0,0.68)' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.40),transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>🧾 Nova Despesa</h2>
              <button onClick={() => setModal(false)} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14 }}>×</button>
            </div>
            {[
              { label:'Descrição', campo:'descricao', type:'text',   placeholder:'Ex: Aluguel' },
              { label:'Valor (R$)', campo:'valor',    type:'number', placeholder:'0,00' },
              { label:'Vencimento', campo:'vencimento', type:'date' },
            ].map(f => (
              <div key={f.campo} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                <input type={f.type} value={form[f.campo]} onChange={e => setForm(f2 => ({ ...f2, [f.campo]:e.target.value }))} placeholder={f.placeholder}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria:e.target.value }))}
                style={{ width:'100%', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }}>
                {['Fixo','Variável','Imposto','Marketing','Pessoal','Outro'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, color:'#8f94b0', fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvar} style={{ flex:2, padding:'12px', background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))', border:'1px solid rgba(255,255,255,0.28)', borderRadius:10, color:'#060709', fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>Salvar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}