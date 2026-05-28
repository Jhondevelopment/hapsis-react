import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Modal de confirmação interno ─────────────────────────────
function ModalConfirm({ titulo, mensagem, corBotao='#ff4d6a', labelBotao='Confirmar', onConfirmar, onCancelar }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.80)', backdropFilter:'blur(16px)', zIndex:500,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{ opacity:0, y:16, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
        transition={{ type:'spring', stiffness:320, damping:28 }}
        style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:400,
          background:'rgba(8,8,14,0.99)', backdropFilter:'blur(52px)',
          border:`1px solid ${corBotao}33`,
          boxShadow:`0 40px 100px rgba(0,0,0,0.80), 0 0 0 1px ${corBotao}11` }}>
        <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1,
          background:`linear-gradient(90deg,transparent,${corBotao}55,transparent)` }} />
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:`${corBotao}14`,
            border:`1px solid ${corBotao}30`, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:26, margin:'0 auto 16px' }}>
            ⚠️
          </div>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:19, color:'#f0f1ff', marginBottom:10 }}>{titulo}</h3>
          <p style={{ fontSize:13.5, color:'#8f94b0', lineHeight:1.65 }}>{mensagem}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <motion.button onClick={onCancelar} whileHover={{ background:'rgba(255,255,255,0.10)' }} whileTap={{ scale:0.97 }}
            style={{ flex:1, padding:'13px', background:'rgba(255,255,255,0.06)',
              border:'1px solid rgba(255,255,255,0.10)', borderRadius:10,
              color:'#8f94b0', fontWeight:600, fontSize:14, cursor:'pointer', transition:'background 0.2s' }}>
            Cancelar
          </motion.button>
          <motion.button onClick={onConfirmar} whileHover={{ filter:'brightness(1.10)' }} whileTap={{ scale:0.97 }}
            style={{ flex:2, padding:'13px',
              background:`linear-gradient(160deg,${corBotao}dd,${corBotao}aa)`,
              border:'1px solid rgba(255,255,255,0.20)', borderRadius:10,
              color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'Syne,sans-serif' }}>
            {labelBotao}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export function AprovacoesPage({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('pendentes')
  const [stats,   setStats]   = useState({ pendentes:0, aprovados:0, estornados:0, valPendente:0, valAprovado:0 })
  const [confirm, setConfirm] = useState(null) // { tipo, leadId }

  useEffect(() => { carregar() }, [filtro])
  useEffect(() => {
    carregarStats()
    const ch = supabase.channel('aprov-rt-v3')
      .on('postgres_changes', { event:'*', schema:'public', table:'leads' }, () => { carregar(); carregarStats() })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function carregarStats() {
    const { data } = await supabase.from('leads').select('aprovado,estornado,valor').eq('status','Fechados')
    if (!data) return
    setStats({
      pendentes:   data.filter(l=>(l.aprovado===false||l.aprovado===null)&&!l.estornado).length,
      aprovados:   data.filter(l=>l.aprovado===true&&!l.estornado).length,
      estornados:  data.filter(l=>l.estornado===true).length,
      valPendente: data.filter(l=>(l.aprovado===false||l.aprovado===null)&&!l.estornado).reduce((s,l)=>s+(parseFloat(l.valor)||0),0),
      valAprovado: data.filter(l=>l.aprovado===true&&!l.estornado).reduce((s,l)=>s+(parseFloat(l.valor)||0),0),
    })
  }

  async function carregar() {
    setLoading(true)
    try {
      let q = supabase.from('leads').select('*').eq('status','Fechados')
      if      (filtro==='pendentes')  q = q.or('aprovado.eq.false,aprovado.is.null').eq('estornado',false)
      else if (filtro==='aprovados')  q = q.eq('aprovado',true).eq('estornado',false)
      else if (filtro==='estornados') q = q.eq('estornado',true)
      const { data, error } = await q.order('created_at',{ascending:false})
      if (error) throw error
      const userIds = [...new Set((data||[]).map(l=>l.user_id).filter(Boolean))]
      let nomes = {}
      if (userIds.length > 0) {
        const { data: perfis } = await supabase.from('profiles').select('id,full_name').in('id',userIds)
        ;(perfis||[]).forEach(p => { nomes[p.id] = p.full_name })
      }
      setLeads((data||[]).map(l => ({ ...l, vendedor_nome: nomes[l.user_id]||'—' })))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function executarAcao() {
    if (!confirm) return
    const { tipo, leadId } = confirm
    const lead = leads.find(l => l.id === leadId)
    const hist = [...(lead?.historico||[])]
    setConfirm(null)

    if (tipo === 'aprovar') {
      hist.push({ data:new Date().toISOString(), msg:`✅ Aprovado por ${perfil?.full_name}` })
      await supabase.from('leads').update({ aprovado:true, historico:hist }).eq('id',leadId)
    } else if (tipo === 'rejeitar') {
      hist.push({ data:new Date().toISOString(), msg:`❌ Rejeitado por ${perfil?.full_name}` })
      await supabase.from('leads').update({ status:'Perdidos', aprovado:false, historico:hist }).eq('id',leadId)
    } else if (tipo === 'estornar') {
      hist.push({ data:new Date().toISOString(), msg:`↩️ Estornado por ${perfil?.full_name}` })
      await supabase.from('leads').update({ estornado:true, aprovado:false, historico:hist }).eq('id',leadId)
    }
    carregar(); carregarStats()
  }

  const abas = [
    { id:'pendentes',  label:'⏳ Pendentes',  n:stats.pendentes,  val:stats.valPendente, cor:'#ff8c42' },
    { id:'aprovados',  label:'✅ Aprovados',  n:stats.aprovados,  val:stats.valAprovado, cor:'#00c896' },
    { id:'estornados', label:'↩️ Estornados', n:stats.estornados, val:0,                 cor:'#ff4d6a' },
  ]

  const confirmConfigs = {
    aprovar:  { titulo:'Aprovar esta venda?',    mensagem:'A venda entrará no caixa e o vendedor será notificado.',           corBotao:'#00c896', labelBotao:'✓ Aprovar' },
    rejeitar: { titulo:'Rejeitar esta venda?',   mensagem:'A venda voltará para Perdidos. Esta ação não pode ser desfeita.',   corBotao:'#ff4d6a', labelBotao:'✕ Rejeitar' },
    estornar: { titulo:'Estornar esta venda?',   mensagem:'A venda será removida do caixa. Esta ação é irreversível.',         corBotao:'#ff8c42', labelBotao:'↩️ Confirmar Estorno' },
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>Aprovações</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Gestão de vendas fechadas da equipe</p>
      </div>

      {/* Stats clicáveis */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:22 }}>
        {abas.map(s=>(
          <motion.div key={s.id} whileHover={{y:-2}} onClick={()=>setFiltro(s.id)}
            style={{ padding:18, borderRadius:14, cursor:'pointer',
              background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
              backdropFilter:'blur(32px)',
              border:filtro===s.id?`1px solid ${s.cor}44`:'1px solid #1e2030',
              position:'relative', overflow:'hidden', transition:'all 0.2s' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,
              background:`linear-gradient(90deg,transparent,${s.cor},transparent)`,
              opacity:filtro===s.id?0.7:0.35 }} />
            <p style={{ fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.7px',marginBottom:8 }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:700,color:s.cor }}>
              {s.n}
              {s.n>0&&s.id==='pendentes'&&<motion.span animate={{opacity:[1,0.4,1]}} transition={{duration:1.5,repeat:Infinity}} style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:s.cor,marginLeft:8,verticalAlign:'middle'}} />}
            </p>
            {s.val>0&&<p style={{ fontSize:12,color:'#4c5070',marginTop:4 }}>{s.val.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}</p>}
          </motion.div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:200 }}>
          <motion.div style={{ width:32,height:32,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429' }}
            animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
        </div>
      ) : leads.length === 0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:260,
          background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
          backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:16,color:'#323448' }}>
          <span style={{ fontSize:48,marginBottom:12,opacity:0.3 }}>{filtro==='pendentes'?'⏳':filtro==='aprovados'?'✅':'↩️'}</span>
          <p style={{ fontSize:14,fontWeight:600,color:'#4c5070' }}>
            {filtro==='pendentes'?'Nenhuma venda aguardando':filtro==='aprovados'?'Nenhuma aprovada ainda':'Nenhum estorno registrado'}
          </p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <AnimatePresence>
            {leads.map((lead,i) => {
              const corBorda = filtro==='pendentes'?'#ff8c42':filtro==='aprovados'?'#00c896':'#ff4d6a'
              return (
                <motion.div key={lead.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-20}}
                  transition={{delay:i*0.04,type:'spring',stiffness:300,damping:28}}
                  style={{ padding:'18px 20px',borderRadius:14,
                    background:'linear-gradient(160deg,rgba(16,17,26,0.96),rgba(10,11,18,0.93))',
                    backdropFilter:'blur(28px)',border:`1px solid ${corBorda}33`,borderLeft:`3px solid ${corBorda}`,
                    position:'relative',overflow:'hidden' }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${corBorda}22,transparent)` }} />
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:14 }}>
                    <div style={{ flex:1 }}>
                      {/* Cliente */}
                      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap' }}>
                        <div style={{ width:42,height:42,borderRadius:'50%',background:`${corBorda}18`,border:`1px solid ${corBorda}30`,
                          display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:16,color:corBorda,flexShrink:0 }}>
                          {lead.nome?.[0]?.toUpperCase()||'?'}
                        </div>
                        <div>
                          <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:16,color:'#f0f1ff',margin:0 }}>{lead.nome}</h3>
                          {lead.telefone&&<p style={{ fontSize:12,color:'#4c5070',margin:0,marginTop:2 }}>📞 {lead.telefone}</p>}
                        </div>
                        {parseFloat(lead.valor)>0&&(
                          <span style={{ fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'#00c896',marginLeft:'auto' }}>
                            R$ {parseFloat(lead.valor).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                      {/* Vendedor */}
                      <div style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'5px 12px',
                        background:'rgba(157,111,255,0.08)',border:'1px solid rgba(157,111,255,0.18)',borderRadius:8,marginBottom:10 }}>
                        <div style={{ width:20,height:20,borderRadius:'50%',background:'rgba(157,111,255,0.20)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#9d6fff' }}>
                          {(lead.vendedor_nome||'?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize:12,color:'#9d6fff',fontWeight:600 }}>Vendedor: {lead.vendedor_nome}</span>
                      </div>
                      {/* Detalhes */}
                      <div style={{ display:'flex',gap:14,fontSize:12.5,color:'#8f94b0',flexWrap:'wrap',marginBottom:10 }}>
                        {lead.produto&&<span>📦 {lead.produto}</span>}
                        {lead.forma_pagamento&&<span>💳 {lead.forma_pagamento}</span>}
                        {lead.origem_lead&&<span>📍 {lead.origem_lead}</span>}
                      </div>
                      {lead.observacoes&&<p style={{ fontSize:12,color:'#4c5070',fontStyle:'italic',marginBottom:10 }}>💬 {lead.observacoes}</p>}
                      {/* Documentos */}
                      {(lead.comprovante_url||lead.contrato_url||lead.doc_importante_url)&&(
                        <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:8 }}>
                          {lead.comprovante_url&&<a href={lead.comprovante_url} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(0,200,150,0.10)',border:'1px solid rgba(0,200,150,0.22)',borderRadius:7,color:'#00c896',fontSize:12,fontWeight:600,textDecoration:'none' }}>💳 Comprovante</a>}
                          {lead.contrato_url&&<a href={lead.contrato_url} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(77,159,255,0.10)',border:'1px solid rgba(77,159,255,0.22)',borderRadius:7,color:'#4d9fff',fontSize:12,fontWeight:600,textDecoration:'none' }}>📄 Contrato</a>}
                          {lead.doc_importante_url&&<a href={lead.doc_importante_url} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'6px 12px',background:'rgba(157,111,255,0.10)',border:'1px solid rgba(157,111,255,0.22)',borderRadius:7,color:'#9d6fff',fontSize:12,fontWeight:600,textDecoration:'none' }}>📎 Documento</a>}
                        </div>
                      )}
                      {filtro==='pendentes'&&!lead.comprovante_url&&!lead.contrato_url&&(
                        <div style={{ padding:'7px 12px',borderRadius:8,background:'rgba(240,180,41,0.06)',border:'1px solid rgba(240,180,41,0.18)',marginBottom:8 }}>
                          <p style={{ fontSize:11.5,color:'#f0b429',margin:0 }}>⚠️ Nenhum documento anexado ainda</p>
                        </div>
                      )}
                      <p style={{ fontSize:11,color:'#323448' }}>
                        {lead.created_at?new Date(lead.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):''}
                      </p>
                    </div>
                    {/* Botões */}
                    <div style={{ display:'flex',flexDirection:'column',gap:8,flexShrink:0,minWidth:120 }}>
                      {filtro==='pendentes'&&(
                        <>
                          <motion.button onClick={()=>setConfirm({tipo:'aprovar',leadId:lead.id})}
                            whileHover={{y:-1,scale:1.02}} whileTap={{scale:0.97}}
                            style={{ padding:'10px 0',width:'100%',background:'linear-gradient(180deg,rgba(0,200,150,0.20),rgba(0,200,150,0.10))',border:'1px solid rgba(0,200,150,0.32)',borderRadius:9,color:'#00c896',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'Syne,sans-serif',transition:'all 0.15s' }}>
                            ✓ Aprovar
                          </motion.button>
                          <motion.button onClick={()=>setConfirm({tipo:'rejeitar',leadId:lead.id})}
                            whileHover={{y:-1}} whileTap={{scale:0.97}}
                            style={{ padding:'10px 0',width:'100%',background:'rgba(255,77,106,0.10)',border:'1px solid rgba(255,77,106,0.26)',borderRadius:9,color:'#ff4d6a',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.15s' }}>
                            ✕ Rejeitar
                          </motion.button>
                        </>
                      )}
                      {filtro==='aprovados'&&(
                        <motion.button onClick={()=>setConfirm({tipo:'estornar',leadId:lead.id})}
                          whileHover={{y:-1}} whileTap={{scale:0.97}}
                          style={{ padding:'10px 0',width:'100%',background:'rgba(255,140,66,0.10)',border:'1px solid rgba(255,140,66,0.26)',borderRadius:9,color:'#ff8c42',fontWeight:700,fontSize:13,cursor:'pointer',transition:'all 0.15s' }}>
                          ↩️ Estornar
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de confirmação interno */}
      <AnimatePresence>
        {confirm && (
          <ModalConfirm
            {...confirmConfigs[confirm.tipo]}
            onConfirmar={executarAcao}
            onCancelar={()=>setConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}