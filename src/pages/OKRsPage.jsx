import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function OKRsPage({ perfil }) {
  const [okrs,    setOkrs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({ objetivo:'', resultado:'', meta:100, atual:0, trimestre:'Q1 2026' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('okrs').select('*').order('created_at', { ascending:false })
      setOkrs(data || [])
    } catch { setOkrs([]) }
    finally { setLoading(false) }
  }

  async function salvar() {
    try {
      await supabase.from('okrs').insert([form])
      setModal(false)
      setForm({ objetivo:'', resultado:'', meta:100, atual:0, trimestre:'Q1 2026' })
      carregar()
    } catch (err) { alert(err.message) }
  }

  async function atualizar(id, novoAtual) {
    await supabase.from('okrs').update({ atual: novoAtual }).eq('id', id)
    carregar()
  }

  async function deletar(id) {
    if (!confirm('Deletar este OKR?')) return
    await supabase.from('okrs').delete().eq('id', id)
    carregar()
  }

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
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>OKRs</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Objetivos e resultados-chave</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))', border:'1px solid rgba(240,180,41,0.26)', borderRadius:10, color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Novo OKR
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {okrs.map((okr, i) => {
          const pct = okr.meta > 0 ? Math.min((okr.atual / okr.meta) * 100, 100) : 0
          const cor = pct >= 80 ? '#00c896' : pct >= 50 ? '#f0b429' : '#ff4d6a'
          return (
            <motion.div key={okr.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
              style={{ padding:20, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:1.5, background:`linear-gradient(90deg,transparent,${cor},transparent)`, opacity:0.42 }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:12, background:'rgba(157,111,255,0.14)', color:'#9d6fff' }}>{okr.trimestre}</span>
                  </div>
                  <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff', marginBottom:4 }}>{okr.objetivo}</h3>
                  {okr.resultado && <p style={{ fontSize:13, color:'#8f94b0' }}>{okr.resultado}</p>}
                </div>
                <button onClick={() => deletar(okr.id)}
                  style={{ width:28, height:28, background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.22)', borderRadius:7, color:'#ff4d6a', cursor:'pointer', fontSize:13, flexShrink:0, marginLeft:12 }}>×</button>
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'#8f94b0' }}>Progresso</span>
                  <span style={{ fontSize:12, fontWeight:700, color:cor }}>{Math.round(pct)}% ({okr.atual}/{okr.meta})</span>
                </div>
                <div style={{ height:8, background:'rgba(0,0,0,0.42)', borderRadius:6, overflow:'hidden' }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:1 }}
                    style={{ height:'100%', background:cor, borderRadius:6 }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#4c5070' }}>Atualizar:</span>
                <input type="number" defaultValue={okr.atual}
                  onBlur={e => atualizar(okr.id, parseInt(e.target.value)||0)}
                  style={{ width:80, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'5px 10px', fontSize:13, color:'#fff', outline:'none' }} />
              </div>
            </motion.div>
          )
        })}
        {okrs.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'#323448' }}>
            <span style={{ fontSize:40, marginBottom:10, opacity:0.35 }}>🎯</span>
            <p style={{ fontSize:13 }}>Nenhum OKR cadastrado</p>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.62)', backdropFilter:'blur(12px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target===e.currentTarget && setModal(false)}>
          <motion.div initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
            style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:460, background:'linear-gradient(160deg,rgba(12,13,22,0.98),rgba(8,8,14,0.96))', backdropFilter:'blur(52px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 32px 84px rgba(0,0,0,0.68)' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:'linear-gradient(90deg,transparent,rgba(157,111,255,0.40),transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>🎯 Novo OKR</h2>
              <button onClick={() => setModal(false)} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14 }}>×</button>
            </div>
            {[
              { label:'Objetivo',        campo:'objetivo',  placeholder:'Ex: Dobrar receita mensal' },
              { label:'Resultado-chave', campo:'resultado', placeholder:'Ex: Fechar 30 contratos' },
            ].map(f => (
              <div key={f.campo} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                <input type="text" value={form[f.campo]} onChange={e => setForm(f2 => ({ ...f2, [f.campo]:e.target.value }))} placeholder={f.placeholder}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Meta</label>
                <input type="number" value={form.meta} onChange={e => setForm(f => ({ ...f, meta:parseInt(e.target.value)||0 }))}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Trimestre</label>
                <select value={form.trimestre} onChange={e => setForm(f => ({ ...f, trimestre:e.target.value }))}
                  style={{ width:'100%', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }}>
                  {['Q1 2026','Q2 2026','Q3 2026','Q4 2026'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setModal(false)} style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, color:'#8f94b0', fontWeight:600, cursor:'pointer' }}>Cancelar</button>
              <button onClick={salvar} style={{ flex:2, padding:'12px', background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))', border:'1px solid rgba(255,255,255,0.28)', borderRadius:10, color:'#060709', fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>Criar OKR</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}