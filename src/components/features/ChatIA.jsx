import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabase'

async function getJWT() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || SUPABASE_KEY
}

export function ChatIA({ perfil }) {
  const [aberto,   setAberto]   = useState(false)
  const [msgs,     setMsgs]     = useState([
    { role:'ia', texto:`Olá ${perfil?.full_name?.split(' ')[0]||''}! 👋 Sou a IA do HAPSIS. Posso analisar seus leads, sugerir estratégias e responder dúvidas sobre vendas. Como posso ajudar?` }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const sugestoes = [
    'Como está minha taxa de conversão?',
    'Quais os principais motivos de perda?',
    'Sugestões para aumentar vendas',
    'Analise meu pipeline atual',
  ]
  const bottomRef = useRef()
  const inputRef  = useRef()

  useEffect(() => {
    if (aberto) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [aberto, msgs.length])

  async function enviar(texto) {
    const pergunta = texto || input.trim()
    if (!pergunta || loading) return
    setInput('')
    setMsgs(m => [...m, { role:'user', texto: pergunta }])
    setLoading(true)

    try {
      const jwt = await getJWT()
      let contexto = ''
      try {
        let q = supabase.from('leads').select('status,valor,produto,motivo_perda,origem_lead')
        if (perfil?.role === 'vendedor') q = q.eq('user_id', perfil.id)
        const { data } = await q
        const leads    = data || []
        const fechados = leads.filter(l => l.status==='Fechados').length
        const total    = leads.length
        const receita  = leads.filter(l=>l.status==='Fechados').reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
        const perdidos = leads.filter(l => l.status==='Perdidos')
        const motivos  = {}
        perdidos.forEach(l => { if(l.motivo_perda) motivos[l.motivo_perda]=(motivos[l.motivo_perda]||0)+1 })
        contexto = `Dados do pipeline: ${total} leads total, ${fechados} fechados, taxa conversão ${total>0?Math.round((fechados/total)*100):0}%, receita R$${receita.toLocaleString('pt-BR')}. Motivos de perda: ${Object.entries(motivos).map(([k,v])=>`${k}(${v})`).join(', ')||'nenhum registrado'}.`
      } catch {}

      const prompt = `Você é assistente do HAPSIS CRM. Seja objetivo e prático.\n\nContexto: ${contexto}\nPerfil: ${perfil?.role||'vendedor'}\n\nPergunta: ${pergunta}`
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/hapsis-ia`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${jwt}` },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      setMsgs(m => [...m, { role:'ia', texto: data.resposta || 'Sem resposta da IA no momento.' }])
    } catch {
      setMsgs(m => [...m, { role:'ia', texto: '❌ Erro ao conectar com a IA.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', bottom:28, right:28, zIndex:999 }}>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity:0, y:20, scale:0.95 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:20, scale:0.95 }}
            transition={{ type:'spring', stiffness:300, damping:28 }}
            style={{ position:'absolute', bottom:64, right:0, width:360, height:520,
              borderRadius:18, background:'rgba(8,8,14,0.97)', backdropFilter:'blur(48px)',
              border:'1px solid rgba(157,111,255,0.28)', boxShadow:'0 24px 80px rgba(0,0,0,0.72)',
              display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Header */}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)',
              display:'flex', justifyContent:'space-between', alignItems:'center',
              background:'linear-gradient(135deg,rgba(157,111,255,0.12),rgba(157,111,255,0.04))' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(157,111,255,0.20)',
                  border:'1px solid rgba(157,111,255,0.30)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  🤖
                </div>
                <div>
                  <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#f0f1ff', margin:0 }}>HAPSIS IA</p>
                  <p style={{ fontSize:10.5, color:'#9d6fff', margin:0 }}>Assistente de vendas</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setMsgs([{ role:'ia', texto:'Olá! Como posso ajudar?' }])}
                  style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:14 }} title="Limpar">🗑️</button>
                <button onClick={() => setAberto(false)}
                  style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:18 }}>×</button>
              </div>
            </div>

            {/* Mensagens */}
            <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                  style={{ display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-end':'flex-start' }}>
                  {m.role === 'ia' && (
                    <span style={{ fontSize:11, color:'#9d6fff', marginBottom:4, fontWeight:600 }}>🤖 HAPSIS IA</span>
                  )}
                  <div style={{ maxWidth:'88%', padding:'10px 13px',
                    borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
                    fontSize:13, lineHeight:1.55, color:'#f0f1ff',
                    background:m.role==='user'?'rgba(240,180,41,0.14)':'rgba(157,111,255,0.10)',
                    border:`1px solid ${m.role==='user'?'rgba(240,180,41,0.22)':'rgba(157,111,255,0.18)'}` }}>
                    <span dangerouslySetInnerHTML={{ __html: m.texto.replace(/\n/g,'<br/>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div style={{ display:'flex', alignItems:'center', gap:8, color:'#4c5070', fontSize:12 }}>
                  <div style={{ display:'flex', gap:4 }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#9d6fff' }}
                        animate={{ y:[0,-6,0] }} transition={{ duration:0.8, repeat:Infinity, delay:i*0.15 }} />
                    ))}
                  </div>
                  Digitando...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Sugestões */}
            {msgs.length <= 1 && (
              <div style={{ padding:'0 14px 10px', display:'flex', flexWrap:'wrap', gap:6 }}>
                {sugestoes.map(s => (
                  <button key={s} onClick={() => enviar(s)}
                    style={{ padding:'5px 10px', background:'rgba(157,111,255,0.08)', border:'1px solid rgba(157,111,255,0.22)',
                      borderRadius:8, color:'#9d6fff', fontSize:11, cursor:'pointer', fontWeight:500 }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && enviar()}
                placeholder="Pergunte sobre suas vendas..."
                style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:10, padding:'10px 14px', fontSize:13, color:'#f0f1ff', outline:'none', fontFamily:'inherit' }}
                onFocus={e => e.target.style.borderColor='rgba(157,111,255,0.40)'}
                onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.08)'} />
              <button onClick={() => enviar()} disabled={loading || !input.trim()}
                style={{ width:38, height:38, borderRadius:10, background:'rgba(157,111,255,0.20)',
                  border:'1px solid rgba(157,111,255,0.30)', color:'#9d6fff', cursor:'pointer',
                  fontSize:16, flexShrink:0, opacity:loading||!input.trim()?0.5:1,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante */}
      <motion.button
        whileHover={{ scale:1.08 }} whileTap={{ scale:0.95 }}
        onClick={() => setAberto(v => !v)}
        animate={{ boxShadow: aberto
          ? ['0 8px 32px rgba(157,111,255,0.60)','0 8px 32px rgba(157,111,255,0.60)']
          : ['0 8px 32px rgba(157,111,255,0.40)','0 8px 44px rgba(157,111,255,0.72)','0 8px 32px rgba(157,111,255,0.40)'] }}
        transition={{ duration:2.5, repeat: aberto ? 0 : Infinity }}
        style={{ width:54, height:54, borderRadius:'50%',
          background:'linear-gradient(135deg,rgba(157,111,255,0.90),rgba(124,58,237,0.85))',
          border:'1px solid rgba(255,255,255,0.22)', color:'#fff', fontSize:24,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
        <motion.span animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration:0.3 }}>
          {aberto ? '✕' : '🤖'}
        </motion.span>
        {!aberto && msgs.length > 1 && (
          <motion.span initial={{ scale:0 }} animate={{ scale:1 }}
            style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%',
              background:'#ff4d6a', border:'2px solid #060609', fontSize:10, fontWeight:800,
              color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {msgs.filter(m=>m.role==='ia').length}
          </motion.span>
        )}
      </motion.button>
    </div>
  )
}