import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const CATEGORIAS = ['Abordagem','Objeções','Fechamento','Pós-Venda','Scripts','Dicas']

export function PlaybookPage({ perfil }) {
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('')
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({ titulo:'', descricao:'', categoria:'Abordagem', script:'' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('playbook').select('*').order('created_at', { ascending:false })
      setCards(data || [])
    } catch { setCards([]) }
    finally { setLoading(false) }
  }

  async function salvar() {
    try {
      await supabase.from('playbook').insert([form])
      setModal(false)
      setForm({ titulo:'', descricao:'', categoria:'Abordagem', script:'' })
      carregar()
    } catch (err) { alert(err.message) }
  }

  async function deletar(id) {
    if (!confirm('Deletar este card?')) return
    await supabase.from('playbook').delete().eq('id', id)
    carregar()
  }

  const filtrados = filtro ? cards.filter(c => c.categoria === filtro) : cards
  const catCores  = { Abordagem:'#4d9fff', Objeções:'#ff4d6a', Fechamento:'#00c896', 'Pós-Venda':'#9d6fff', Scripts:'#f0b429', Dicas:'#ff8c42' }

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
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Playbook</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Scripts e técnicas de vendas</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))', border:'1px solid rgba(240,180,41,0.26)', borderRadius:10, color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Novo Card
        </button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <button onClick={() => setFiltro('')}
          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid', background: !filtro?'rgba(240,180,41,0.14)':'transparent', borderColor: !filtro?'rgba(240,180,41,0.40)':'rgba(255,255,255,0.10)', color: !filtro?'#f0b429':'#4c5070', cursor:'pointer', fontSize:12, fontWeight:600 }}>
          Todos
        </button>
        {CATEGORIAS.map(c => (
          <button key={c} onClick={() => setFiltro(c)}
            style={{ padding:'6px 14px', borderRadius:8, border:'1px solid', background: filtro===c?`${catCores[c]}22`:'transparent', borderColor: filtro===c?`${catCores[c]}66`:'rgba(255,255,255,0.10)', color: filtro===c?catCores[c]:'#4c5070', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
        {filtrados.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
            style={{ padding:20, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderTop:`2px solid ${catCores[c.categoria]||'#f0b429'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:12, background:`${catCores[c.categoria]||'#f0b429'}22`, color:catCores[c.categoria]||'#f0b429' }}>{c.categoria}</span>
                <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#fff', marginTop:8 }}>{c.titulo}</h3>
              </div>
              <button onClick={() => deletar(c.id)} style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:16, flexShrink:0 }}>×</button>
            </div>
            {c.descricao && <p style={{ fontSize:13, color:'#8f94b0', lineHeight:1.6, marginBottom:10 }}>{c.descricao}</p>}
            {c.script && (
              <div style={{ background:'rgba(0,0,0,0.30)', borderRadius:8, padding:12, fontSize:12, color:'#8f94b0', lineHeight:1.6, borderLeft:`2px solid ${catCores[c.categoria]||'#f0b429'}` }}>
                {c.script}
              </div>
            )}
          </motion.div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'#323448' }}>
            <span style={{ fontSize:40, marginBottom:10, opacity:0.35 }}>📖</span>
            <p style={{ fontSize:13 }}>Nenhum card encontrado</p>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.62)', backdropFilter:'blur(12px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target===e.currentTarget && setModal(false)}>
          <motion.div initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
            style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto', background:'linear-gradient(160deg,rgba(12,13,22,0.98),rgba(8,8,14,0.96))', backdropFilter:'blur(52px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 32px 84px rgba(0,0,0,0.68)' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.40),transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>📖 Novo Card</h2>
              <button onClick={() => setModal(false)} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14 }}>×</button>
            </div>
            {[
              { label:'Título',     campo:'titulo',    placeholder:'Ex: Como contornar objeção de preço' },
              { label:'Descrição',  campo:'descricao', placeholder:'Breve descrição...' },
            ].map(f => (
              <div key={f.campo} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                <input type="text" value={form[f.campo]} onChange={e => setForm(f2 => ({ ...f2, [f.campo]:e.target.value }))} placeholder={f.placeholder}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria:e.target.value }))}
                style={{ width:'100%', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Script</label>
              <textarea value={form.script} onChange={e => setForm(f => ({ ...f, script:e.target.value }))} rows={4} placeholder="Cole o script aqui..."
                style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit', resize:'vertical' }} />
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