import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TRIMESTRES = ['Q1','Q2','Q3','Q4']
function trimAtual() { const m=new Date().getMonth(); return m<3?'Q1':m<6?'Q2':m<9?'Q3':'Q4' }
function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0}) }

function ModalConfirm({ titulo, mensagem, onConfirmar, onCancelar }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        style={{ padding:28,borderRadius:16,width:'100%',maxWidth:360,background:'rgba(8,8,14,0.99)',backdropFilter:'blur(52px)',border:'1px solid rgba(255,77,106,0.28)' }}>
        <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:17,color:'#f0f1ff',marginBottom:10 }}>{titulo}</h3>
        <p style={{ fontSize:13,color:'#8f94b0',marginBottom:20 }}>{mensagem}</p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancelar} style={{ flex:1,padding:'11px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,cursor:'pointer' }}>Cancelar</button>
          <button onClick={onConfirmar} style={{ flex:1,padding:'11px',background:'rgba(255,77,106,0.20)',border:'1px solid rgba(255,77,106,0.36)',borderRadius:10,color:'#ff4d6a',fontWeight:700,cursor:'pointer' }}>Remover</button>
        </div>
      </motion.div>
    </div>
  )
}

export function OKRsPage({ perfil }) {
  const [okrs,     setOkrs]     = useState([])
  const [trim,     setTrim]     = useState(trimAtual())
  const [modal,    setModal]    = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form,     setForm]     = useState({ objetivo:'', kr:'', trimestre:trimAtual(), meta:'', atual:'' })

  useEffect(() => {
    try { setOkrs(JSON.parse(localStorage.getItem('hapsis_okrs')||'[]')) }
    catch { setOkrs([]) }
  }, [])

  function salvar() {
    if (!form.objetivo.trim()||!form.kr.trim()||!form.meta) return
    const novo = { id:Date.now().toString(), ...form, meta:parseFloat(form.meta), atual:parseFloat(form.atual)||0 }
    const lista = [...okrs, novo]
    setOkrs(lista)
    localStorage.setItem('hapsis_okrs', JSON.stringify(lista))
    setTrim(form.trimestre)
    setModal(false)
    setForm({ objetivo:'', kr:'', trimestre:trimAtual(), meta:'', atual:'' })
  }

  function atualizar(id, val) {
    const num = parseFloat(val)
    if (isNaN(num)) return
    const lista = okrs.map(o=>o.id===id?{...o,atual:num}:o)
    setOkrs(lista)
    localStorage.setItem('hapsis_okrs', JSON.stringify(lista))
  }

  function deletar() {
    const lista = okrs.filter(o=>o.id!==deleting)
    setOkrs(lista)
    localStorage.setItem('hapsis_okrs', JSON.stringify(lista))
    setDeleting(null)
  }

  const filtrados = okrs.filter(o=>o.trimestre===trim)

  return (
    <div>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff' }}>🎯 OKRs</h1>
          <p style={{ fontSize:13,color:'#4c5070',marginTop:4 }}>Objetivos e Resultados-Chave da empresa</p>
        </div>
        <motion.button onClick={()=>setModal(true)} whileHover={{y:-1}} whileTap={{scale:0.97}}
          style={{ padding:'9px 16px',background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))',border:'1px solid rgba(240,180,41,0.28)',borderRadius:10,color:'#f0b429',fontWeight:700,fontSize:13,cursor:'pointer' }}>
          + Novo OKR
        </motion.button>
      </div>

      {/* Seletor de trimestre */}
      <div style={{ display:'flex',gap:8,marginBottom:22 }}>
        {TRIMESTRES.map(t=>(
          <button key={t} onClick={()=>setTrim(t)}
            style={{ padding:'8px 18px',borderRadius:9,border:'1px solid',
              background:trim===t?'rgba(240,180,41,0.12)':'transparent',
              borderColor:trim===t?'rgba(240,180,41,0.36)':'rgba(255,255,255,0.10)',
              color:trim===t?'#f0b429':'#4c5070',cursor:'pointer',fontSize:13,fontWeight:700,transition:'all 0.15s' }}>
            {t} {t===trimAtual()&&<span style={{ fontSize:9,color:'#00c896',marginLeft:4 }}>●</span>}
          </button>
        ))}
      </div>

      {/* Lista OKRs */}
      {filtrados.length === 0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:280,
          background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:16,color:'#323448' }}>
          <span style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>🎯</span>
          <p style={{ fontSize:14,fontWeight:600,color:'#4c5070' }}>Nenhum OKR para {trim}</p>
          <p style={{ fontSize:12,color:'#323448',marginTop:4 }}>Clique em "+ Novo OKR" para começar.</p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {filtrados.map((o,i)=>{
            const pct = o.meta>0 ? Math.min((o.atual/o.meta)*100,100) : 0
            const cor = pct>=80?'#00c896':pct>=50?'#f0b429':'#ff4d6a'
            return (
              <motion.div key={o.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                style={{ padding:'22px 24px',borderRadius:16,
                  background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
                  backdropFilter:'blur(32px)',border:'1px solid #1e2030',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${cor},transparent)`,opacity:0.5 }} />

                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
                  <div>
                    <span style={{ fontSize:11,fontWeight:700,color:'#f0b429',textTransform:'uppercase',letterSpacing:'0.7px',display:'block',marginBottom:6 }}>{o.trimestre} · OBJETIVO</span>
                    <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:18,color:'#f0f1ff' }}>{o.objetivo}</h3>
                  </div>
                  <motion.button onClick={()=>setDeleting(o.id)} whileHover={{color:'#ff4d6a'}}
                    style={{ background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:18,transition:'color 0.15s' }}>×</motion.button>
                </div>

                <div style={{ background:'rgba(0,0,0,0.30)',borderRadius:12,padding:18 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
                    <span style={{ fontSize:12.5,color:'#8f94b0' }}>🎯 {o.kr}</span>
                    <span style={{ fontWeight:700,color:cor,fontSize:13 }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height:8,background:'rgba(0,0,0,0.42)',borderRadius:6,overflow:'hidden',marginBottom:12 }}>
                    <motion.div initial={{width:0}} animate={{width:`${pct}%`}}
                      transition={{duration:1.2,ease:[0.22,1,0.36,1]}}
                      style={{ height:'100%',background:`linear-gradient(90deg,${cor},${cor}aa)`,borderRadius:6 }} />
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:14,fontSize:13 }}>
                    <span>Atual: <strong style={{color:cor}}>{fmt(o.atual)}</strong></span>
                    <span style={{color:'#4c5070'}}>Meta: <strong style={{color:'#f0f1ff'}}>{fmt(o.meta)}</strong></span>
                  </div>
                  <div style={{ display:'flex',gap:8 }}>
                    <input type="number" defaultValue={o.atual} id={`okr-input-${o.id}`} placeholder="Atualizar valor..."
                      style={{ flex:1,padding:'9px 12px',background:'rgba(0,0,0,0.30)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,color:'#f0f1ff',fontSize:13,outline:'none',fontFamily:'inherit' }}
                      onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'}
                      onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                    <motion.button whileHover={{y:-1}} whileTap={{scale:0.97}}
                      onClick={()=>{const el=document.getElementById(`okr-input-${o.id}`);if(el)atualizar(o.id,el.value)}}
                      style={{ padding:'9px 16px',background:'rgba(240,180,41,0.12)',border:'1px solid rgba(240,180,41,0.28)',borderRadius:8,color:'#f0b429',fontWeight:700,fontSize:12,cursor:'pointer' }}>
                      Atualizar
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal novo OKR */}
      <AnimatePresence>
        {modal && (
          <div style={{ position:'fixed',inset:0,background:'rgba(3,3,7,0.75)',backdropFilter:'blur(14px)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div initial={{opacity:0,y:20,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
              transition={{type:'spring',stiffness:320,damping:28}}
              style={{ position:'relative',borderRadius:20,padding:32,width:'100%',maxWidth:440,
                background:'rgba(8,8,14,0.98)',backdropFilter:'blur(52px)',border:'1px solid rgba(240,180,41,0.22)',boxShadow:'0 40px 100px rgba(0,0,0,0.80)' }}>
              <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.50),transparent)' }} />
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:20,color:'#f0f1ff' }}>🎯 Novo OKR</h2>
                <button onClick={()=>setModal(false)} style={{ background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:20 }}>×</button>
              </div>
              {[
                { label:'Objetivo', campo:'objetivo', placeholder:'Ex: Dobrar receita no Q2' },
                { label:'Key Result (KR)', campo:'kr', placeholder:'Ex: Fechar R$ 200.000 em vendas' },
              ].map(f=>(
                <div key={f.campo} style={{ marginBottom:14 }}>
                  <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>{f.label}</label>
                  <input type="text" value={form[f.campo]} onChange={e=>setForm(ff=>({...ff,[f.campo]:e.target.value}))} placeholder={f.placeholder}
                    style={{ width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                </div>
              ))}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20 }}>
                <div>
                  <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>Trimestre</label>
                  <select value={form.trimestre} onChange={e=>setForm(ff=>({...ff,trimestre:e.target.value}))}
                    style={{ width:'100%',background:'#0d1117',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,padding:'11px 12px',fontSize:14,color:'#f0f1ff',outline:'none' }}>
                    {TRIMESTRES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>Meta (R$)</label>
                  <input type="number" value={form.meta} onChange={e=>setForm(ff=>({...ff,meta:e.target.value}))} placeholder="0"
                    style={{ width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 12px',fontSize:14,color:'#f0f1ff',outline:'none' }} />
                </div>
                <div>
                  <label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8 }}>Atual (R$)</label>
                  <input type="number" value={form.atual} onChange={e=>setForm(ff=>({...ff,atual:e.target.value}))} placeholder="0"
                    style={{ width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 12px',fontSize:14,color:'#f0f1ff',outline:'none' }} />
                </div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setModal(false)} style={{ flex:1,padding:'12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,cursor:'pointer' }}>Cancelar</button>
                <motion.button onClick={salvar} whileHover={{y:-1}} whileTap={{scale:0.98}}
                  style={{ flex:2,padding:'12px',background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',border:'1px solid rgba(255,255,255,0.28)',borderRadius:10,color:'#060709',fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif' }}>
                  🎯 Criar OKR
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && <ModalConfirm titulo="Remover OKR?" mensagem="Este objetivo será removido permanentemente." onConfirmar={deletar} onCancelar={()=>setDeleting(null)} />}
      </AnimatePresence>
    </div>
  )
}