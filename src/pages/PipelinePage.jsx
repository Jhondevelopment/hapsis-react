import { useState, useEffect, useRef, useCallback } from 'react'
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

// ── Máscaras de input ────────────────────────────────────────
function maskCPF(value) {
  const digits = value.replace(/\D/g,'').slice(0,11)
  let out = digits
  if (digits.length > 9) out = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`
  else if (digits.length > 6) out = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}`
  else if (digits.length > 3) out = `${digits.slice(0,3)}.${digits.slice(3,6)}`
  return out
}

function maskTelefone(value) {
  const digits = value.replace(/\D/g,'').slice(0,11)
  let out = digits
  if (digits.length > 10) out = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`
  else if (digits.length > 6) out = `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6,10)}`
  else if (digits.length > 2) out = `(${digits.slice(0,2)}) ${digits.slice(2)}`
  else if (digits.length > 0) out = `(${digits}`
  return out
}

// Formata número conforme digita: 1234567 -> 12.345,67
function maskValor(value) {
  const digits = value.replace(/\D/g,'')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

// Converte string formatada "12.345,67" para número 12345.67 (para salvar no banco)
function valorParaNumero(formatted) {
  if (!formatted) return null
  const clean = formatted.replace(/\./g,'').replace(',','.')
  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

// Converte número do banco (12345.67) para string formatada "12.345,67"
function numeroParaValor(num) {
  if (num === null || num === undefined || num === '') return ''
  const n = parseFloat(num)
  if (isNaN(n)) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 })
}



// ── Dropdown customizado (substitui <select> nativo feio) ──────
function SelectCustom({ value, onChange, options, placeholder='Selecionar...', renderOption, accentColor='#f0b429' }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const selecionado = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <button type="button" onClick={() => setAberto(a => !a)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(255,255,255,0.035)', border:`1px solid ${aberto?accentColor+'73':'rgba(255,255,255,0.08)'}`,
          borderRadius:10, padding:'11px 15px', fontSize:14, color: selecionado?'#f0f1ff':'#4c5070',
          cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'border-color 0.2s' }}>
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {selecionado ? (renderOption ? renderOption(selecionado) : selecionado.label) : placeholder}
        </span>
        <motion.span animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration:0.15 }}
          style={{ color:'#4c5070', fontSize:11, marginLeft:8, flexShrink:0 }}>▼</motion.span>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ opacity:0, y:-6, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.98 }}
            transition={{ duration:0.15 }}
            style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:300,
              background:'rgba(10,11,18,0.99)', backdropFilter:'blur(32px)',
              border:'1px solid rgba(255,255,255,0.10)', borderRadius:12,
              boxShadow:'0 16px 48px rgba(0,0,0,0.72)', overflow:'hidden', maxHeight:280, overflowY:'auto' }}>
            {options.map((opt,i) => (
              <div key={opt.value || i} onClick={() => { onChange(opt.value); setAberto(false) }}
                style={{ padding:'11px 15px', fontSize:13.5, cursor:'pointer',
                  color: opt.value===value ? accentColor : '#d0d3f0',
                  background: opt.value===value ? `${accentColor}14` : 'transparent',
                  borderBottom: i<options.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition:'background 0.1s' }}
                onMouseEnter={e=>{ if(opt.value!==value) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                onMouseLeave={e=>{ if(opt.value!==value) e.currentTarget.style.background='transparent' }}>
                {renderOption ? renderOption(opt) : opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Date picker customizado (substitui <input type="date"> ilegível) ──
function DatePickerCustom({ value, onChange, accentColor='#f0b429' }) {
  const [aberto, setAberto] = useState(false)
  const [mesAtual, setMesAtual] = useState(() => value ? new Date(value+'T12:00:00') : new Date())
  const ref = useRef(null)

  useEffect(() => {
    function fechar(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const diasSemana = ['D','S','T','Q','Q','S','S']

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes = new Date(ano, mes+1, 0).getDate()
  const hoje = new Date(); hoje.setHours(0,0,0,0)

  const dataSelecionada = value ? new Date(value+'T12:00:00') : null

  function selecionarDia(dia) {
    const d = new Date(ano, mes, dia)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    onChange(iso)
    setAberto(false)
  }

  function mudarMes(delta) {
    setMesAtual(new Date(ano, mes+delta, 1))
  }

  const celulas = []
  for (let i=0; i<primeiroDia; i++) celulas.push(null)
  for (let d=1; d<=diasNoMes; d++) celulas.push(d)

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <button type="button" onClick={() => setAberto(a => !a)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(255,255,255,0.035)', border:`1px solid ${aberto?accentColor+'73':'rgba(255,255,255,0.08)'}`,
          borderRadius:10, padding:'11px 15px', fontSize:14, color: value?'#f0f1ff':'#4c5070',
          cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'border-color 0.2s' }}>
        <span>{value ? new Date(value+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : 'Selecionar data'}</span>
        <span style={{ color:accentColor, fontSize:14 }}>📅</span>
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ opacity:0, y:-6, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.98 }}
            transition={{ duration:0.15 }}
            style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:300, width:280,
              background:'rgba(10,11,18,0.99)', backdropFilter:'blur(32px)',
              border:'1px solid rgba(255,255,255,0.10)', borderRadius:14,
              boxShadow:'0 16px 48px rgba(0,0,0,0.72)', padding:16 }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <button type="button" onClick={()=>mudarMes(-1)}
                style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#8f94b0', cursor:'pointer', fontSize:13 }}>‹</button>
              <span style={{ fontSize:13.5, fontWeight:700, color:'#f0f1ff' }}>{meses[mes]} {ano}</span>
              <button type="button" onClick={()=>mudarMes(1)}
                style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#8f94b0', cursor:'pointer', fontSize:13 }}>›</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
              {diasSemana.map((d,i) => (
                <div key={i} style={{ textAlign:'center', fontSize:10.5, fontWeight:700, color:'#4c5070', padding:'4px 0' }}>{d}</div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {celulas.map((dia,i) => {
                if (!dia) return <div key={i} />
                const d = new Date(ano, mes, dia); d.setHours(0,0,0,0)
                const isHoje = d.getTime()===hoje.getTime()
                const isSelecionado = dataSelecionada && d.getTime()===new Date(dataSelecionada.getFullYear(),dataSelecionada.getMonth(),dataSelecionada.getDate()).getTime()
                return (
                  <button key={i} type="button" onClick={()=>selecionarDia(dia)}
                    style={{ aspectRatio:'1', borderRadius:8, border:'none', cursor:'pointer', fontSize:12.5,
                      fontWeight: isSelecionado ? 700 : 500,
                      background: isSelecionado ? accentColor : isHoje ? `${accentColor}1c` : 'transparent',
                      color: isSelecionado ? '#0a0a0e' : isHoje ? accentColor : '#d0d3f0',
                      transition:'background 0.1s' }}
                    onMouseEnter={e=>{ if(!isSelecionado) e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
                    onMouseLeave={e=>{ if(!isSelecionado) e.currentTarget.style.background = isHoje ? `${accentColor}1c` : 'transparent' }}>
                    {dia}
                  </button>
                )
              })}
            </div>

            <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <button type="button" onClick={()=>{ onChange(''); setAberto(false) }}
                style={{ flex:1, padding:'7px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#8f94b0', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                Limpar
              </button>
              <button type="button" onClick={()=>{
                const t = new Date()
                const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
                onChange(iso); setMesAtual(t); setAberto(false)
              }}
                style={{ flex:1, padding:'7px', borderRadius:8, background:`${accentColor}18`, border:`1px solid ${accentColor}38`, color:accentColor, fontSize:11.5, fontWeight:700, cursor:'pointer' }}>
                Hoje
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
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
    nome:lead?.nome||'', telefone:lead?.telefone?maskTelefone(lead.telefone):'', cpf:lead?.cpf?maskCPF(lead.cpf):'', produto:lead?.produto||'',
    valor:lead?.valor?numeroParaValor(lead.valor):'', status:lead?.status||'Novos', origem_lead:lead?.origem_lead||'',
    forma_pagamento:lead?.forma_pagamento||'', data_followup:lead?.data_followup||'',
    observacoes:lead?.observacoes||'', motivo_perda:lead?.motivo_perda||'',
    is_recorrente:lead?.is_recorrente||false,
  })
  const [saving,setSaving] = useState(false)
  const [msg,setMsg] = useState(null)
  const [confirm,setConfirm] = useState(null)
  const [produtos,setProdutos] = useState([])
  const fileCompRef=useRef(); const fileContRef=useRef()

  // Carregar produtos cadastrados pelo gestor
  useEffect(()=>{
    supabase.from('produtos').select('id,nome,valor,taxa_comissao').order('nome')
      .then(({data,error})=>{
        if(error) { console.error('Erro ao carregar produtos:', error); return }
        setProdutos(data||[])
      })
  },[])

  function set(c,v){setForm(f=>({...f,[c]:v}))}
  function showMsg(type,text){setMsg({type,text});setTimeout(()=>setMsg(null),3000)}

  function sanitizar(f){
    const c={...f}
    if(!c.data_followup)c.data_followup=null
    c.valor = c.valor ? valorParaNumero(c.valor) : null
    c.cpf   = c.cpf ? c.cpf.replace(/\D/g,'') : null
    c.telefone = c.telefone ? c.telefone.replace(/\D/g,'') : null
    ;['motivo_perda','origem_lead','forma_pagamento','produto','observacoes']
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
                  {/* Nome */}
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Nome completo *</label>
                    <input type="text" value={form.nome||''} onChange={e=>set('nome',e.target.value)} placeholder="Ex: João Silva"
                      style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit',transition:'border-color 0.2s'}}
                      onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'}
                      onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                  </div>

                  {/* Telefone + CPF lado a lado */}
                  <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:12,marginBottom:14}}>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Telefone / WhatsApp</label>
                      <input type="tel" inputMode="numeric" value={form.telefone||''} onChange={e=>set('telefone',maskTelefone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15}
                        style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit',transition:'border-color 0.2s'}}
                        onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'}
                        onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>CPF</label>
                      <input type="text" inputMode="numeric" value={form.cpf||''} onChange={e=>set('cpf',maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14}
                        style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit',transition:'border-color 0.2s',fontVariantNumeric:'tabular-nums'}}
                        onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'}
                        onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                    </div>
                  </div>

                  {/* Produto — Select customizado */}
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>
                      Produto / Serviço
                    </label>
                    {produtos.length > 0 && (
                      <>
                        <SelectCustom
                          value={form.produto||''}
                          placeholder="— Selecionar produto —"
                          accentColor="#f0b429"
                          onChange={(nome)=>{
                            set('produto', nome)
                            const prod = produtos.find(p=>p.nome===nome)
                            if(prod?.valor) set('valor', numeroParaValor(prod.valor))
                          }}
                          options={produtos.map(p=>({
                            value: p.nome,
                            label: `${p.nome}${p.valor ? ` — R$ ${parseFloat(p.valor).toLocaleString('pt-BR')}` : ''}${p.taxa_comissao ? ` (${p.taxa_comissao}% comissão)` : ''}`
                          }))}
                        />

                        {/* Info do produto selecionado + painel de controle de desconto */}
                        {form.produto && (() => {
                          const prod = produtos.find(p=>p.nome===form.produto)
                          if (!prod) return null
                          const precoOriginal = parseFloat(prod.valor)||0
                          const valorAtual    = valorParaNumero(form.valor)||0
                          const temDesconto   = precoOriginal > 0 && valorAtual > 0 && valorAtual < precoOriginal
                          const pctDesconto   = temDesconto ? Math.round(((precoOriginal-valorAtual)/precoOriginal)*100) : 0
                          const acimaTabela   = precoOriginal > 0 && valorAtual > precoOriginal
                          return (
                            <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
                              <div style={{padding:'9px 12px',borderRadius:9,background:'rgba(240,180,41,0.06)',border:'1px solid rgba(240,180,41,0.16)',display:'flex',gap:14,flexWrap:'wrap',alignItems:'center'}}>
                                {prod.valor && <span style={{fontSize:11.5,color:'#00c896',fontWeight:700}}>💰 Tabela: R$ {parseFloat(prod.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>}
                                {prod.taxa_comissao && <span style={{fontSize:11.5,color:'#f0b429',fontWeight:700}}>💸 {prod.taxa_comissao}% comissão</span>}
                              </div>

                              {/* Painel de controle de desconto — visível para gestor */}
                              {isGestor && temDesconto && (
                                <div style={{padding:'11px 13px',borderRadius:10,background:'rgba(255,140,66,0.08)',border:'1px solid rgba(255,140,66,0.30)'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                                    <span style={{fontSize:15}}>⚠️</span>
                                    <p style={{fontSize:12,fontWeight:700,color:'#ff8c42',margin:0}}>Desconto aplicado pelo vendedor</p>
                                    <span style={{marginLeft:'auto',fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:800,color:'#ff8c42'}}>{pctDesconto}%</span>
                                  </div>
                                  <div style={{height:6,borderRadius:6,background:'rgba(0,0,0,0.35)',overflow:'hidden',marginBottom:8}}>
                                    <motion.div initial={{width:0}} animate={{width:`${Math.min(pctDesconto,100)}%`}}
                                      transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
                                      style={{height:'100%',background:pctDesconto>30?'linear-gradient(90deg,#ff4d6a,#ff8c42)':'linear-gradient(90deg,#ff8c42,#f0b429)',borderRadius:6}} />
                                  </div>
                                  <p style={{fontSize:11,color:'#8f94b0',margin:0}}>
                                    R$ {precoOriginal.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} → R$ {valorAtual.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
                                  </p>
                                  {pctDesconto>30&&(
                                    <p style={{fontSize:10.5,color:'#ff4d6a',margin:'5px 0 0',fontWeight:600}}>⚡ Desconto acima de 30% — recomenda-se análise antes de aprovar.</p>
                                  )}
                                </div>
                              )}

                              {/* Valor acima da tabela — informativo */}
                              {acimaTabela && (
                                <div style={{padding:'7px 11px',borderRadius:8,background:'rgba(0,200,150,0.07)',border:'1px solid rgba(0,200,150,0.18)'}}>
                                  <p style={{fontSize:11,color:'#00c896',margin:0}}>📈 Valor acima do preço de tabela (upsell)</p>
                                </div>
                              )}

                              {/* Confirmação para vendedor de que valor foi reduzido */}
                              {!isGestor && temDesconto && (
                                <div style={{padding:'7px 11px',borderRadius:8,background:'rgba(77,159,255,0.08)',border:'1px solid rgba(77,159,255,0.20)'}}>
                                  <p style={{fontSize:11,color:'#4d9fff',margin:0}}>ℹ️ Desconto de {pctDesconto}% — sujeito a aprovação do gestor</p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>

                  {/* Valor — máscara monetária em tempo real */}
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Valor</label>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:15,top:'50%',transform:'translateY(-50%)',color:'#00c896',fontWeight:700,fontSize:14,pointerEvents:'none'}}>R$</span>
                      <input type="text" inputMode="numeric" value={form.valor||''} onChange={e=>set('valor',maskValor(e.target.value))} placeholder="0,00"
                        style={{width:'100%',background:'rgba(0,200,150,0.04)',border:'1px solid rgba(0,200,150,0.16)',borderRadius:10,padding:'11px 15px 11px 40px',fontSize:15,fontWeight:700,color:'#00c896',outline:'none',fontFamily:'inherit',transition:'border-color 0.2s',fontVariantNumeric:'tabular-nums'}}
                        onFocus={e=>e.target.style.borderColor='rgba(0,200,150,0.45)'}
                        onBlur={e=>e.target.style.borderColor='rgba(0,200,150,0.16)'} />
                    </div>
                  </div>

                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Data de Follow-up</label>
                    <DatePickerCustom value={form.data_followup||''} onChange={(v)=>set('data_followup',v||'')} accentColor="#9d6fff" />
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
                      <SelectCustom
                        value={form.status}
                        onChange={(v)=>set('status',v)}
                        accentColor="#4d9fff"
                        options={COLUNAS.filter(col=>col.id!=='Perdidos').map(c=>({value:c.id,label:c.label}))}
                      />
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
                      <SelectCustom
                        value={form.origem_lead||''}
                        onChange={(v)=>set('origem_lead',v)}
                        placeholder="Selecionar"
                        accentColor="#9d6fff"
                        options={ORIGENS.map(o=>({value:o,label:o}))}
                      />
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:7}}>Pagamento</label>
                      <SelectCustom
                        value={form.forma_pagamento||''}
                        onChange={(v)=>set('forma_pagamento',v)}
                        placeholder="Selecionar"
                        accentColor="#00c896"
                        options={PAGAMENTOS.map(p=>({value:p,label:p}))}
                      />
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
                  {/* Inadimplência — gestor pode marcar em qualquer momento */}
                  {lead && isFechado && !lead.is_inadimplente && (
                    <div style={{padding:16,borderRadius:12,background:'rgba(255,77,106,0.04)',border:'1px solid rgba(255,77,106,0.18)'}}>
                      <h4 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,color:'#ff4d6a',marginBottom:12}}>⚠️ Inadimplência</h4>
                      <div style={{display:'flex',gap:8}}>
                        <motion.button onClick={()=>setConfirm({tipo:'atraso'})} whileHover={{y:-1}} whileTap={{scale:0.98}}
                          style={{padding:'9px 18px',background:'rgba(255,140,66,0.12)',border:'1px solid rgba(255,140,66,0.26)',borderRadius:8,color:'#ff8c42',fontWeight:700,fontSize:12,cursor:'pointer'}}>🕐 Sinalizar Atraso</motion.button>
                        <motion.button onClick={()=>setConfirm({tipo:'inadimplente'})} whileHover={{y:-1}} whileTap={{scale:0.98}}
                          style={{padding:'9px 18px',background:'rgba(255,77,106,0.12)',border:'1px solid rgba(255,77,106,0.26)',borderRadius:8,color:'#ff4d6a',fontWeight:700,fontSize:12,cursor:'pointer'}}>⚠️ Marcar Inadimplente</motion.button>
                      </div>
                    </div>
                  )}
                  {lead && lead.is_inadimplente && (
                    <div style={{padding:12,borderRadius:10,background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.22)',display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:16}}>⚠️</span>
                      <span style={{fontSize:13,color:'#ff4d6a',fontWeight:600}}>Cliente marcado como inadimplente</span>
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

// ── Lead card — design premium com avatar e hierarquia visual ──
function LeadCard({ lead, onAbrir, onAbrirWpp, perfil, corColuna }) {
  const cor = {Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}[lead.status]||corColuna||'#4c5070'

  const aprovado  = lead.status==='Fechados' && lead.aprovado===true  && !lead.estornado
  const pendente  = lead.status==='Fechados' && (lead.aprovado===false||lead.aprovado===null) && !lead.estornado
  const bloqueado = lead.status==='Fechados' || lead.status==='Perdidos'

  const inicial = (lead.nome||'?').trim().charAt(0).toUpperCase()

  return(
    <motion.div
      whileHover={!bloqueado ? { y:-3 } : {}}
      transition={{ type:'spring', stiffness:400, damping:28 }}
      draggable={!bloqueado}
      onDragStart={e=>{
        if(bloqueado){e.preventDefault();return}
        e.dataTransfer.setData('leadId',String(lead.id))
        e.dataTransfer.effectAllowed='move'
      }}
      style={{position:'relative',borderRadius:13,padding:'13px 14px 13px 16px',
        cursor: aprovado ? 'default' : bloqueado ? 'not-allowed' : 'grab',
        opacity: pendente ? 0.55 : 1,
        filter: pendente ? 'grayscale(55%) brightness(0.78)' : 'none',
        background: pendente
          ? 'rgba(13,14,20,0.88)'
          : 'linear-gradient(155deg,rgba(255,255,255,0.045) 0%,rgba(18,19,28,0.85) 60%)',
        backdropFilter:'blur(18px)',
        border: aprovado
          ? '1px solid rgba(0,200,150,0.24)'
          : pendente
          ? '1px solid rgba(255,255,255,0.04)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: aprovado ? '0 2px 12px rgba(0,200,150,0.08)' : '0 2px 8px rgba(0,0,0,0.18)',
        marginBottom:9,
        transition:'border-color 0.2s,box-shadow 0.25s,opacity 0.2s',
        userSelect:'none',overflow:'hidden'}}>

      {/* Barra lateral de status — gradiente vertical */}
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,
        background: pendente ? '#4a4d5e' : `linear-gradient(180deg,${cor},${cor}77)`,
        opacity: pendente ? 0.5 : 1}} />

      {/* Badge de cadeado se aprovado */}
      {aprovado && (
        <div style={{position:'absolute',top:10,right:10,fontSize:11,opacity:0.55}} title="Venda aprovada — imóvel">🔒</div>
      )}

      <div onClick={()=>onAbrir(lead)} style={{cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
          {/* Avatar com inicial */}
          <div style={{width:30,height:30,borderRadius:9,flexShrink:0,
            background: pendente ? 'rgba(255,255,255,0.04)' : `${cor}1c`,
            border: `1px solid ${pendente ? 'rgba(255,255,255,0.06)' : cor+'38'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,
            color: pendente ? '#454860' : cor}}>
            {inicial}
          </div>

          <div style={{flex:1,minWidth:0,paddingRight:aprovado?16:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              <span style={{fontWeight:700,fontSize:13.5,color: pendente?'#6a7080':'#f8f9ff',
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.nome}</span>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
              {lead.comprovante_url&&<span style={{fontSize:10}} title="Comprovante">💳</span>}
              {lead.is_inadimplente&&<span style={{fontSize:10}} title="Inadimplente">⚠️</span>}
              {lead.estornado&&<span style={{fontSize:10}} title="Estornado">↩️</span>}
              {pendente&&(
                <motion.span animate={{opacity:[1,0.4,1]}} transition={{duration:1.5,repeat:Infinity}}
                  style={{fontSize:8.5,fontWeight:800,letterSpacing:'0.4px',background:'rgba(255,140,66,0.16)',color:'#ff8c42',padding:'1.5px 6px',borderRadius:4,border:'1px solid rgba(255,140,66,0.28)'}}>
                  PENDENTE
                </motion.span>
              )}
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:5,fontSize:11.5,
          color: pendente?'#454860':'#8f94b0',marginLeft:40}}>
          {lead.produto&&(
            <span style={{display:'flex',alignItems:'center',gap:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              <span style={{opacity:0.6,fontSize:10}}>◆</span>{lead.produto}
            </span>
          )}
          {parseFloat(lead.valor)>0&&(
            <span style={{display:'flex',alignItems:'center',gap:5,color: pendente?'#3a6b56':'#00c896',fontWeight:800,fontSize:13,fontVariantNumeric:'tabular-nums',fontFamily:'Syne,sans-serif'}}>
              R$ {parseFloat(lead.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
            </span>
          )}
          {lead.data_followup&&(
            <span style={{display:'flex',alignItems:'center',gap:5,color: pendente?'#4a4460':'#9d6fff',fontSize:10.5}}>
              <span style={{opacity:0.7,fontSize:9}}>●</span>{new Date(lead.data_followup+'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Botão WhatsApp flutuante */}
      {lead.telefone&&(
        <motion.button
          onClick={e=>{e.stopPropagation();onAbrirWpp(lead)}}
          whileHover={{scale:1.1,background:'rgba(37,211,102,0.24)'}}
          whileTap={{scale:0.9}}
          title={`WhatsApp: ${lead.telefone}`}
          style={{position:'absolute',bottom:11,right:11,
            width:27,height:27,borderRadius:'50%',
            background:'rgba(37,211,102,0.12)',
            border:'1px solid rgba(37,211,102,0.26)',
            display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',transition:'all 0.15s',fontSize:13}}>
          📱
        </motion.button>
      )}
      {lead.telefone&&<div style={{height:6}} />}
    </motion.div>
  )
}

// ── Kanban coluna — identidade visual premium ──────────────────
function KanbanCol({coluna,leads,onAbrir,onMover,onAbrirWpp,perfil}){
  const [dragOver,setDragOver]=useState(false)
  const handleDragOver=useCallback(e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDragOver(true)},[])
  const handleDragLeave=useCallback(e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)},[])
  const handleDrop=useCallback(e=>{
    e.preventDefault();e.stopPropagation();setDragOver(false)
    const id=e.dataTransfer.getData('leadId');if(id)onMover(id,coluna.id)
  },[coluna.id,onMover])

  const valorTotal = leads.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)

  return(
    <motion.div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      animate={{
        borderColor:dragOver?`${coluna.cor}77`:'rgba(255,255,255,0.06)',
        boxShadow:dragOver?`0 0 0 1px ${coluna.cor}44, 0 12px 32px ${coluna.cor}1a`:'0 4px 16px rgba(0,0,0,0.25)',
      }}
      transition={{duration:0.18}}
      style={{borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'calc(100vh - 230px)',
        background:`linear-gradient(180deg,${coluna.cor}0d 0%,rgba(10,11,18,0.96) 38%)`,
        backdropFilter:'blur(28px)',border:'1px solid rgba(255,255,255,0.06)',position:'relative'}}>

      {/* Linha de destaque no topo */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,
        background:`linear-gradient(90deg,transparent,${coluna.cor},transparent)`,opacity:0.7}} />

      <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',
        background:dragOver?`${coluna.cor}10`:'rgba(0,0,0,0.15)',transition:'background 0.15s'}}>
        <motion.div animate={{boxShadow:dragOver?`0 0 14px ${coluna.cor}`:`0 0 7px ${coluna.cor}77`}}
          style={{width:9,height:9,borderRadius:'50%',background:coluna.cor,flexShrink:0}} />
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#f0f1ff',display:'block'}}>{coluna.label}</span>
          {valorTotal > 0 && (
            <span style={{fontSize:10.5,color:coluna.cor,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>
              R$ {valorTotal.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0})}
            </span>
          )}
        </div>
        <span style={{background:`${coluna.cor}14`,border:`1px solid ${coluna.cor}33`,borderRadius:99,padding:'3px 9px',fontSize:11,fontWeight:800,color:coluna.cor,flexShrink:0}}>{leads.length}</span>
      </div>

      <div style={{padding:9,flex:1,overflowY:'auto',minHeight:100,background:dragOver?`${coluna.cor}05`:'transparent',transition:'background 0.15s'}}>
        <AnimatePresence>
          {leads.map(l=><LeadCard key={l.id} lead={l} onAbrir={onAbrir} onAbrirWpp={onAbrirWpp} perfil={perfil} corColuna={coluna.cor} />)}
        </AnimatePresence>
        <motion.div animate={{opacity:dragOver?1:0,scale:dragOver?1:0.92}} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px 12px',color:coluna.cor,textAlign:'center',pointerEvents:'none'}}>
          <span style={{fontSize:22,marginBottom:5}}>⬇</span>
          <p style={{fontSize:11.5,fontWeight:700}}>Soltar aqui</p>
        </motion.div>
        {leads.length===0&&!dragOver&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'28px 12px',color:'#323448',textAlign:'center'}}>
            <span style={{fontSize:22,marginBottom:7,opacity:0.25}}>○</span>
            <p style={{fontSize:11.5}}>Sem leads</p>
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
            style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:1000,
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
            style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:1000,
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
export function PipelinePage({ perfil, leadParaAbrir, onLeadAberto }) {
  const {leads,loading,criarLead,atualizarLead,deletarLead,moverLead,porStatus,carregar}=useLeads(perfil)
  const [drawerLead,setDrawerLead]=useState(null)
  const [novoDrawer,setNovoDrawer]=useState(false)
  const [viewMode,setViewMode]=useState('kanban')
  const [filtroStatus,setFiltroStatus]=useState('')
  const [wppLead,setWppLead]=useState(null)

  // Abrir automaticamente um lead específico quando vier da busca do Topbar
  useEffect(() => {
    if (!leadParaAbrir || loading) return
    const lead = leads.find(l => String(l.id) === String(leadParaAbrir))
    if (lead) {
      setDrawerLead(lead)
      onLeadAberto?.()
    }
  }, [leadParaAbrir, leads, loading, onLeadAberto])

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
      {/* Header — premium com glow ambiente */}
      <div style={{position:'relative',marginBottom:24,padding:'22px 26px',borderRadius:20,
        background:'linear-gradient(135deg,rgba(240,180,41,0.07) 0%,rgba(10,11,18,0.96) 55%)',
        border:'1px solid rgba(240,180,41,0.16)'}}>
        {/* Orb decorativo animado — contido em wrapper próprio com overflow hidden */}
        <div style={{position:'absolute',inset:0,overflow:'hidden',borderRadius:20,pointerEvents:'none',zIndex:0}}>
          <motion.div animate={{x:[0,30,0],y:[0,-15,0]}} transition={{duration:12,repeat:Infinity,ease:'easeInOut'}}
            style={{position:'absolute',top:-60,right:-40,width:220,height:220,borderRadius:'50%',
            background:'radial-gradient(circle,rgba(240,180,41,0.18),transparent 70%)',filter:'blur(20px)'}} />
          <motion.div animate={{x:[0,-20,0],y:[0,20,0]}} transition={{duration:14,repeat:Infinity,ease:'easeInOut'}}
            style={{position:'absolute',bottom:-50,left:'30%',width:180,height:180,borderRadius:'50%',
            background:'radial-gradient(circle,rgba(157,111,255,0.10),transparent 70%)',filter:'blur(24px)'}} />
        </div>

        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
              <div style={{width:6,height:24,borderRadius:4,background:'linear-gradient(180deg,#f0b429,#c9960e)',boxShadow:'0 0 16px rgba(240,180,41,0.5)'}} />
              <h1 style={{fontFamily:'Syne,sans-serif',fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-0.3px',margin:0}}>Pipeline</h1>
            </div>
            <p style={{fontSize:13,color:'#8f94b0',marginLeft:16,letterSpacing:'0.2px'}}>
              <span style={{color:'#f0f1ff',fontWeight:700}}>{leads.length}</span> leads no funil
              {leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado).length>0&&(
                <motion.span animate={{opacity:[1,0.5,1]}} transition={{duration:2,repeat:Infinity}}
                  style={{color:'#ff8c42',fontWeight:700,marginLeft:6}}>
                  · {leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado).length} aguardando aprovação
                </motion.span>
              )}
            </p>
          </div>

          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <BuscaGlobal leads={leads} onAbrir={setDrawerLead} />

            <div style={{ width:170 }}>
              <SelectCustom
                value={filtroStatus}
                onChange={setFiltroStatus}
                placeholder="Todos os status"
                accentColor="#f0b429"
                options={COLUNAS.map(c=>({value:c.id,label:c.label}))}
              />
            </div>

            <div style={{display:'flex',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:11,overflow:'hidden',padding:2}}>
              {[['kanban','⬛'],['lista','☰']].map(([v,l])=>(
                <motion.button key={v} onClick={()=>setViewMode(v)} whileTap={{scale:0.95}}
                  style={{padding:'7px 14px',border:'none',borderRadius:9,background:viewMode===v?'linear-gradient(180deg,rgba(240,180,41,0.22),rgba(240,180,41,0.10))':'transparent',color:viewMode===v?'#f0b429':'#4c5070',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>{l}</motion.button>
              ))}
            </div>

            <motion.button onClick={()=>setNovoDrawer(true)} whileHover={{y:-2,boxShadow:'0 8px 24px rgba(240,180,41,0.35)'}} whileTap={{scale:0.97}}
              style={{display:'flex',alignItems:'center',gap:8,padding:'10px 20px',
                background:'linear-gradient(160deg,#f0b429,#c9960e)',
                border:'1px solid rgba(255,255,255,0.30)',borderRadius:11,
                color:'#0a0a0e',fontWeight:800,fontSize:13.5,cursor:'pointer',
                fontFamily:'Syne,sans-serif',boxShadow:'0 4px 16px rgba(240,180,41,0.20)',
                transition:'box-shadow 0.25s'}}>
              <span style={{fontSize:16}}>+</span> Novo Lead
            </motion.button>
          </div>
        </div>
      </div>

      {/* Kanban */}
      {viewMode==='kanban'&&(
        <motion.div layout style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(210px,1fr))',gap:12,overflowX:'auto',paddingBottom:10}}>
          {COLUNAS.map((col,i)=>(
            <motion.div key={col.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05,duration:0.3}}>
              <KanbanCol coluna={col}
                leads={porStatus(col.id).filter(l=>!filtroStatus||l.status===filtroStatus||!filtroStatus)}
                onAbrir={setDrawerLead} onMover={moverLead} onAbrirWpp={setWppLead} perfil={perfil} />
            </motion.div>
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
                    <td onClick={()=>setDrawerLead(lead)} style={{padding:'12px 14px',color:'#00c896',fontWeight:700,fontSize:13,fontVariantNumeric:'tabular-nums'}}>{parseFloat(lead.valor)>0?`R$ ${parseFloat(lead.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</td>
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