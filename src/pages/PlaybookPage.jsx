import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CATS = ['todos','abertura','objecoes','fechamento','followup','upsell']
const CAT_CORES = {
  abertura:   { bg:'rgba(77,159,255,0.10)',  cor:'#4d9fff',  border:'rgba(77,159,255,0.24)' },
  objecoes:   { bg:'rgba(255,77,106,0.10)', cor:'#ff4d6a', border:'rgba(255,77,106,0.24)' },
  fechamento: { bg:'rgba(0,200,150,0.10)',  cor:'#00c896',  border:'rgba(0,200,150,0.24)' },
  followup:   { bg:'rgba(240,180,41,0.10)', cor:'#f0b429',  border:'rgba(240,180,41,0.24)' },
  upsell:     { bg:'rgba(157,111,255,0.10)',cor:'#9d6fff',  border:'rgba(157,111,255,0.24)' },
}

export function PlaybookPage({ perfil }) {
  const [scripts,  setScripts]  = useState([])
  const [catAtiva, setCatAtiva] = useState('todos')
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ titulo:'', categoria:'abertura', conteudo:'' })
  const [copiado,  setCopiado]  = useState(null)

  useEffect(() => {
    try { setScripts(JSON.parse(localStorage.getItem('hapsis_playbook')||'[]')) }
    catch { setScripts([]) }
  }, [])

  function salvar() {
    if (!form.titulo.trim()||!form.conteudo.trim()) return
    const novo = { id:Date.now().toString(), ...form, autor: perfil?.full_name||'Gestor' }
    const lista = [...scripts, novo]
    setScripts(lista)
    localStorage.setItem('hapsis_playbook', JSON.stringify(lista))
    setCatAtiva(form.categoria)
    setModal(false)
    setForm({ titulo:'', categoria:'abertura', conteudo:'' })
  }

  function deletar(id) {
    const lista = scripts.filter(s=>s.id!==id)
    setScripts(lista)
    localStorage.setItem('hapsis_playbook', JSON.stringify(lista))
  }

  function copiar(id) {
    const s = scripts.find(x=>x.id===id)
    if (!s) return
    navigator.clipboard.writeText(s.conteudo)
    setCopiado(id)
    setTimeout(()=>setCopiado(null),2000)
  }

  const filtrados = catAtiva==='todos' ? scripts : scripts.filter(s=>s.categoria===catAtiva)

  return (
    <div>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff' }}>📖 Playbook de Vendas</h1>
          <p style={{ fontSize:13,color:'#4c5070',marginTop:4 }}>Scripts e roteiros da equipe</p>
        </div>
        <motion.button onClick={()=>setModal(true)} whileHover={{y:-1}} whileTap={{scale:0.97}}
          style={{ padding:'9px 16px',background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))',border:'1px solid rgba(240,180,41,0.28)',borderRadius:10,color:'#f0b429',fontWeight:700,fontSize:13,cursor:'pointer' }}>
          + Novo Script
        </motion.button>
      </div>

      {/* Filtro categorias */}
      <div style={{ display:'flex',gap:8,marginBottom:22,flexWrap:'wrap' }}>
        {CATS.map(cat=>(
          <button key={cat} onClick={()=>setCatAtiva(cat)}
            style={{ padding:'7px 16px',borderRadius:9,border:'1px solid',
              background:catAtiva===cat?(CAT_CORES[cat]?.bg||'rgba(240,180,41,0.12)'):'transparent',
              borderColor:catAtiva===cat?(CAT_CORES[cat]?.border||'rgba(240,180,41,0.36)'):'rgba(255,255,255,0.10)',
              color:catAtiva===cat?(CAT_CORES[cat]?.cor||'#f0b429'):'#4c5070',
              cursor:'pointer',fontSize:12.5,fontWeight:600,textTransform:'capitalize',transition:'all 0.15s' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de scripts */}
      {filtrados.length === 0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:280,
          background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:16,color:'#323448' }}>
          <span style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>📖</span>
          <p style={{ fontSize:14,fontWeight:600,color:'#4c5070' }}>Nenhum script nesta categoria</p>
        </div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14 }}>
          {filtrados.map((s,i)=>{
            const c = CAT_CORES[s.categoria]||CAT_CORES.fechamento
            return (
              <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                style={{ borderRadius:14,overflow:'hidden',
                  background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
                  backdropFilter:'blur(32px)',border:'1px solid #1e2030',
                  display:'flex',flexDirection:'column' }}>
                {/* Header */}
                <div style={{ padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <div>
                    <span style={{ display:'inline-block',marginBottom:6,fontSize:10.5,fontWeight:700,padding:'2px 10px',borderRadius:99,background:c.bg,color:c.cor,border:`1px solid ${c.border}`,textTransform:'uppercase',letterSpacing:'0.5px' }}>
                      {s.categoria}
                    </span>
                    <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'#f0f1ff',margin:0 }}>{s.titulo}</h3>
                  </div>
                  <motion.button onClick={()=>deletar(s.id)} whileHover={{color:'#ff4d6a'}}
                    style={{ background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:18,flexShrink:0,marginLeft:10,transition:'color 0.15s' }}>×</motion.button>
                </div>
                {/* Conteúdo */}
                <div style={{ padding:'14px 18px',fontSize:13,color:'#8f94b0',lineHeight:1.7,flex:1,maxHeight:180,overflowY:'auto',whiteSpace:'pre-wrap' }}>
                  {s.conteudo}
                </div>
                {/* Footer */}
                <div style={{ padding:'10px 18px',borderTop:'1px solid rgba(255,255,255,0.04)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span style={{ fontSize:11,color:'#4c5070' }}>Por {s.autor||'Gestor'}</span>
                  <motion.button onClick={()=>copiar(s.id)} whileHover={{y:-1}}
                    style={{ padding:'5px 12px',background:copiado===s.id?'rgba(0,200,150,0.14)':'rgba(255,255,255,0.05)',
                      border:`1px solid ${copiado===s.id?'rgba(0,200,150,0.28)':'rgba(255,255,255,0.09)'}`,
                      borderRadius:7,color:copiado===s.id?'#00c896':'#8f94b0',fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.2s' }}>
                    {copiado===s.id?'✓ Copiado':'📋 Copiar'}
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position:'fixed',inset:0,background:'rgba(3,3,7,0.75)',backdropFilter:'blur(14px)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div initial={{opacity:0,y:20,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
              transition={{type:'spring',stiffness:320,damping:28}}
              style={{ position:'relative',borderRadius:20,padding:32,width:'100%',maxWidth:500,
                background:'rgba(8,8,14,0.98)',backdropFilter:'blur(52px)',border:'1px solid rgba(240,180,41,0.22)',boxShadow:'0 40px 100px rgba(0,0,0,0.80)' }}>
              <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.50),transparent)' }} />
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:20,color:'#f0f1ff' }}>📖 Novo Script</h2>
                <button onClick={()=>setModal(false)} style={{ background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:20 }}>×</button>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>Título</label>
                <input type="text" value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ex: Contorno de objeção de preço"
                  style={{ width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit' }}
                  onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>Categoria</label>
                <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}
                  style={{ width:'100%',background:'#0d1117',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none' }}>
                  {CATS.filter(c=>c!=='todos').map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>Conteúdo do Script</label>
                <textarea value={form.conteudo} onChange={e=>setForm(f=>({...f,conteudo:e.target.value}))} rows={6}
                  placeholder="Escreva o roteiro ou script de vendas aqui..."
                  style={{ width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit',resize:'vertical' }} />
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setModal(false)} style={{ flex:1,padding:'12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,cursor:'pointer' }}>Cancelar</button>
                <motion.button onClick={salvar} whileHover={{y:-1}} whileTap={{scale:0.98}}
                  style={{ flex:2,padding:'12px',background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',border:'1px solid rgba(255,255,255,0.28)',borderRadius:10,color:'#060709',fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif' }}>
                  📖 Salvar Script
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}