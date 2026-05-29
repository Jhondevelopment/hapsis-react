import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useLeads } from '../hooks/useLeads'

const COLUNAS = [
  { id:'Novos',      label:'Novos',       cor:'#4d9fff' },
  { id:'Contato',    label:'Em Contato',  cor:'#f0b429' },
  { id:'Negociacao', label:'Negociação',  cor:'#ff8c42' },
  { id:'Fechados',   label:'Fechados',    cor:'#00c896' },
  { id:'Perdidos',   label:'Perdidos',    cor:'#ff4d6a' },
]
const ORIGENS    = ['Indicação','Instagram','Google','Facebook','LinkedIn','WhatsApp','Site','Outro']
const PAGAMENTOS = ['PIX','Cartão de Crédito','Cartão de Débito','Boleto','Transferência','Dinheiro']

const WPP_TEMPLATES = [
  { label:'Primeiro contato',  icon:'👋', fn:(n,p,v)=>`Olá ${n}! 😊 Sou da equipe de vendas e gostaria de conversar sobre ${p||'nossa solução'}. Podemos bater um papo rápido?` },
  { label:'Enviar proposta',   icon:'📋', fn:(n,p,v)=>`Olá ${n}! 👋 Segue nossa proposta para ${p||'nosso serviço'}${v?` — R$ ${parseFloat(v).toLocaleString('pt-BR')}`:''}. Estou à disposição! 🤝` },
  { label:'Follow-up',         icon:'🔄', fn:(n,p,v)=>`Oi ${n}! Passando para verificar se você analisou nossa proposta. Ficou alguma dúvida? 😊` },
  { label:'Agendar reunião',   icon:'📅', fn:(n,p,v)=>`Oi ${n}! Gostaria de agendar uma conversa rápida sobre ${p||'nossa proposta'}. Qual o melhor horário?` },
  { label:'Pós-venda',         icon:'🎉', fn:(n,p,v)=>`Olá ${n}! 🎉 Como está sua experiência com ${p||'nosso serviço'}? Tem algum feedback?` },
  { label:'Cobrança gentil',   icon:'💰', fn:(n,p,v)=>`Olá ${n}, tudo bem? 😊 Passando para lembrar sobre um boleto em aberto de ${p||'nosso serviço'}. Podemos resolver hoje?` },
]

