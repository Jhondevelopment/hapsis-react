import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function AvisosPage({ perfil }) {
  const [avisos,  setAvisos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState({ titulo:'', mensagem:'', tipo:'info' })
  const [salvando,setSalvando]= useState(false)

  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    const ch = supabase.channel('avisos-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'avisos'},carregar)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('avisos').select('*, profiles(full_name)').order('created_at',{ascending:false})
      setAvisos(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.mensagem.trim()) return
    setSalvando(true)
    try {
      await supabase.from('avisos').insert([{ ...form, autor_id: perfil.id }])
      setModal(false); setForm({ titulo:'', mensagem:'', tipo:'info' }); carregar()
    } catch (e) { alert(e.message) }
    finally { setSalvando(false) }
  }

  async function deletar(id) {
    if (!confirm('Apagar este aviso?')) return
    await supabase.from('avisos').delete().eq('id', id)
    carregar()
  }

  const tipoCor  = { info:'#4d9fff', alerta:'#f0b429', urgente:'#ff4d6a', sucesso:'#00c896' }
  const tipoIcon = { info:'ℹ️', alerta:'⚠️', urgente:'🚨', sucesso:'🎉' }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>Central de Avisos</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Comunicados da diretoria para a equipe</p>
        </div>
        {isGestor && (
          <motion.button onClick={() => setModal(true)} whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px',
              background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))',
              border:'1px solid rgba(240,180,41,0.26)', borderRadius:10,
              color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            📢 Novo Aviso
          </motion.button>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <motion.div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
            animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
        </div>
      ) : avisos.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:280,
          background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
          backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:16, color:'#323448' }}>
          <span style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>📭</span>
          <p style={{ fontSize:14, fontWeight:600, color:'#4c5070' }}>Nenhum aviso por enquanto</p>
          <p style={{ fontSize:12, color:'#323448', marginTop:6 }}>A diretoria está quieta hoje.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <AnimatePresence>
            {avisos.map((a, i) => {
              const cor  = tipoCor[a.tipo||'info']
              const icon = tipoIcon[a.tipo||'info']
              return (
                <motion.div key={a.id}
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-20 }}
                  transition={{ delay:i*0.04, type:'spring', stiffness:300, damping:28 }}
                  style={{ padding:'18px 20px', borderRadius:14,
                    background:'linear-gradient(160deg,rgba(16,17,26,0.96),rgba(10,11,18,0.93))',
                    backdropFilter:'blur(28px)',
                    border:`1px solid ${cor}33`,
                    borderLeft:`3px solid ${cor}`,
                    position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
                    background:`linear-gradient(90deg,transparent,${cor}22,transparent)` }} />

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:22 }}>{icon}</span>
                        <div>
                          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'#f0f1ff', margin:0 }}>
                            {a.titulo}
                          </h3>
                          <div style={{ display:'flex', gap:10, marginTop:3 }}>
                            <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                              background:`${cor}18`, color:cor }}>
                              {(a.tipo||'info').toUpperCase()}
                            </span>
                            {a.profiles?.full_name && (
                              <span style={{ fontSize:11, color:'#4c5070' }}>por {a.profiles.full_name}</span>
                            )}
                            <span style={{ fontSize:11, color:'#4c5070' }}>
                              {new Date(a.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize:14, color:'#8f94b0', lineHeight:1.7, marginLeft:32 }}>{a.mensagem}</p>
                    </div>
                    {isGestor && (
                      <motion.button onClick={() => deletar(a.id)} whileHover={{ color:'#ff4d6a' }} whileTap={{ scale:0.95 }}
                        style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:18, flexShrink:0 }}>
                        ×
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal criar aviso */}
      <AnimatePresence>
        {modal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.75)', backdropFilter:'blur(14px)', zIndex:400,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
              transition={{ type:'spring', stiffness:300, damping:28 }}
              style={{ position:'relative', borderRadius:20, padding:32, width:'100%', maxWidth:460,
                background:'rgba(8,8,14,0.98)', backdropFilter:'blur(52px)',
                border:'1px solid rgba(240,180,41,0.22)',
                boxShadow:'0 40px 100px rgba(0,0,0,0.80)' }}>
              <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1,
                background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.50),transparent)' }} />

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20, color:'#f0f1ff' }}>📢 Novo Aviso</h2>
                <button onClick={()=>setModal(false)}
                  style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)',
                    border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Tipo</label>
                <div style={{ display:'flex', gap:8 }}>
                  {Object.entries(tipoIcon).map(([t,icon]) => (
                    <button key={t} onClick={() => setForm(f=>({...f,tipo:t}))}
                      style={{ flex:1, padding:'8px', borderRadius:9,
                        background: form.tipo===t ? `${tipoCor[t]}18` : 'rgba(255,255,255,0.04)',
                        border:`1px solid ${form.tipo===t ? `${tipoCor[t]}44` : 'rgba(255,255,255,0.08)'}`,
                        color: form.tipo===t ? tipoCor[t] : '#4c5070',
                        cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s' }}>
                      {icon} {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Título</label>
                <input type="text" value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}
                  placeholder="Ex: Reunião de equipe amanhã"
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:10, padding:'12px 16px', fontSize:14, color:'#f0f1ff', outline:'none', fontFamily:'inherit' }}
                  onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'}
                  onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
              </div>

              <div style={{ marginBottom:24 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Mensagem</label>
                <textarea value={form.mensagem} onChange={e=>setForm(f=>({...f,mensagem:e.target.value}))} rows={4}
                  placeholder="Escreva o comunicado para a equipe..."
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:10, padding:'12px 16px', fontSize:14, color:'#f0f1ff', outline:'none', fontFamily:'inherit', resize:'vertical' }} />
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setModal(false)}
                  style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, color:'#8f94b0', fontWeight:600, cursor:'pointer' }}>
                  Cancelar
                </button>
                <motion.button onClick={salvar} disabled={salvando||!form.titulo.trim()||!form.mensagem.trim()}
                  whileHover={{ y:-1 }} whileTap={{ scale:0.98 }}
                  style={{ flex:2, padding:'12px',
                    background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',
                    border:'1px solid rgba(255,255,255,0.28)', borderRadius:10,
                    color:'#060709', fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif',
                    opacity: salvando||!form.titulo.trim()||!form.mensagem.trim() ? 0.6 : 1 }}>
                  {salvando ? 'Disparando...' : '📢 Disparar Aviso'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}