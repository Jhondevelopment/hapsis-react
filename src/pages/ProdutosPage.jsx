import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function ProdutosPage({ perfil }) {
  const [produtos, setProdutos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editando, setEditando] = useState(null)
  const [form,     setForm]     = useState({ nome:'', descricao:'', preco:'', taxa_comissao:5 })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('produtos').select('*').order('nome')
      setProdutos(data || [])
    } catch { setProdutos([]) }
    finally { setLoading(false) }
  }

  async function salvar() {
    try {
      if (editando) await supabase.from('produtos').update(form).eq('id', editando)
      else          await supabase.from('produtos').insert([form])
      setModal(false); setEditando(null)
      setForm({ nome:'', descricao:'', preco:'', taxa_comissao:5 })
      carregar()
    } catch (err) { alert(err.message) }
  }

  async function deletar(id) {
    if (!confirm('Deletar este produto?')) return
    await supabase.from('produtos').delete().eq('id', id)
    carregar()
  }

  function editar(p) {
    setEditando(p.id)
    setForm({ nome:p.nome, descricao:p.descricao||'', preco:p.preco||'', taxa_comissao:p.taxa_comissao||5 })
    setModal(true)
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
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Produtos & Regras</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>{produtos.length} produtos cadastrados</p>
        </div>
        <button onClick={() => { setEditando(null); setForm({ nome:'', descricao:'', preco:'', taxa_comissao:5 }); setModal(true) }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))', border:'1px solid rgba(240,180,41,0.26)', borderRadius:10, color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          + Novo Produto
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {produtos.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
            style={{ padding:20, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1.5, background:'linear-gradient(90deg,transparent,#f0b429,transparent)', opacity:0.42 }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>📦</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => editar(p)}
                  style={{ padding:'5px 10px', background:'rgba(77,159,255,0.14)', border:'1px solid rgba(77,159,255,0.28)', borderRadius:7, color:'#4d9fff', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                  Editar
                </button>
                <button onClick={() => deletar(p.id)}
                  style={{ padding:'5px 10px', background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.22)', borderRadius:7, color:'#ff4d6a', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                  ×
                </button>
              </div>
            </div>
            <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#fff', marginBottom:6 }}>{p.nome}</h3>
            {p.descricao && <p style={{ fontSize:12, color:'#8f94b0', marginBottom:10, lineHeight:1.5 }}>{p.descricao}</p>}
            <div style={{ display:'flex', gap:16, fontSize:13 }}>
              {p.preco && <span style={{ color:'#00c896', fontWeight:700 }}>R$ {parseFloat(p.preco).toLocaleString('pt-BR')}</span>}
              <span style={{ color:'#f0b429' }}>💸 {p.taxa_comissao}% comissão</span>
            </div>
          </motion.div>
        ))}
        {produtos.length === 0 && (
          <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'#323448' }}>
            <span style={{ fontSize:40, marginBottom:10, opacity:0.35 }}>📦</span>
            <p style={{ fontSize:13 }}>Nenhum produto cadastrado</p>
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
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>{editando ? '✏️ Editar Produto' : '📦 Novo Produto'}</h2>
              <button onClick={() => setModal(false)} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14 }}>×</button>
            </div>
            {[
              { label:'Nome',        campo:'nome',      placeholder:'Ex: Plano Premium' },
              { label:'Descrição',   campo:'descricao', placeholder:'Descrição do produto...' },
              { label:'Preço (R$)',  campo:'preco',     placeholder:'0,00' },
            ].map(f => (
              <div key={f.campo} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                <input type="text" value={form[f.campo]} onChange={e => setForm(f2 => ({ ...f2, [f.campo]:e.target.value }))} placeholder={f.placeholder}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Taxa de Comissão (%)</label>
              <input type="number" value={form.taxa_comissao} onChange={e => setForm(f => ({ ...f, taxa_comissao:parseFloat(e.target.value)||0 }))}
                style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }} />
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