// ── Modal WhatsApp ────────────────────────────────────────────
function ModalWpp({ lead, onFechar }) {
  const [texto, setTexto] = useState('')
  const num = (lead.telefone||'').replace(/\D/g,'')
  const enviar = (msg) => {
    const m = msg||texto
    if(!m.trim()) return
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(m)}`,'_blank')
  }
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <motion.div initial={{opacity:0,y:20,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:0.97}}
        transition={{type:'spring',stiffness:340,damping:30}}
        style={{position:'relative',borderRadius:20,padding:28,width:'100%',maxWidth:460,
          background:'rgba(8,8,14,0.98)',backdropFilter:'blur(52px)',
          border:'1px solid rgba(37,211,102,0.28)',boxShadow:'0 40px 100px rgba(0,0,0,0.80)'}}>
        <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(37,211,102,0.50),transparent)'}} />
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:12,background:'rgba(37,211,102,0.14)',border:'1px solid rgba(37,211,102,0.28)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>📱</div>
            <div>
              <p style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:16,color:'#f0f1ff',margin:0}}>{lead.nome}</p>
              <p style={{fontSize:12,color:'#25d366',margin:0}}>{lead.telefone}</p>
            </div>
          </div>
          <motion.button onClick={onFechar} whileHover={{rotate:90,color:'#ff4d6a'}}
            style={{background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:20,transition:'all 0.2s'}}>×</motion.button>
        </div>
        <p style={{fontSize:11,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:10}}>Templates Rápidos</p>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:18}}>
          {WPP_TEMPLATES.map(t=>(
            <motion.button key={t.label} whileHover={{x:4,background:'rgba(37,211,102,0.10)'}} whileTap={{scale:0.98}}
              onClick={()=>enviar(t.fn(lead.nome,lead.produto,lead.valor))}
              style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',background:'rgba(37,211,102,0.05)',border:'1px solid rgba(37,211,102,0.14)',borderRadius:10,cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
              <span style={{fontSize:17,flexShrink:0}}>{t.icon}</span>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:600,color:'#f0f1ff',margin:0}}>{t.label}</p>
                <p style={{fontSize:11,color:'#4c5070',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {t.fn(lead.nome,lead.produto,lead.valor).slice(0,55)}...
                </p>
              </div>
              <span style={{fontSize:13,color:'#25d366',flexShrink:0}}>→</span>
            </motion.button>
          ))}
        </div>
        <p style={{fontSize:11,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:8}}>Mensagem Personalizada</p>
        <textarea value={texto} onChange={e=>setTexto(e.target.value)} rows={3} placeholder="Escreva sua mensagem..."
          style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 14px',fontSize:13,color:'#f0f1ff',outline:'none',fontFamily:'inherit',resize:'vertical',marginBottom:12}}
          onFocus={e=>e.target.style.borderColor='rgba(37,211,102,0.45)'}
          onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
        <motion.button onClick={()=>enviar()} disabled={!texto.trim()} whileHover={{y:-1}} whileTap={{scale:0.98}}
          style={{width:'100%',padding:'13px',background:texto.trim()?'linear-gradient(180deg,rgba(37,211,102,0.90),rgba(18,168,80,0.85))':'rgba(255,255,255,0.06)',
            border:`1px solid ${texto.trim()?'rgba(37,211,102,0.50)':'rgba(255,255,255,0.09)'}`,borderRadius:10,
            color:texto.trim()?'#060709':'#4c5070',fontWeight:700,fontSize:14,cursor:texto.trim()?'pointer':'not-allowed',
            fontFamily:'Syne,sans-serif',transition:'all 0.2s'}}>
          📱 Enviar no WhatsApp
        </motion.button>
      </motion.div>
    </div>
  )
}

// ── Modal confirmação ─────────────────────────────────────────
function ModalConfirm({ titulo, mensagem, corBotao='#ff4d6a', labelBotao='Confirmar', onConfirmar, onCancelar }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <motion.div initial={{opacity:0,y:16,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:0.95}}
        transition={{type:'spring',stiffness:340,damping:30}}
        style={{position:'relative',borderRadius:18,padding:32,width:'100%',maxWidth:380,background:'rgba(8,8,14,0.99)',backdropFilter:'blur(52px)',border:`1px solid ${corBotao}33`,boxShadow:`0 40px 100px rgba(0,0,0,0.80)`}}>
        <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:`linear-gradient(90deg,transparent,${corBotao}55,transparent)`}} />
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:`${corBotao}14`,border:`1px solid ${corBotao}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 16px'}}>⚠️</div>
          <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:18,color:'#f0f1ff',marginBottom:10}}>{titulo}</h3>
          <p style={{fontSize:13.5,color:'#8f94b0',lineHeight:1.65}}>{mensagem}</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <motion.button onClick={onCancelar} whileHover={{background:'rgba(255,255,255,0.10)'}} whileTap={{scale:0.97}}
            style={{flex:1,padding:'12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,fontSize:14,cursor:'pointer',transition:'background 0.2s'}}>
            Cancelar
          </motion.button>
          <motion.button onClick={onConfirmar} whileHover={{filter:'brightness(1.10)'}} whileTap={{scale:0.97}}
            style={{flex:2,padding:'12px',background:`linear-gradient(160deg,${corBotao}dd,${corBotao}aa)`,border:'1px solid rgba(255,255,255,0.20)',borderRadius:10,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>
            {labelBotao}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

function gerarPropostaPDF(lead, perfil) {
  const val=parseFloat(lead.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const emp=perfil?.nome_empresa||'HAPSIS Enterprise'
  const w=window.open('','_blank')
  w.document.write(`<!DOCTYPE html><html><head><title>Proposta - ${lead.nome}</title>
  <style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;line-height:1.6}
  .header{text-align:center;border-bottom:3px solid #f0b429;padding-bottom:20px;margin-bottom:30px}
  .header h1{margin:0;font-size:28px;color:#10121a;text-transform:uppercase}
  .price-box{background:#f8f9fa;padding:25px;border-left:6px solid #00c896;border-radius:4px;margin-top:30px}
  </style></head><body>
  <div class="header"><h1>Proposta Comercial</h1><p>${emp}</p></div>
  <p><strong>Cliente:</strong> ${lead.nome}</p><p><strong>Contato:</strong> ${lead.telefone||'—'}</p>
  <p><strong>Produto:</strong> ${lead.produto||'—'}</p>
  <div class="price-box"><p style="font-size:20px;margin:0"><strong>Investimento:</strong> <span style="font-size:28px;color:#21a366;font-weight:bold">${val}</span></p></div>
  <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
  w.document.close()
}

// ── Drawer lateral ────────────────────────────────────────────
function DrawerLead({ lead, perfil, onFechar, onSalvar, onDeletar, onRecarregar, onAbrirWpp }) {
  const isNovo   = !lead
  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)
  const isFechado = lead?.status==='Fechados'
  const [aba,setSalvando] = useState('dados')
  const setAba = setSalvando  // alias
  const [abaAtiva,setAbaAtiva] = useState('dados')
  const [form,setForm] = useState({
    nome:lead?.nome||'', telefone:lead?.telefone||'', produto:lead?.produto||'',
    valor:lead?.valor||'', status:lead?.status||'Novos', origem_lead:lead?.origem_lead||'',
    forma_pagamento:lead?.forma_pagamento||'', data_followup:lead?.data_followup||'',
    observacoes:lead?.observacoes||'', motivo_perda:lead?.motivo_perda||'',
    is_recorrente:lead?.is_recorrente||false,
  })
  const [saving,setSaving] = useState(false)
  const [msg,setMsg] = useState(null)
  const [confirm,setConfirm] = useState(null)
  const fileCompRef=useRef(); const fileContRef=useRef()

  function set(c,v){setForm(f=>({...f,[c]:v}))}
  function showMsg(type,text){setMsg({type,text});setTimeout(()=>setMsg(null),3000)}

  function sanitizar(f){
    const c={...f}
    if(!c.data_followup)c.data_followup=null
    if(!c.valor||c.valor==='')c.valor=null
    ;['motivo_perda','origem_lead','forma_pagamento','telefone','produto','observacoes']
      .forEach(k=>{if(c[k]==='')c[k]=null})
    return c
  }

  async function handleSalvar(){
    if(!form.nome.trim()){showMsg('error','Nome é obrigatório');return}
    // Bloquear vendedor de mudar status de Fechado
    if(!isGestor && isFechado && form.status!=='Fechados'){
      showMsg('error','Apenas o gestor pode alterar uma venda fechada.')
      setForm(f=>({...f,status:'Fechados'}))
      return
    }
    setSaving(true)
    try{
      const payload=sanitizar(form)
      if(payload.status==='Fechados'&&lead?.status!=='Fechados'){
        payload.aprovado=false
        const hist=[...(lead?.historico||[])]
        hist.push({data:new Date().toISOString(),msg:`🎉 Venda fechada por ${perfil?.full_name}`})
        payload.historico=hist
      }
      await onSalvar(payload)
    }catch(e){showMsg('error',e.message)}
    finally{setSaving(false)}
  }

  async function marcarInadimplente(){
    const hist=[...(lead?.historico||[])]
    hist.push({data:new Date().toISOString(),msg:`⚠️ Marcado como inadimplente por ${perfil?.full_name||'vendedor'}`})
    await supabase.from('leads').update({is_inadimplente:true,historico:hist}).eq('id',lead.id)
    showMsg('success','⚠️ Marcado como inadimplente'); onRecarregar?.()
    setConfirm(null)
  }

  async function marcarAtraso(){
    const hist=[...(lead?.historico||[])]
    hist.push({data:new Date().toISOString(),msg:`🕐 Atraso no pagamento sinalizado por ${perfil?.full_name||'vendedor'}`})
    await supabase.from('leads').update({historico:hist,observacoes:(lead.observacoes?lead.observacoes+'\n':'')+'⚠️ Pagamento em atraso'}).eq('id',lead.id)
    showMsg('success','🕐 Atraso sinalizado'); onRecarregar?.()
    setConfirm(null)
  }

  async function uploadDoc(file, campo, prefixo){
    const ext=file.name.split('.').pop()
    const fn=`lead_${lead.id}_${prefixo}_${Date.now()}.${ext}`
    const {error}=await supabase.storage.from('comprovantes').upload(fn,file)
    if(error)throw error
    const url=supabase.storage.from('comprovantes').getPublicUrl(fn).data.publicUrl
    const hist=[...(lead.historico||[])]
    hist.push({data:new Date().toISOString(),msg:`📎 ${campo} anexado por ${perfil?.full_name}`})
    await supabase.from('leads').update({[campo]:url,historico:hist}).eq('id',lead.id)
  }

  async function handleUploadDocs(){
    if(!lead?.id)return; setSaving(true)
    try{
      if(fileCompRef.current?.files[0]) await uploadDoc(fileCompRef.current.files[0],'comprovante_url','comp')
      if(fileContRef.current?.files[0]) await uploadDoc(fileContRef.current.files[0],'contrato_url','cont')
      showMsg('success','✅ Documentos enviados!'); onRecarregar?.()
    }catch(e){showMsg('error','Erro: '+e.message)}
    finally{setSaving(false)}
  }

  async function handleAprovar(){
    const hist=[...(lead?.historico||[])]
    hist.push({data:new Date().toISOString(),msg:`✅ Aprovado por ${perfil?.full_name}`})
    await supabase.from('leads').update({aprovado:true,historico:hist}).eq('id',lead.id)
    showMsg('success','✅ Aprovado!'); onRecarregar?.()
  }
  async function handleEstornar(){
    const hist=[...(lead?.historico||[])]
    hist.push({data:new Date().toISOString(),msg:`↩️ Estorno por ${perfil?.full_name}`})
    await supabase.from('leads').update({estornado:true,aprovado:false,historico:hist}).eq('id',lead.id)
    showMsg('success','Estornado.'); onRecarregar?.(); setConfirm(null)
  }

  const corStatus={Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}
  const mostrarAprov=isGestor&&isFechado&&lead?.aprovado===false&&!lead?.estornado
  const mostrarEstorno=isGestor&&isFechado&&lead?.aprovado===true&&!lead?.estornado

  const abas=[
    ['dados','📋 Dados'],
    ['docs','📎 Docs'],
    ...(isGestor?[['acoes','⚡ Ações']]:[]),
    ['historico','📜 Histórico'],
  ]

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(3,3,7,0.55)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',justifyContent:'flex-end'}}
      onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <motion.div initial={{x:'100%',opacity:0}} animate={{x:0,opacity:1}} exit={{x:'100%',opacity:0}}
        transition={{type:'spring',stiffness:360,damping:36}}
        style={{width:'100%',maxWidth:520,height:'100%',display:'flex',flexDirection:'column',
          background:'rgba(6,6,9,0.98)',backdropFilter:'blur(52px)',
          borderLeft:'1px solid rgba(255,255,255,0.07)',boxShadow:'-24px 0 80px rgba(0,0,0,0.72)'}}>

        {/* Header */}
        <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex',justifyContent:'space-between',alignItems:'flex-start',
          background:'rgba(0,0,0,0.20)',flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:19,color:'#f0f1ff',marginBottom:8}}>
              {isNovo?'➕ Novo Lead':form.nome||'Lead'}
            </h2>
            {lead&&(
              <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:`${corStatus[lead.status]||'#4c5070'}18`,color:corStatus[lead.status]||'#4c5070'}}>{lead.status}</span>
                {lead.aprovado===false&&isFechado&&!lead.estornado&&<span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:'rgba(255,140,66,0.14)',color:'#ff8c42'}}>⏳ Aguarda aprovação</span>}
                {lead.aprovado===true&&!lead.estornado&&isFechado&&<span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:'rgba(0,200,150,0.12)',color:'#00c896'}}>✅ Aprovado</span>}
                {lead.estornado&&<span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:'rgba(255,140,66,0.14)',color:'#ff8c42'}}>↩️ Estornado</span>}
                {lead.is_inadimplente&&<span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:'rgba(255,77,106,0.14)',color:'#ff4d6a'}}>⚠️ Inadimplente</span>}
                {lead.telefone&&(
                  <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>onAbrirWpp(lead)}
                    style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,background:'rgba(37,211,102,0.14)',color:'#25d366',border:'1px solid rgba(37,211,102,0.28)',cursor:'pointer'}}>
                    📱 WhatsApp
                  </motion.button>
                )}
              </div>
            )}
          </div>
          <motion.button onClick={onFechar} whileHover={{rotate:90,color:'#ff4d6a'}}
            style={{width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',color:'#4c5070',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',flexShrink:0,marginLeft:10}}>×</motion.button>
        </div>

        {/* Abas */}
        <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(0,0,0,0.10)'}}>
          {abas.map(([id,label])=>(
            <motion.button key={id} onClick={()=>setAbaAtiva(id)} whileTap={{scale:0.97}}
              style={{flex:1,padding:'11px 6px',border:'none',
                background:abaAtiva===id?'rgba(240,180,41,0.08)':'transparent',
                color:abaAtiva===id?'#f0b429':'#4c5070',
                borderBottom:abaAtiva===id?'2px solid #f0b429':'2px solid transparent',
                cursor:'pointer',fontSize:11.5,fontWeight:600,transition:'all 0.15s'}}>
              {label}
            </motion.button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          <AnimatePresence mode="wait">
            {msg&&(
              <motion.div key="msg" initial={{opacity:0,y:-6,height:0}} animate={{opacity:1,y:0,height:'auto'}} exit={{opacity:0,height:0}}
                transition={{duration:0.2}}
                style={{padding:'10px 14px',borderRadius:10,marginBottom:14,fontSize:13,
                  color:msg.type==='success'?'#00c896':'#ff4d6a',
                  background:msg.type==='success'?'rgba(0,200,150,0.08)':'rgba(255,77,106,0.08)',
                  border:`1px solid ${msg.type==='success'?'rgba(0,200,150,0.22)':'rgba(255,77,106,0.22)'}`}}>
                {msg.text}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div key={abaAtiva} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}}
              transition={{duration:0.18,ease:[0.22,1,0.36,1]}}>

              {/* ABA DADOS */}
              {abaAtiva==='dados'&&(
                <div>
                  {[
                    {label:'Nome completo *',campo:'nome',type:'text',placeholder:'Ex: João Silva'},
                    {label:'Telefone / WhatsApp',campo:'telefone',type:'tel',placeholder:'(00) 00000-0000'},
                    {label:'Produto / Serviço',campo:'produto',type:'text',placeholder:'Ex: Plano Premium'},
                    {label:'Valor (R$)',campo:'valor',type:'number',placeholder:'0,00'},
                  ].map(f=>(
                    <div key={f.campo} style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>{f.label}</label>
                      <input type={f.type} value={form[f.campo]||''} onChange={e=>set(f.campo,e.target.value)} placeholder={f.placeholder}
                        style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit',transition:'border-color 0.2s'}}
                        onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'}
                        onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                    </div>
                  ))}

                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Data de Follow-up</label>
                    <input type="date" value={form.data_followup||''} onChange={e=>set('data_followup',e.target.value||'')}
                      style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none'}} />
                  </div>

                  {/* Status — bloqueado para vendedor se fechado */}
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Status</label>
                    {!isNovo && (isFechado || lead?.status==='Perdidos') ? (
                      <div style={{width:'100%',background: isFechado?'rgba(0,200,150,0.06)':'rgba(255,77,106,0.06)',
                        border:`1px solid ${isFechado?'rgba(0,200,150,0.22)':'rgba(255,77,106,0.22)'}`,
                        borderRadius:10,padding:'11px 15px',fontSize:14,
                        color:isFechado?'#00c896':'#ff4d6a',display:'flex',alignItems:'center',gap:8}}>
                        🔒 {isFechado?'Fechado':'Perdido'} — status não pode ser alterado
                      </div>
                    ) : (
                      <select value={form.status} onChange={e=>set('status',e.target.value)}
                        style={{width:'100%',background:'#0d1117',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none'}}>
                        {COLUNAS.filter(col=>col.id!=='Fechados'&&col.id!=='Perdidos').map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    )}
                  </div>

                  {form.status==='Fechados'&&!isFechado&&(
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}
                      style={{marginBottom:14,padding:'12px 14px',borderRadius:10,background:'rgba(0,200,150,0.06)',border:'1px solid rgba(0,200,150,0.18)'}}>
                      <p style={{fontSize:12,color:'#00c896',margin:0}}>🎉 Venda vai para aprovação do gestor.</p>
                    </motion.div>
                  )}
                  {form.status==='Perdidos'&&(
                    <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#ff4d6a',marginBottom:7}}>Motivo da Perda</label>
                      <input type="text" value={form.motivo_perda||''} onChange={e=>set('motivo_perda',e.target.value)} placeholder="Ex: Preço alto, concorrente..."
                        style={{width:'100%',background:'rgba(255,77,106,0.04)',border:'1px solid rgba(255,77,106,0.22)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit'}} />
                    </motion.div>
                  )}

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Origem</label>
                      <select value={form.origem_lead||''} onChange={e=>set('origem_lead',e.target.value)}
                        style={{width:'100%',background:'#0d1117',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none'}}>
                        <option value="">Selecionar</option>{ORIGENS.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Pagamento</label>
                      <select value={form.forma_pagamento||''} onChange={e=>set('forma_pagamento',e.target.value)}
                        style={{width:'100%',background:'#0d1117',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none'}}>
                        <option value="">Selecionar</option>{PAGAMENTOS.map(p=><option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{marginBottom:14,padding:'11px 14px',borderRadius:10,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12}}>
                    <input type="checkbox" id="recorrente" checked={form.is_recorrente||false} onChange={e=>set('is_recorrente',e.target.checked)} style={{width:18,height:18,accentColor:'#00c896',cursor:'pointer'}} />
                    <label htmlFor="recorrente" style={{fontSize:13,color:'#8f94b0',cursor:'pointer'}}>📈 Contrato recorrente (MRR)</label>
                  </div>

                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Observações</label>
                    <textarea value={form.observacoes||''} onChange={e=>set('observacoes',e.target.value)} rows={3} placeholder="Notas sobre o cliente..."
                      style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit',resize:'vertical'}} />
                  </div>

                  {/* Ações rápidas para vendedor — inadimplência e follow-up */}
                  {!isNovo && lead && (
                    <div style={{marginTop:4}}>
                      <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:10}}>Ações Rápidas</p>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        {/* Follow-up rápido */}
                        <motion.button whileHover={{y:-1,borderColor:'rgba(157,111,255,0.40)'}} whileTap={{scale:0.97}}
                          onClick={()=>{ set('data_followup', new Date(Date.now()+86400000*2).toISOString().split('T')[0]); showMsg('success','📅 Follow-up agendado para 2 dias') }}
                          style={{padding:'10px',background:'rgba(157,111,255,0.08)',border:'1px solid rgba(157,111,255,0.20)',borderRadius:10,color:'#9d6fff',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'left'}}>
                          📅 Follow-up em 2 dias
                        </motion.button>
                        {/* Follow-up 7 dias */}
                        <motion.button whileHover={{y:-1,borderColor:'rgba(77,159,255,0.40)'}} whileTap={{scale:0.97}}
                          onClick={()=>{ set('data_followup', new Date(Date.now()+86400000*7).toISOString().split('T')[0]); showMsg('success','📅 Follow-up agendado para 7 dias') }}
                          style={{padding:'10px',background:'rgba(77,159,255,0.08)',border:'1px solid rgba(77,159,255,0.20)',borderRadius:10,color:'#4d9fff',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'left'}}>
                          📅 Follow-up em 7 dias
                        </motion.button>
                        {/* Sinalizar atraso */}
                        {isFechado && !lead.is_inadimplente && (
                          <motion.button whileHover={{y:-1,borderColor:'rgba(255,140,66,0.40)'}} whileTap={{scale:0.97}}
                            onClick={()=>setConfirm({tipo:'atraso'})}
                            style={{padding:'10px',background:'rgba(255,140,66,0.08)',border:'1px solid rgba(255,140,66,0.20)',borderRadius:10,color:'#ff8c42',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'left'}}>
                            🕐 Sinalizar atraso
                          </motion.button>
                        )}
                        {/* Inadimplente */}
                        {isFechado && !lead.is_inadimplente && (
                          <motion.button whileHover={{y:-1,borderColor:'rgba(255,77,106,0.40)'}} whileTap={{scale:0.97}}
                            onClick={()=>setConfirm({tipo:'inadimplente'})}
                            style={{padding:'10px',background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.20)',borderRadius:10,color:'#ff4d6a',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'left'}}>
                            ⚠️ Inadimplente
                          </motion.button>
                        )}
                        {/* WhatsApp */}
                        {lead.telefone && (
                          <motion.button whileHover={{y:-1,borderColor:'rgba(37,211,102,0.40)'}} whileTap={{scale:0.97}}
                            onClick={()=>onAbrirWpp(lead)}
                            style={{padding:'10px',background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.20)',borderRadius:10,color:'#25d366',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',textAlign:'left',gridColumn:'span 2'}}>
                            📱 Chamar no WhatsApp
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA DOCS */}
              {abaAtiva==='docs'&&(
                <div>
                  <p style={{fontSize:13,color:'#4c5070',marginBottom:18}}>Anexe documentos ao lead.</p>
                  {[
                    {label:'💳 Comprovante de Pagamento',ref:fileCompRef,urlKey:'comprovante_url'},
                    {label:'📄 Contrato Assinado',ref:fileContRef,urlKey:'contrato_url'},
                  ].map(doc=>(
                    <div key={doc.label} style={{marginBottom:14,padding:14,borderRadius:12,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <p style={{fontSize:13,fontWeight:600,color:'#f0f1ff',marginBottom:10}}>{doc.label}</p>
                      {lead?.[doc.urlKey]&&<a href={lead[doc.urlKey]} target="_blank" rel="noreferrer"
                        style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 12px',background:'rgba(77,159,255,0.12)',border:'1px solid rgba(77,159,255,0.26)',borderRadius:8,color:'#4d9fff',fontSize:12,fontWeight:600,textDecoration:'none',marginBottom:10}}>👁️ Ver arquivo</a>}
                      <input ref={doc.ref} type="file" accept=".pdf,.jpg,.jpeg,.png"
                        style={{display:'block',fontSize:12,color:'#8f94b0',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 12px',width:'100%',cursor:'pointer'}} />
                    </div>
                  ))}
                  {lead?.id&&<motion.button onClick={handleUploadDocs} disabled={saving} whileHover={{y:-1}} whileTap={{scale:0.98}}
                    style={{width:'100%',padding:'12px',background:'linear-gradient(180deg,rgba(77,159,255,0.22),rgba(77,159,255,0.12))',border:'1px solid rgba(77,159,255,0.32)',borderRadius:10,color:'#4d9fff',fontWeight:700,fontSize:14,cursor:'pointer',opacity:saving?0.7:1}}>
                    {saving?'📤 Enviando...':'📤 Enviar Documentos'}
                  </motion.button>}
                </div>
              )}

              {/* ABA AÇÕES — gestores */}
              {abaAtiva==='acoes'&&lead&&isGestor&&(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{padding:16,borderRadius:12,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <h4 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#f0f1ff',marginBottom:12}}>📄 Proposta PDF</h4>
                    <motion.button onClick={()=>gerarPropostaPDF(lead,perfil)} whileHover={{y:-1}} whileTap={{scale:0.98}}
                      style={{padding:'9px 18px',background:'rgba(77,159,255,0.12)',border:'1px solid rgba(77,159,255,0.26)',borderRadius:8,color:'#4d9fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                      📄 Gerar PDF
                    </motion.button>
                  </div>
                  {mostrarAprov&&(
                    <div style={{padding:16,borderRadius:12,background:'rgba(0,200,150,0.06)',border:'1px solid rgba(0,200,150,0.22)'}}>
                      <h4 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#00c896',marginBottom:12}}>✅ Aprovar Venda</h4>
                      <div style={{display:'flex',gap:8}}>
                        <motion.button onClick={handleAprovar} whileHover={{y:-1}} whileTap={{scale:0.98}}
                          style={{padding:'9px 18px',background:'rgba(0,200,150,0.18)',border:'1px solid rgba(0,200,150,0.30)',borderRadius:8,color:'#00c896',fontWeight:700,fontSize:12,cursor:'pointer'}}>✓ Aprovar</motion.button>
                        <motion.button onClick={async()=>{await supabase.from('leads').update({status:'Perdidos',aprovado:false}).eq('id',lead.id);showMsg('success','Rejeitado.');onRecarregar?.()}} whileHover={{y:-1}} whileTap={{scale:0.98}}
                          style={{padding:'9px 18px',background:'rgba(255,77,106,0.12)',border:'1px solid rgba(255,77,106,0.26)',borderRadius:8,color:'#ff4d6a',fontWeight:700,fontSize:12,cursor:'pointer'}}>✕ Rejeitar</motion.button>
                      </div>
                    </div>
                  )}
                  {mostrarEstorno&&(
                    <div style={{padding:16,borderRadius:12,background:'rgba(255,140,66,0.04)',border:'1px solid rgba(255,140,66,0.18)'}}>
                      <h4 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#ff8c42',marginBottom:12}}>↩️ Estornar Venda</h4>
                      <motion.button onClick={()=>setConfirm({tipo:'estornar'})} whileHover={{y:-1}} whileTap={{scale:0.98}}
                        style={{padding:'9px 18px',background:'rgba(255,140,66,0.12)',border:'1px solid rgba(255,140,66,0.26)',borderRadius:8,color:'#ff8c42',fontWeight:700,fontSize:12,cursor:'pointer'}}>↩️ Confirmar Estorno</motion.button>
                    </div>
                  )}
                </div>
              )}

              {/* ABA HISTÓRICO */}
              {abaAtiva==='historico'&&(
                <div>
                  {lead?.historico?.length>0
                    ?[...(lead.historico||[])].reverse().map((h,i)=>(
                      <motion.div key={i} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                        style={{padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',flexDirection:'column',gap:3}}>
                        <span style={{fontSize:10.5,color:'#f0b429',fontWeight:700}}>
                          {new Date(h.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </span>
                        <span style={{fontSize:13,color:'#8f94b0'}}>{h.msg}</span>
                      </motion.div>
                    ))
                    :<div style={{textAlign:'center',color:'#4c5070',padding:'40px 0'}}>
                      <span style={{fontSize:32,display:'block',marginBottom:10,opacity:0.3}}>📜</span>Nenhum registro ainda
                    </div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{padding:'14px 24px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.18)',display:'flex',gap:10,flexShrink:0}}>
          {lead&&<motion.button onClick={()=>onDeletar(lead.id)} whileHover={{background:'rgba(255,77,106,0.20)'}} whileTap={{scale:0.97}}
            style={{padding:'11px 14px',background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.20)',borderRadius:10,color:'#ff4d6a',fontWeight:600,fontSize:13,cursor:'pointer',transition:'background 0.2s'}}>🗑️</motion.button>}
          <motion.button onClick={onFechar} whileHover={{background:'rgba(255,255,255,0.08)'}} whileTap={{scale:0.98}}
            style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,color:'#8f94b0',fontWeight:600,fontSize:13,cursor:'pointer'}}>Cancelar</motion.button>
          <motion.button onClick={handleSalvar} disabled={saving} whileHover={{y:-1,filter:'brightness(1.05)'}} whileTap={{scale:0.98}}
            style={{flex:2,padding:'11px',background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',border:'1px solid rgba(255,255,255,0.28)',borderRadius:10,color:'#060709',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'Syne,sans-serif',opacity:saving?0.7:1}}>
            {saving?'Salvando...':lead?'💾 Salvar':'✓ Criar Lead'}
          </motion.button>
        </div>
      </motion.div>

      {/* Confirm modals */}
      <AnimatePresence>
        {confirm?.tipo==='inadimplente'&&<ModalConfirm titulo="Marcar como inadimplente?" mensagem="O cliente será listado na seção de inadimplência." corBotao="#ff4d6a" labelBotao="⚠️ Confirmar" onConfirmar={marcarInadimplente} onCancelar={()=>setConfirm(null)} />}
        {confirm?.tipo==='atraso'&&<ModalConfirm titulo="Sinalizar atraso no pagamento?" mensagem="Será registrado no histórico do lead." corBotao="#ff8c42" labelBotao="🕐 Sinalizar" onConfirmar={marcarAtraso} onCancelar={()=>setConfirm(null)} />}
        {confirm?.tipo==='estornar'&&<ModalConfirm titulo="Estornar venda?" mensagem="Remove do caixa. Irreversível." corBotao="#ff8c42" labelBotao="↩️ Estornar" onConfirmar={handleEstornar} onCancelar={()=>setConfirm(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Lead card ─────────────────────────────────────────────────
function LeadCard({ lead, onAbrir, onAbrirWpp, perfil }) {
  const cor = {Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}[lead.status]||'#4c5070'

  // Aprovado = card imóvel (gestor aprovou)
  const aprovado  = lead.status==='Fechados' && lead.aprovado===true  && !lead.estornado
  // Pendente = card cinzento (aguarda aprovação)
  const pendente  = lead.status==='Fechados' && (lead.aprovado===false||lead.aprovado===null) && !lead.estornado
  // REGRA: Fechados e Perdidos são SEMPRE bloqueados — ninguém move
  const bloqueado = lead.status==='Fechados' || lead.status==='Perdidos'

  return(
    <motion.div layout
      initial={{opacity:0,y:10,scale:0.97}}
      animate={{
        opacity: pendente ? 0.55 : 1,
        y:0, scale:1,
        filter: pendente ? 'grayscale(60%) brightness(0.75)' : 'none',
      }}
      exit={{opacity:0,scale:0.95}}
      whileHover={!bloqueado ? {y:-3,boxShadow:`0 8px 24px rgba(0,0,0,0.35)`,opacity:1,filter:'none'} : {}}
      transition={{layout:{type:'spring',stiffness:300,damping:30},opacity:{duration:0.3}}}
      draggable={!bloqueado}
      onDragStart={e=>{
        if(bloqueado){e.preventDefault();return}
        e.dataTransfer.setData('leadId',lead.id)
        e.dataTransfer.effectAllowed='move'
      }}
      style={{position:'relative',borderRadius:12,padding:13,
        cursor: aprovado ? 'default' : bloqueado ? 'not-allowed' : 'grab',
        background: pendente
          ? 'rgba(14,15,22,0.85)'
          : 'rgba(20,21,32,0.70)',
        backdropFilter:'blur(16px)',
        border: aprovado
          ? '1px solid rgba(0,200,150,0.22)'
          : pendente
          ? '1px solid rgba(255,255,255,0.03)'
          : '1px solid rgba(255,255,255,0.06)',
        marginBottom:8,
        transition:'border-color 0.2s,box-shadow 0.2s',
        userSelect:'none'}}>

      {/* Barra lateral colorida */}
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,
        background: pendente ? '#555' : cor,
        borderRadius:'12px 0 0 12px',
        opacity: pendente ? 0.4 : 0.85}} />

      {/* Badge de cadeado se aprovado */}
      {aprovado && (
        <div style={{position:'absolute',top:8,right:8,fontSize:12,opacity:0.6}} title="Venda aprovada — imóvel">🔒</div>
      )}

      <div onClick={()=>onAbrir(lead)} style={{cursor:'pointer',paddingRight:aprovado?20:0}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,gap:6}}>
          <span style={{fontWeight:700,fontSize:13.5,color: pendente?'#6a7080':'#f0f1ff'}}>{lead.nome}</span>
          <div style={{display:'flex',gap:3,alignItems:'center',flexShrink:0}}>
            {lead.comprovante_url&&<span style={{fontSize:11}} title="Comprovante">💳</span>}
            {lead.is_inadimplente&&<span style={{fontSize:11}} title="Inadimplente">⚠️</span>}
            {lead.estornado&&<span style={{fontSize:11}} title="Estornado">↩️</span>}
            {pendente&&(
              <motion.span animate={{opacity:[1,0.4,1]}} transition={{duration:1.5,repeat:Infinity}}
                style={{fontSize:9,fontWeight:700,background:'rgba(255,140,66,0.16)',color:'#ff8c42',padding:'1px 5px',borderRadius:4,border:'1px solid rgba(255,140,66,0.28)'}}>
                PEND
              </motion.span>
            )}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3,fontSize:11.5,color: pendente?'#454860':'#4c5070'}}>
          {lead.produto&&<span>📦 {lead.produto}</span>}
          {parseFloat(lead.valor)>0&&<span style={{color: pendente?'#3a6b56':'#00c896',fontWeight:700}}>💰 R$ {parseFloat(lead.valor).toLocaleString('pt-BR')}</span>}
          {lead.data_followup&&<span style={{color: pendente?'#4a4460':'#9d6fff'}}>📅 {new Date(lead.data_followup+'T12:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
      </div>

      {/* Ícone WhatsApp — sem número, só ícone verde */}
      {lead.telefone&&(
        <motion.button
          onClick={e=>{e.stopPropagation();onAbrirWpp(lead)}}
          whileHover={{scale:1.08,background:'rgba(37,211,102,0.22)'}}
          whileTap={{scale:0.92}}
          title={`WhatsApp: ${lead.telefone}`}
          style={{position:'absolute',bottom:10,right:10,
            width:30,height:30,borderRadius:'50%',
            background:'rgba(37,211,102,0.10)',
            border:'1px solid rgba(37,211,102,0.25)',
            display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',transition:'all 0.15s',fontSize:15}}>
          📱
        </motion.button>
      )}
      {/* Espaço para não sobrepor conteúdo quando tem whatsapp */}
      {lead.telefone&&<div style={{height:8}} />}
    </motion.div>
  )
}

// ── Kanban coluna ─────────────────────────────────────────────
function KanbanCol({coluna,leads,onAbrir,onMover,onAbrirWpp,perfil}){
  const [dragOver,setDragOver]=useState(false)
  const handleDragOver=useCallback(e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOver(true)},[])
  const handleDragLeave=useCallback(e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)},[])
  const handleDrop=useCallback(e=>{
    e.preventDefault();e.stopPropagation();setDragOver(false)
    const id=e.dataTransfer.getData('leadId');if(id)onMover(id,coluna.id)
  },[coluna.id,onMover])

  return(
    <motion.div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      animate={{ borderColor:dragOver?`${coluna.cor}66`:'#1e2030', boxShadow:dragOver?`0 0 0 2px ${coluna.cor}33`:'none' }}
      transition={{duration:0.15}}
      style={{borderRadius:14,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'calc(100vh - 200px)',
        background:'linear-gradient(180deg,rgba(16,17,26,0.95),rgba(10,11,18,0.92))',backdropFilter:'blur(24px)',
        border:'1px solid #1e2030'}}>
      <div style={{display:'flex',alignItems:'center',gap:9,padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',
        background:dragOver?`${coluna.cor}08`:'rgba(0,0,0,0.18)',transition:'background 0.15s'}}>
        <motion.div animate={{boxShadow:dragOver?`0 0 12px ${coluna.cor}`:`0 0 6px ${coluna.cor}66`}}
          style={{width:8,height:8,borderRadius:'50%',background:coluna.cor}} />
        <span style={{fontFamily:'Syne,sans-serif',fontSize:12,fontWeight:700,flex:1,color:'#f0f1ff'}}>{coluna.label}</span>
        <span style={{background:'rgba(0,0,0,0.38)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:18,padding:'2px 8px',fontSize:10,fontWeight:700,color:'#8f94b0'}}>{leads.length}</span>
      </div>
      <div style={{padding:8,flex:1,overflowY:'auto',minHeight:100,background:dragOver?`${coluna.cor}03`:'transparent',transition:'background 0.15s'}}>
        <AnimatePresence>
          {leads.map(l=><LeadCard key={l.id} lead={l} onAbrir={onAbrir} onAbrirWpp={onAbrirWpp} perfil={perfil} />)}
        </AnimatePresence>
        <motion.div animate={{opacity:dragOver?1:0,y:dragOver?0:4}} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'16px 12px',color:coluna.cor,textAlign:'center',pointerEvents:'none'}}>
          <span style={{fontSize:20,marginBottom:4}}>⬇️</span>
          <p style={{fontSize:11,fontWeight:600}}>Soltar aqui</p>
        </motion.div>
        {leads.length===0&&!dragOver&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 12px',color:'#323448',textAlign:'center'}}>
            <span style={{fontSize:20,marginBottom:6,opacity:0.3}}>📋</span>
            <p style={{fontSize:11}}>Sem leads</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Busca global ──────────────────────────────────────────────
function BuscaGlobal({ leads, onAbrir }) {
  const [busca, setBusca] = useState('')
  const [focado, setFocado] = useState(false)

  const resultados = busca.length > 1 ? leads.filter(l =>
    l.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    l.telefone?.includes(busca) ||
    l.produto?.toLowerCase().includes(busca.toLowerCase()) ||
    l.origem_lead?.toLowerCase().includes(busca.toLowerCase())
  ).slice(0, 8) : []

  const corStatus={Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}

  return (
    <div style={{position:'relative',width:280}}>
      <div style={{position:'relative'}}>
        <input value={busca} onChange={e=>setBusca(e.target.value)}
          onFocus={()=>setFocado(true)} onBlur={()=>setTimeout(()=>setFocado(false),200)}
          placeholder="Buscar em todos os leads..."
          style={{padding:'9px 14px 9px 36px',background:'rgba(255,255,255,0.05)',
            border:`1px solid ${focado?'rgba(240,180,41,0.45)':'rgba(255,255,255,0.08)'}`,
            borderRadius:10,color:'#f0f1ff',fontSize:13,outline:'none',
            width:'100%',fontFamily:'inherit',transition:'border-color 0.2s'}} />
        <span style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#4c5070',fontSize:14}}>🔍</span>
        {busca&&<motion.button initial={{opacity:0}} animate={{opacity:1}} onClick={()=>setBusca('')}
          style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:14}}>×</motion.button>}
      </div>

      <AnimatePresence>
        {focado && resultados.length > 0 && (
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}}
            transition={{duration:0.15}}
            style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:200,
              background:'rgba(8,8,14,0.98)',backdropFilter:'blur(32px)',
              border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,
              boxShadow:'0 16px 48px rgba(0,0,0,0.72)',overflow:'hidden'}}>
            {resultados.map((l,i)=>(
              <motion.div key={l.id} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                onClick={()=>{onAbrir(l);setBusca('');setFocado(false)}}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',
                  borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{width:8,height:8,borderRadius:'50%',background:corStatus[l.status]||'#4c5070',flexShrink:0}} />
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:'#f0f1ff',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.nome}</p>
                  <p style={{fontSize:11,color:'#4c5070',margin:0}}>{l.produto||'—'} {l.telefone?'· '+l.telefone:''}</p>
                </div>
                <span style={{fontSize:10.5,fontWeight:700,padding:'2px 7px',borderRadius:99,background:`${corStatus[l.status]||'#4c5070'}18`,color:corStatus[l.status]||'#4c5070',flexShrink:0}}>{l.status}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
        {focado && busca.length > 1 && resultados.length === 0 && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:200,
              background:'rgba(8,8,14,0.98)',backdropFilter:'blur(32px)',
              border:'1px solid rgba(255,255,255,0.10)',borderRadius:12,padding:'16px 14px',
              textAlign:'center',color:'#4c5070',fontSize:13,
              boxShadow:'0 16px 48px rgba(0,0,0,0.72)'}}>
            Nenhum lead encontrado para "{busca}"
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
export function PipelinePage({ perfil }) {
  const {leads,loading,criarLead,atualizarLead,deletarLead,moverLead,porStatus,carregar}=useLeads(perfil)
  const [drawerLead,setDrawerLead]=useState(null)
  const [novoDrawer,setNovoDrawer]=useState(false)
  const [viewMode,setViewMode]=useState('kanban')
  const [filtroStatus,setFiltroStatus]=useState('')
  const [wppLead,setWppLead]=useState(null)

  async function handleSalvar(form){
    if(novoDrawer) await criarLead(form)
    else await atualizarLead(drawerLead.id,form)
    setDrawerLead(null);setNovoDrawer(false)
  }
  async function handleDeletar(id){if(!confirm('Deletar este lead?'))return;await deletarLead(id);setDrawerLead(null)}

  const leadsVisiveis = filtroStatus ? leads.filter(l=>l.status===filtroStatus) : leads

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <motion.div style={{width:36,height:36,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429'}}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return(
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:12,flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff'}}>Pipeline</h1>
          <p style={{fontSize:13,color:'#4c5070',marginTop:3}}>
            {leads.length} leads
            {leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado).length>0&&(
              <motion.span animate={{opacity:[1,0.6,1]}} transition={{duration:2,repeat:Infinity}}
                style={{color:'#ff8c42',fontWeight:600}}> · {leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado).length} aguardando aprovação</motion.span>
            )}
          </p>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <BuscaGlobal leads={leads} onAbrir={setDrawerLead} />

          {/* Filtro rápido por status */}
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}
            style={{padding:'8px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:filtroStatus?'#f0f1ff':'#4c5070',fontSize:12.5,outline:'none',cursor:'pointer'}}>
            <option value="">Todos</option>
            {COLUNAS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <div style={{display:'flex',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden'}}>
            {[['kanban','⬛'],['lista','☰']].map(([v,l])=>(
              <motion.button key={v} onClick={()=>setViewMode(v)} whileTap={{scale:0.95}}
                style={{padding:'8px 14px',border:'none',background:viewMode===v?'rgba(240,180,41,0.14)':'transparent',color:viewMode===v?'#f0b429':'#4c5070',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>{l}</motion.button>
            ))}
          </div>

          <motion.button onClick={()=>setNovoDrawer(true)} whileHover={{y:-1,filter:'brightness(1.05)'}} whileTap={{scale:0.97}}
            style={{display:'flex',alignItems:'center',gap:7,padding:'9px 16px',background:'linear-gradient(180deg,rgba(240,180,41,0.18),rgba(240,180,41,0.09))',border:'1px solid rgba(240,180,41,0.28)',borderRadius:10,color:'#f0b429',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            + Novo Lead
          </motion.button>
        </div>
      </div>

      {/* Kanban */}
      {viewMode==='kanban'&&(
        <motion.div layout style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(200px,1fr))',gap:10,overflowX:'auto',paddingBottom:8}}>
          {COLUNAS.map(col=>(
            <KanbanCol key={col.id} coluna={col}
              leads={porStatus(col.id).filter(l=>!filtroStatus||l.status===filtroStatus||!filtroStatus)}
              onAbrir={setDrawerLead} onMover={moverLead} onAbrirWpp={setWppLead} perfil={perfil} />
          ))}
        </motion.div>
      )}

      {/* Lista */}
      {viewMode==='lista'&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          style={{background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={{background:'rgba(0,0,0,0.22)'}}>
              <tr>{['Nome','Produto','Valor','Status','Origem','Follow-up','WhatsApp'].map(h=>(
                <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {leadsVisiveis.map(lead=>{
                const cor={Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}[lead.status]||'#4c5070'
                return(
                  <motion.tr key={lead.id} initial={{opacity:0}} animate={{opacity:1}}
                    style={{borderBottom:'1px solid rgba(30,32,48,0.42)',transition:'background 0.15s',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.022)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px',color:'#f0f1ff',fontWeight:600}}>{lead.nome}</td>
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px',color:'#8f94b0',fontSize:13}}>{lead.produto||'—'}</td>
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px',color:'#00c896',fontWeight:700,fontSize:13}}>{parseFloat(lead.valor)>0?`R$ ${parseFloat(lead.valor).toLocaleString('pt-BR')}`:'—'}</td>
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px'}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,background:`${cor}18`,color:cor}}>{lead.status}</span>
                    </td>
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px',color:'#8f94b0',fontSize:12}}>{lead.origem_lead||'—'}</td>
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px',color: lead.data_followup?'#9d6fff':'#4c5070',fontSize:12}}>
                      {lead.data_followup?new Date(lead.data_followup+'T12:00:00').toLocaleDateString('pt-BR'):'—'}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      {lead.telefone&&<motion.button onClick={()=>setWppLead(lead)} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                        style={{padding:'5px 10px',background:'rgba(37,211,102,0.12)',border:'1px solid rgba(37,211,102,0.26)',borderRadius:7,color:'#25d366',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                        📱 WPP
                      </motion.button>}
                    </td>
                  </motion.tr>
                )
              })}
              {leadsVisiveis.length===0&&<tr><td colSpan={7} style={{padding:'40px',textAlign:'center',color:'#4c5070',fontSize:13}}>Nenhum lead encontrado</td></tr>}
            </tbody>
          </table>
        </motion.div>
      )}

      <AnimatePresence>
        {(drawerLead||novoDrawer)&&(
          <DrawerLead lead={novoDrawer?null:drawerLead} perfil={perfil}
            onFechar={()=>{setDrawerLead(null);setNovoDrawer(false)}}
            onSalvar={handleSalvar} onDeletar={handleDeletar} onRecarregar={carregar}
            onAbrirWpp={setWppLead} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {wppLead&&<ModalWpp lead={wppLead} onFechar={()=>setWppLead(null)} />}
      </AnimatePresence>
    </div>
  )
}