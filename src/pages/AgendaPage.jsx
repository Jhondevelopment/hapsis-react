import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const WPP_TEMPLATES = {
  apresentacao: (n,e) => `Olá ${n}! 👋\n\nSou da equipe ${e||'HAPSIS'}. Ficamos felizes com seu contato!\n\nTem um minutinho para conversarmos? 😊`,
  followup:     (n)   => `Oi ${n}! 😊\n\nPassando para ver se você teve chance de analisar nossa proposta.\n\nFico à disposição para tirar dúvidas! 🚀`,
  cobranca:     (n)   => `Olá ${n}!\n\nIdentificamos uma pendência no seu cadastro.\n\nPoderia nos retornar para regularizarmos? 💳`,
}

export function AgendaPage({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [wppLead, setWppLead] = useState(null)
  const [msgCustom, setMsgCustom] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      let q = supabase.from('leads').select('*')
        .not('data_followup','is',null)
        .not('status','in','("Fechados","Perdidos")')
        .order('data_followup', { ascending: true })
      if (perfil?.role === 'vendedor') q = q.eq('user_id', perfil.id)
      const { data } = await q
      setLeads(data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const hoje    = new Date().toISOString().split('T')[0]
  const atrasados = leads.filter(l => l.data_followup < hoje)
  const deHoje    = leads.filter(l => l.data_followup === hoje)
  const futuros   = leads.filter(l => l.data_followup > hoje)

  function enviarWpp(tipo) {
    if (!wppLead) return
    const num = (wppLead.telefone||'').replace(/\D/g,'')
    if (!num) return
    const msg = tipo === 'custom' ? msgCustom : WPP_TEMPLATES[tipo]?.(wppLead.nome?.split(' ')[0], perfil?.nome_empresa) || ''
    if (!msg.trim()) return
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(msg)}`, '_blank')
    setWppLead(null); setMsgCustom('')
  }

  function GrupoLeads({ titulo, leads, tipo }) {
    const cor = tipo==='atrasado'?'#ff4d6a':tipo==='hoje'?'#f0b429':'#4d9fff'
    if (leads.length === 0) return null
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:cor, boxShadow:`0 0 8px ${cor}` }} />
          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:cor }}>{titulo}</h3>
          <span style={{ fontSize:12, color:'#4c5070', background:`${cor}14`, padding:'2px 8px', borderRadius:99, border:`1px solid ${cor}28` }}>{leads.length}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {leads.map((l,i) => (
            <motion.div key={l.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
              style={{ padding:'14px 18px', borderRadius:12,
                background:'linear-gradient(160deg,rgba(16,17,26,0.96),rgba(10,11,18,0.93))',
                backdropFilter:'blur(24px)',
                border:`1px solid ${cor}22`, borderLeft:`3px solid ${cor}`,
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14, color:'#f0f1ff', marginBottom:4 }}>{l.nome}</p>
                <div style={{ display:'flex', gap:12, fontSize:12, color:'#8f94b0' }}>
                  {l.produto && <span>📦 {l.produto}</span>}
                  <span style={{ color: tipo==='atrasado'?'#ff4d6a':tipo==='hoje'?'#f0b429':'#4d9fff', fontWeight:600 }}>
                    📅 {new Date(l.data_followup+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
                    {tipo==='atrasado'&&' ⚠️ Atrasado'}
                    {tipo==='hoje'&&' ⭐ Hoje!'}
                  </span>
                  {l.status && <span style={{ fontSize:11, padding:'1px 7px', borderRadius:99, background:'rgba(255,255,255,0.06)', color:'#8f94b0' }}>{l.status}</span>}
                </div>
              </div>
              {l.telefone && (
                <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                  onClick={() => setWppLead(l)}
                  style={{ padding:'8px 14px', background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.26)', borderRadius:9, color:'#25d366', fontWeight:700, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
                  📱 Chamar
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>Agenda de Follow-ups</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>
          {atrasados.length > 0 && <span style={{ color:'#ff4d6a', fontWeight:600 }}>{atrasados.length} atrasados · </span>}
          {deHoje.length > 0 && <span style={{ color:'#f0b429', fontWeight:600 }}>{deHoje.length} para hoje · </span>}
          {futuros.length} futuros
        </p>
      </div>

      {leads.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300,
          background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
          backdropFilter:'blur(24px)', border:'1px solid #1e2030', borderRadius:16, color:'#323448' }}>
          <span style={{ fontSize:48, marginBottom:12, opacity:0.3 }}>📅</span>
          <p style={{ fontSize:14, fontWeight:600, color:'#4c5070' }}>Agenda livre!</p>
          <p style={{ fontSize:12, color:'#323448', marginTop:4 }}>Nenhum follow-up programado.</p>
        </div>
      ) : (
        <>
          <GrupoLeads titulo="⚠️ Atrasados — Esfriando!" leads={atrasados} tipo="atrasado" />
          <GrupoLeads titulo="⭐ Para Hoje"              leads={deHoje}    tipo="hoje"     />
          <GrupoLeads titulo="📅 Próximos Retornos"      leads={futuros}   tipo="futuro"   />
        </>
      )}

      {/* Modal WhatsApp */}
      <AnimatePresence>
        {wppLead && (
          <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.75)', backdropFilter:'blur(14px)', zIndex:400,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e=>e.target===e.currentTarget&&setWppLead(null)}>
            <motion.div initial={{opacity:0,y:20,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
              transition={{type:'spring',stiffness:320,damping:28}}
              style={{ position:'relative', borderRadius:20, padding:28, width:'100%', maxWidth:420,
                background:'rgba(8,8,14,0.98)', backdropFilter:'blur(52px)',
                border:'1px solid rgba(37,211,102,0.28)', boxShadow:'0 40px 100px rgba(0,0,0,0.80)' }}>
              <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,
                background:'linear-gradient(90deg,transparent,rgba(37,211,102,0.50),transparent)' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'rgba(37,211,102,0.14)',
                    border:'1px solid rgba(37,211,102,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📱</div>
                  <div>
                    <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#f0f1ff', margin:0 }}>{wppLead.nome}</p>
                    <p style={{ fontSize:12, color:'#25d366', margin:0 }}>{wppLead.telefone}</p>
                  </div>
                </div>
                <button onClick={()=>setWppLead(null)} style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:20 }}>×</button>
              </div>

              <p style={{ fontSize:11, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>Templates</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
                {[
                  { tipo:'apresentacao', label:'👋 Apresentação' },
                  { tipo:'followup',     label:'🔄 Follow-up' },
                  { tipo:'cobranca',     label:'💰 Cobrança gentil' },
                ].map(t=>(
                  <motion.button key={t.tipo} whileHover={{x:4}} whileTap={{scale:0.98}}
                    onClick={()=>enviarWpp(t.tipo)}
                    style={{ padding:'10px 14px', background:'rgba(37,211,102,0.05)', border:'1px solid rgba(37,211,102,0.14)',
                      borderRadius:10, cursor:'pointer', textAlign:'left', color:'#25d366', fontSize:13, fontWeight:600, transition:'all 0.15s' }}>
                    {t.label}
                  </motion.button>
                ))}
              </div>

              <p style={{ fontSize:11, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Personalizada</p>
              <textarea value={msgCustom} onChange={e=>setMsgCustom(e.target.value)} rows={3}
                placeholder="Digite sua mensagem..."
                style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:10, padding:'11px 14px', fontSize:13, color:'#f0f1ff',
                  outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:12 }}
                onFocus={e=>e.target.style.borderColor='rgba(37,211,102,0.45)'}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
              <motion.button onClick={()=>enviarWpp('custom')} disabled={!msgCustom.trim()}
                whileHover={{y:-1}} whileTap={{scale:0.98}}
                style={{ width:'100%', padding:'12px',
                  background:msgCustom.trim()?'linear-gradient(180deg,rgba(37,211,102,0.90),rgba(18,168,80,0.85))':'rgba(255,255,255,0.06)',
                  border:`1px solid ${msgCustom.trim()?'rgba(37,211,102,0.50)':'rgba(255,255,255,0.09)'}`,
                  borderRadius:10, color:msgCustom.trim()?'#060709':'#4c5070',
                  fontWeight:700, fontSize:14, cursor:msgCustom.trim()?'pointer':'not-allowed',
                  fontFamily:'Syne,sans-serif', transition:'all 0.2s' }}>
                📱 Enviar
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}