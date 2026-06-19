import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const ETAPAS = [
  { id:'onboarding',     label:'🤝 Onboarding',    cor:'#4d9fff', desc:'Novos clientes' },
  { id:'acompanhamento', label:'📊 Acompanhamento', cor:'#f0b429', desc:'Em uso ativo' },
  { id:'upsell',         label:'🚀 Upsell',         cor:'#00c896', desc:'Prontos para upgrade' },
]

function PosVendaCard({ lead, onMover }) {
  const cor = ETAPAS.find(e=>e.id===(lead.etapa_pos_venda||'onboarding'))?.cor || '#4d9fff'
  return (
    <motion.div layout
      initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}}
      whileHover={{y:-2}}
      draggable
      onDragStart={e=>{e.dataTransfer.setData('leadId',lead.id);e.dataTransfer.effectAllowed='move'}}
      style={{ borderRadius:12, padding:14, cursor:'grab', marginBottom:8, userSelect:'none',
        background:'rgba(20,21,32,0.70)', backdropFilter:'blur(16px)',
        border:'1px solid rgba(255,255,255,0.06)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute',left:0,top:0,bottom:0,width:3,background:cor,borderRadius:'12px 0 0 12px' }} />
      <p style={{ fontWeight:700, fontSize:13.5, color:'#f0f1ff', marginBottom:8 }}>{lead.nome}</p>
      <div style={{ display:'flex', flexDirection:'column', gap:3, fontSize:11.5, color:'#4c5070' }}>
        {lead.produto && <span>📦 {lead.produto}</span>}
        {parseFloat(lead.valor)>0 && <span style={{color:'#00c896',fontWeight:700}}>💰 R$ {parseFloat(lead.valor).toLocaleString('pt-BR')}</span>}
        {lead.is_recorrente && <span style={{color:'#9d6fff'}}>📈 Recorrente</span>}
      </div>
    </motion.div>
  )
}

function Coluna({ etapa, leads, onMover }) {
  const [dragOver, setDragOver] = useState(false)
  const over  = useCallback(e=>{e.preventDefault();setDragOver(true)},[])
  const leave = useCallback(e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)},[])
  const drop  = useCallback(e=>{e.preventDefault();setDragOver(false);const id=e.dataTransfer.getData('leadId');if(id)onMover(id,etapa.id)},[etapa.id,onMover])

  return (
    <motion.div onDragOver={over} onDragLeave={leave} onDrop={drop}
      animate={{ borderColor:dragOver?`${etapa.cor}66`:'#1e2030' }}
      style={{ borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'calc(100vh-200px)',
        background:'linear-gradient(180deg,rgba(16,17,26,0.95),rgba(10,11,18,0.92))', backdropFilter:'blur(24px)',
        border:'1px solid #1e2030', transition:'border-color 0.15s' }}>
      <div style={{ padding:'13px 15px', borderBottom:'1px solid rgba(255,255,255,0.04)',
        background:dragOver?`${etapa.cor}08`:'rgba(0,0,0,0.18)', transition:'background 0.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:2 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:etapa.cor, boxShadow:`0 0 8px ${etapa.cor}` }} />
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, flex:1, color:'#f0f1ff' }}>{etapa.label}</span>
          <span style={{ background:'rgba(0,0,0,0.38)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:18, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#8f94b0' }}>{leads.length}</span>
        </div>
        <p style={{ fontSize:11, color:'#4c5070', marginLeft:18 }}>{etapa.desc}</p>
      </div>
      <div style={{ padding:8, flex:1, overflowY:'auto', minHeight:100 }}>
        <AnimatePresence>
          {leads.map(l=><PosVendaCard key={l.id} lead={l} onMover={onMover} />)}
        </AnimatePresence>
        {leads.length===0&&(
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'28px 12px', color:'#323448', textAlign:'center' }}>
            <span style={{ fontSize:24, marginBottom:6, opacity:0.3 }}>📋</span>
            <p style={{ fontSize:11 }}>{dragOver?'Soltar aqui':'Sem clientes'}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function PosVendaPage({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      let q = supabase.from('leads').select('*')
        .eq('status','Fechados').eq('aprovado',true).eq('estornado',false)
        .order('created_at',{ascending:false})
      if (perfil?.role==='vendedor') q = q.eq('user_id',perfil.id)
      const { data } = await q
      setLeads(data||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function moverEtapa(leadId, novaEtapa) {
    const hist = [...(leads.find(l=>l.id===leadId)?.historico||[])]
    hist.push({ data:new Date().toISOString(), msg:`🔄 Movido para ${novaEtapa} por ${perfil?.full_name}` })
    await supabase.from('leads').update({ etapa_pos_venda:novaEtapa, historico:hist }).eq('id',leadId)
    setLeads(l=>l.map(x=>x.id===leadId?{...x,etapa_pos_venda:novaEtapa,historico:hist}:x))
  }

  const total = {
    onboarding:     leads.filter(l=>(l.etapa_pos_venda||'onboarding')==='onboarding').length,
    acompanhamento: leads.filter(l=>l.etapa_pos_venda==='acompanhamento').length,
    upsell:         leads.filter(l=>l.etapa_pos_venda==='upsell').length,
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
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>Pós-Venda</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>
          {leads.length} clientes · {total.onboarding} onboarding · {total.acompanhamento} acompanhamento · {total.upsell} upsell
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {ETAPAS.map(etapa=>(
          <Coluna key={etapa.id} etapa={etapa}
            leads={leads.filter(l=>(l.etapa_pos_venda||'onboarding')===etapa.id)}
            onMover={moverEtapa} />
        ))}
      </div>

      {leads.length===0&&(
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'#323448' }}>
          <span style={{ fontSize:40, marginBottom:10, opacity:0.3 }}>🤝</span>
          <p style={{ fontSize:13 }}>Nenhum cliente aprovado ainda</p>
        </div>
      )}
    </div>
  )
}