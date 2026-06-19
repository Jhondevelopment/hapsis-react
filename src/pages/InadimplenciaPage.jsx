import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function ModalConfirm({ titulo, mensagem, corBotao='#ff4d6a', labelBotao='Confirmar', onConfirmar, onCancelar }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:500,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <motion.div initial={{opacity:0,y:16,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
        transition={{type:'spring',stiffness:320,damping:28}}
        style={{ position:'relative',borderRadius:18,padding:32,width:'100%',maxWidth:400,
          background:'rgba(8,8,14,0.99)',backdropFilter:'blur(52px)',
          border:`1px solid ${corBotao}33`,boxShadow:`0 40px 100px rgba(0,0,0,0.80)` }}>
        <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,
          background:`linear-gradient(90deg,transparent,${corBotao}55,transparent)` }} />
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <div style={{ width:56,height:56,borderRadius:'50%',background:`${corBotao}14`,border:`1px solid ${corBotao}30`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 16px' }}>⚠️</div>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:19,color:'#f0f1ff',marginBottom:10 }}>{titulo}</h3>
          <p style={{ fontSize:13.5,color:'#8f94b0',lineHeight:1.65 }}>{mensagem}</p>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <motion.button onClick={onCancelar} whileHover={{background:'rgba(255,255,255,0.10)'}} whileTap={{scale:0.97}}
            style={{ flex:1,padding:'13px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,fontSize:14,cursor:'pointer',transition:'background 0.2s' }}>
            Cancelar
          </motion.button>
          <motion.button onClick={onConfirmar} whileHover={{filter:'brightness(1.10)'}} whileTap={{scale:0.97}}
            style={{ flex:2,padding:'13px',background:`linear-gradient(160deg,${corBotao}dd,${corBotao}aa)`,
              border:'1px solid rgba(255,255,255,0.20)',borderRadius:10,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Syne,sans-serif' }}>
            {labelBotao}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export function InadimplenciaPage({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('inadimplente')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { carregar() }, [filtro])

  async function carregar() {
    try {
      let q = supabase.from('leads').select('*').eq('status','Fechados').order('created_at',{ascending:false})
      if (filtro==='inadimplente') q = q.eq('is_inadimplente',true).eq('estornado',false)
      if (filtro==='estornado')    q = q.eq('estornado',true)
      const { data } = await q

      const userIds = [...new Set((data||[]).map(l=>l.user_id).filter(Boolean))]
      let nomes = {}
      if (userIds.length>0) {
        const { data: p } = await supabase.from('profiles').select('id,full_name').in('id',userIds)
        ;(p||[]).forEach(pp => { nomes[pp.id]=pp.full_name })
      }
      setLeads((data||[]).map(l=>({...l, vendedor_nome:nomes[l.user_id]||'—'})))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function executarAcao() {
    if (!confirm) return
    const { tipo, leadId } = confirm
    const lead = leads.find(l=>l.id===leadId)
    const hist = [...(lead?.historico||[])]
    setConfirm(null)

    if (tipo==='quitar') {
      hist.push({ data:new Date().toISOString(), msg:`✅ Inadimplência quitada por ${perfil?.full_name}` })
      await supabase.from('leads').update({ is_inadimplente:false, historico:hist }).eq('id',leadId)
    } else if (tipo==='estornar') {
      hist.push({ data:new Date().toISOString(), msg:`↩️ Estornado por ${perfil?.full_name}` })
      await supabase.from('leads').update({ estornado:true, aprovado:false, historico:hist }).eq('id',leadId)
    } else if (tipo==='reativar') {
      hist.push({ data:new Date().toISOString(), msg:`🔄 Reativado por ${perfil?.full_name}` })
      await supabase.from('leads').update({ estornado:false, aprovado:true, historico:hist }).eq('id',leadId)
    }
    carregar()
  }

  const confirmConfigs = {
    quitar:   { titulo:'Marcar como quitado?',    mensagem:'O cliente será removido da lista de inadimplentes.', corBotao:'#00c896', labelBotao:'✓ Confirmar Quitação' },
    estornar: { titulo:'Estornar esta venda?',     mensagem:'A venda será removida do caixa. Irreversível.',       corBotao:'#ff8c42', labelBotao:'↩️ Confirmar Estorno' },
    reativar: { titulo:'Reativar esta venda?',     mensagem:'A venda voltará para aprovada no caixa.',             corBotao:'#4d9fff', labelBotao:'🔄 Reativar' },
  }

  const totalInad    = leads.filter(l=>!l.estornado&&l.is_inadimplente).reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const totalEstorn  = leads.filter(l=>l.estornado).reduce((s,l)=>s+(parseFloat(l.valor)||0),0)

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff' }}>Inadimplência & Estornos</h1>
        <p style={{ fontSize:13,color:'#4c5070',marginTop:4 }}>Controle de clientes com problemas financeiros</p>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex',gap:8,marginBottom:20 }}>
        {[['inadimplente','⚠️ Inadimplentes'],['estornado','↩️ Estornados']].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltro(v)}
            style={{ padding:'9px 18px',borderRadius:9,border:'1px solid',
              background:filtro===v?'rgba(255,77,106,0.12)':'transparent',
              borderColor:filtro===v?'rgba(255,77,106,0.36)':'rgba(255,255,255,0.10)',
              color:filtro===v?'#ff4d6a':'#4c5070',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s' }}>
            {l}
          </button>
        ))}
        <span style={{ fontSize:13,color:'#4c5070',alignSelf:'center',marginLeft:8 }}>
          {leads.length} registros · {filtro==='inadimplente'
            ? totalInad.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
            : totalEstorn.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} em risco
        </span>
      </div>

      {loading ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:200 }}>
          <motion.div style={{ width:32,height:32,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429' }}
            animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
        </div>
      ) : leads.length===0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:280,color:'#323448',
          background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:16 }}>
          <span style={{ fontSize:48,marginBottom:12,opacity:0.35 }}>🎉</span>
          <p style={{ fontSize:14,fontWeight:600,color:'#4c5070' }}>Nenhum registro encontrado</p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {leads.map((lead,i)=>{
            const cor = filtro==='inadimplente'?'#ff4d6a':'#ff8c42'
            return(
              <motion.div key={lead.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                style={{ padding:20,borderRadius:14,
                  background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
                  backdropFilter:'blur(24px)',border:`1px solid ${cor}28`,borderLeft:`3px solid ${cor}`,
                  position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${cor}22,transparent)` }} />
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8,flexWrap:'wrap' }}>
                      <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:16,color:'#f0f1ff' }}>{lead.nome}</h3>
                      <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,background:`${cor}18`,color:cor }}>
                        {filtro==='inadimplente'?'⚠️ INADIMPLENTE':'↩️ ESTORNADO'}
                      </span>
                    </div>
                    <div style={{ display:'flex',gap:14,fontSize:12.5,color:'#8f94b0',flexWrap:'wrap',marginBottom:6 }}>
                      {lead.produto&&<span>📦 {lead.produto}</span>}
                      {lead.telefone&&<span>📞 {lead.telefone}</span>}
                      {lead.vendedor_nome&&<span>👤 {lead.vendedor_nome}</span>}
                      <span style={{ color:cor,fontWeight:700,fontSize:14 }}>
                        💰 R$ {parseFloat(lead.valor||0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {lead.observacoes&&<p style={{ fontSize:12,color:'#4c5070',marginTop:4 }}>{lead.observacoes}</p>}
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:8,flexShrink:0 }}>
                    {filtro==='inadimplente'&&(
                      <>
                        <motion.button onClick={()=>setConfirm({tipo:'quitar',leadId:lead.id})}
                          whileHover={{y:-1}} whileTap={{scale:0.97}}
                          style={{ padding:'8px 16px',background:'rgba(0,200,150,0.14)',border:'1px solid rgba(0,200,150,0.28)',borderRadius:8,color:'#00c896',fontWeight:700,fontSize:12,cursor:'pointer' }}>
                          ✓ Quitar
                        </motion.button>
                        <motion.button onClick={()=>setConfirm({tipo:'estornar',leadId:lead.id})}
                          whileHover={{y:-1}} whileTap={{scale:0.97}}
                          style={{ padding:'8px 16px',background:'rgba(255,140,66,0.12)',border:'1px solid rgba(255,140,66,0.26)',borderRadius:8,color:'#ff8c42',fontWeight:700,fontSize:12,cursor:'pointer' }}>
                          ↩️ Estornar
                        </motion.button>
                      </>
                    )}
                    {filtro==='estornado'&&(
                      <motion.button onClick={()=>setConfirm({tipo:'reativar',leadId:lead.id})}
                        whileHover={{y:-1}} whileTap={{scale:0.97}}
                        style={{ padding:'8px 16px',background:'rgba(77,159,255,0.12)',border:'1px solid rgba(77,159,255,0.26)',borderRadius:8,color:'#4d9fff',fontWeight:700,fontSize:12,cursor:'pointer' }}>
                        🔄 Reativar
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {confirm&&(
          <ModalConfirm {...confirmConfigs[confirm.tipo]} onConfirmar={executarAcao} onCancelar={()=>setConfirm(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}