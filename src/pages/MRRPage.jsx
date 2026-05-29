import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}

// ── Sistema tipográfico enterprise ────────────────────────────
const T = {
  label:     { fontSize:10, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.9px', fontFamily:'DM Sans,sans-serif', margin:'0 0 8px', display:'block' },
  value:     { fontSize:26, fontWeight:700, lineHeight:1, fontFamily:'Syne,sans-serif', margin:0, fontVariantNumeric:'tabular-nums' },
  sub:       { fontSize:11.5, fontWeight:400, color:'#8f94b0', margin:'5px 0 0', fontFamily:'DM Sans,sans-serif' },
  cardTitle: { fontSize:13.5, fontWeight:700, color:'#f0f1ff', fontFamily:'Syne,sans-serif', margin:0, letterSpacing:'-0.1px' },
  pageTitle: { fontSize:22, fontWeight:700, color:'#f0f1ff', fontFamily:'Syne,sans-serif', margin:0, letterSpacing:'-0.4px' },
  pageSub:   { fontSize:12, fontWeight:400, color:'#4c5070', fontFamily:'DM Sans,sans-serif', margin:'4px 0 0' },
  thead:     { fontSize:10, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.8px', fontFamily:'DM Sans,sans-serif', padding:'11px 14px', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)', whiteSpace:'nowrap' },
  cell:      { padding:'12px 14px', fontFamily:'DM Sans,sans-serif', fontSize:13, fontVariantNumeric:'tabular-nums' },
  num:       { fontVariantNumeric:'tabular-nums', fontFamily:'DM Sans,sans-serif', fontFeatureSettings:'"tnum"' },
}

const SURFACE = { background:'rgba(14,15,22,0.88)', backdropFilter:'blur(28px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }
const ACCENT  = (cor) => ({ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${cor},transparent)`, opacity:0.5 })

function ModalConfirm({titulo,mensagem,corBotao,labelBotao,onConfirmar,onCancelar}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        style={{padding:28,borderRadius:16,width:'100%',maxWidth:380,background:'rgba(8,8,14,0.99)',backdropFilter:'blur(52px)',border:`1px solid ${corBotao||'#ff4d6a'}33`}}>
        <h3 style={{...T.cardTitle, fontSize:16, marginBottom:10}}>{titulo}</h3>
        <p style={{fontSize:13,color:'#8f94b0',marginBottom:20,lineHeight:1.6,fontFamily:'DM Sans,sans-serif'}} dangerouslySetInnerHTML={{__html:mensagem}} />
        <div style={{display:'flex',gap:10}}>
          <button onClick={onCancelar} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:13}}>Cancelar</button>
          <button onClick={onConfirmar} style={{flex:2,padding:'11px',background:`linear-gradient(160deg,${corBotao||'#ff4d6a'}dd,${corBotao||'#ff4d6a'}aa)`,border:'1px solid rgba(255,255,255,0.20)',borderRadius:10,color:'#fff',fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif',fontSize:13}}>{labelBotao||'Confirmar'}</button>
        </div>
      </motion.div>
    </div>
  )
}

export function MRRPage({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(()=>{ carregar() },[])

  async function carregar(){
    try{
      const {data}=await supabase.from('leads').select('*')
        .eq('is_recorrente',true).eq('status','Fechados').eq('aprovado',true).eq('estornado',false)
        .order('created_at',{ascending:false})
      setLeads(data||[])
    }catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  async function executar(){
    if(!confirm)return
    const {tipo,leadId}=confirm
    const lead=leads.find(l=>l.id===leadId)
    const hist=[...(lead?.historico||[])]
    setConfirm(null)
    if(tipo==='cancelar'){
      hist.push({data:new Date().toISOString(),msg:`❌ Assinatura cancelada (Churn) por ${perfil?.full_name}`})
      await supabase.from('leads').update({status_assinatura:'cancelado',historico:hist}).eq('id',leadId)
    } else if(tipo==='remover'){
      hist.push({data:new Date().toISOString(),msg:`🗑️ Removido da base MRR por ${perfil?.full_name}`})
      await supabase.from('leads').update({is_recorrente:false,status_assinatura:null,historico:hist}).eq('id',leadId)
    }
    carregar()
  }

  const ativos     = leads.filter(l=>(!l.status_assinatura||l.status_assinatura==='ativa'))
  const cancelados = leads.filter(l=>l.status_assinatura==='cancelado')
  const mrrAtivo   = ativos.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const mrrChurn   = cancelados.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const arr        = mrrAtivo * 12

  const confirmConfigs={
    cancelar:{titulo:'Registrar Churn?',mensagem:'O valor sairá do MRR e será registrado como Churn.',corBotao:'#ff4d6a',labelBotao:'Confirmar Churn'},
    remover: {titulo:'Remover da base MRR?',mensagem:'A tag de recorrente será removida permanentemente.',corBotao:'#ff8c42',labelBotao:'Remover'},
  }

  if(loading)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <motion.div style={{width:36,height:36,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429'}}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return(
    <div>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{...T.pageTitle}}>MRR — Receita Recorrente</h1>
        <p style={{...T.pageSub}}>Carteira de assinantes ativos</p>
      </div>

      {/* Stats — todos com mesma altura e fonte nivelada */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          {label:'MRR Ativo',   v:fmt(mrrAtivo), cor:'#00c896'},
          {label:'Assinantes',  v:String(ativos.length), cor:'#4d9fff'},
          {label:'ARR Anual',   v:fmt(arr),       cor:'#f0b429'},
          {label:'Churn MRR',   v:fmt(mrrChurn),  cor:'#ff4d6a'},
        ].map(s=>(
          <div key={s.label} style={{...SURFACE, padding:'18px 20px', position:'relative', overflow:'hidden'}}>
            <div style={{...ACCENT(s.cor)}} />
            <span style={{...T.label}}>{s.label}</span>
            <p style={{...T.value, color:s.cor}}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{...SURFACE, overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'rgba(0,0,0,0.20)'}}>
            <tr>
              {['Cliente','Produto','Valor / mês','Status','Ações'].map(h=>(
                <th key={h} style={{...T.thead}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length===0 && (
              <tr><td colSpan={5} style={{padding:'40px',textAlign:'center',color:'#4c5070',fontSize:13,fontFamily:'DM Sans,sans-serif'}}>Nenhum cliente com tag de recorrente</td></tr>
            )}
            {leads.map((l,i)=>{
              const ativo=!l.status_assinatura||l.status_assinatura==='ativa'
              return(
                <motion.tr key={l.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  style={{borderBottom:'1px solid rgba(30,32,48,0.45)',transition:'background 0.15s',cursor:'default'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{...T.cell, color:'#f0f1ff', fontWeight:600}}>{l.nome}</td>
                  <td style={{...T.cell, color:'#8f94b0'}}>{l.produto||'—'}</td>
                  <td style={{...T.cell, color:ativo?'#00c896':'#4c5070', fontWeight:700,
                    textDecoration:ativo?'none':'line-through', ...T.num}}>
                    {fmt(l.valor)}<span style={{fontWeight:400,fontSize:11,color:'#4c5070'}}>/mês</span>
                  </td>
                  <td style={{...T.cell}}>
                    <span style={{fontSize:10.5,fontWeight:700,padding:'3px 9px',borderRadius:99,letterSpacing:'0.4px',
                      background:ativo?'rgba(0,200,150,0.12)':'rgba(255,77,106,0.12)',
                      color:ativo?'#00c896':'#ff4d6a', fontFamily:'DM Sans,sans-serif'}}>
                      {ativo ? 'ATIVA' : 'CANCELADA'}
                    </span>
                  </td>
                  <td style={{...T.cell}}>
                    <div style={{display:'flex',gap:8}}>
                      {ativo && (
                        <motion.button onClick={()=>setConfirm({tipo:'cancelar',leadId:l.id})} whileHover={{y:-1}} whileTap={{scale:0.97}}
                          style={{padding:'5px 11px',background:'rgba(255,77,106,0.10)',border:'1px solid rgba(255,77,106,0.22)',borderRadius:7,color:'#ff4d6a',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                          Churn
                        </motion.button>
                      )}
                      <motion.button onClick={()=>setConfirm({tipo:'remover',leadId:l.id})} whileHover={{y:-1}} whileTap={{scale:0.97}}
                        style={{padding:'5px 11px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:7,color:'#8f94b0',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
                        Remover
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {confirm && <ModalConfirm {...confirmConfigs[confirm.tipo]} onConfirmar={executar} onCancelar={()=>setConfirm(null)} />}
      </AnimatePresence>
    </div>
  )
}