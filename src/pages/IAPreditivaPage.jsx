import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase'
import { useLeads } from '../hooks/useLeads'

const ANALISES = [
  { id:'funil',       icon:'📊', titulo:'Análise do Funil',       desc:'Analisa conversão entre etapas' },
  { id:'performance', icon:'🏆', titulo:'Performance da Equipe',  desc:'Ranking e comparativos' },
  { id:'previsao',    icon:'🔮', titulo:'Previsão de Receita',     desc:'Projeção baseada em dados' },
  { id:'objecoes',    icon:'🎯', titulo:'Objeções Frequentes',     desc:'Padrões nas perdas' },
  { id:'melhores',    icon:'⚡', titulo:'Melhores Horários',       desc:'Quando agir para fechar mais' },
]

export function IAPreditivaPage({ perfil }) {
  const { leads } = useLeads(perfil)
  const [resultado,    setResultado]    = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [tituloAtual,  setTituloAtual]  = useState('')
  const [chatAberto,   setChatAberto]   = useState(false)
  const [chatMsgs,     setChatMsgs]     = useState([{ role:'ia', texto:'Olá! Sou a IA do HAPSIS. Como posso ajudar?' }])
  const [chatInput,    setChatInput]    = useState('')
  const [chatLoading,  setChatLoading]  = useState(false)

  async function getJWT() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || SUPABASE_KEY
  }

  function montarContexto() {
    const total    = leads.length
    const porStatus = {}
    leads.forEach(l => { porStatus[l.status] = (porStatus[l.status]||0) + 1 })
    const receita  = leads.filter(l => l.status==='Fechados' && l.aprovado && !l.estornado).reduce((s,l) => s+(parseFloat(l.valor)||0), 0)
    return `Total de leads: ${total}\nPor status: ${JSON.stringify(porStatus)}\nReceita: R$ ${receita.toLocaleString('pt-BR')}\nPerfil: ${perfil?.role}`
  }

  async function rodarAnalise(tipo) {
    setLoading(true)
    const analise = ANALISES.find(a => a.id === tipo)
    setTituloAtual(analise?.titulo || '')
    setResultado(null)
    try {
      const jwt = await getJWT()
      const ctx = montarContexto()
      const prompts = {
        funil:       `Analise este funil de vendas e dê insights acionáveis:\n\n${ctx}`,
        performance: `Analise a performance desta equipe de vendas:\n\n${ctx}`,
        previsao:    `Faça uma previsão de receita para os próximos 30 dias:\n\n${ctx}`,
        objecoes:    `Identifique as principais objeções nos leads perdidos:\n\n${ctx}`,
        melhores:    `Identifique os melhores momentos e estratégias para fechar:\n\n${ctx}`,
      }
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/hapsis-ia`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${jwt}` },
        body: JSON.stringify({ prompt: prompts[tipo] })
      })
      const data = await res.json()
      setResultado(data.resposta || data.erro || 'Sem resposta.')
    } catch {
      setResultado('Erro ao conectar com a IA.')
    } finally {
      setLoading(false)
    }
  }

  async function enviarChat() {
    if (!chatInput.trim() || chatLoading) return
    const pergunta = chatInput.trim()
    setChatInput('')
    setChatMsgs(m => [...m, { role:'user', texto: pergunta }])
    setChatLoading(true)
    try {
      const jwt    = await getJWT()
      const prompt = `Contexto:\n${montarContexto()}\n\nPergunta: ${pergunta}`
      const res    = await fetch(`${SUPABASE_URL}/functions/v1/hapsis-ia`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${jwt}` },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      setChatMsgs(m => [...m, { role:'ia', texto: data.resposta || 'Sem resposta.' }])
    } catch {
      setChatMsgs(m => [...m, { role:'ia', texto: 'Erro ao conectar com a IA.' }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>IA Preditiva</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Análises inteligentes dos seus dados de vendas</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:24 }}>
        {ANALISES.map((a, i) => (
          <motion.button key={a.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.05 }}
            whileHover={{ y:-2 }} onClick={() => rodarAnalise(a.id)} disabled={loading}
            style={{ padding:20, borderRadius:14, border:'1px solid rgba(157,111,255,0.20)', background:'linear-gradient(135deg,rgba(157,111,255,0.08),rgba(157,111,255,0.02))', backdropFilter:'blur(20px)', cursor:'pointer', textAlign:'left', opacity: loading ? 0.6 : 1 }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{a.icon}</div>
            <h4 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13.5, color:'#fff', marginBottom:4 }}>{a.titulo}</h4>
            <p style={{ fontSize:12, color:'#4c5070' }}>{a.desc}</p>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {(loading || resultado) && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ padding:28, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid rgba(157,111,255,0.20)', borderLeft:'3px solid #9d6fff', marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(157,111,255,0.18)', border:'1px solid rgba(157,111,255,0.30)', display:'grid', placeItems:'center', fontSize:22 }}>🤖</div>
              <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>{tituloAtual}</h3>
            </div>
            {loading ? (
              <div style={{ display:'flex', alignItems:'center', gap:12, color:'#8f94b0' }}>
                <motion.div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#9d6fff' }}
                  animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
                Analisando seus dados...
              </div>
            ) : (
              <div style={{ fontSize:14.5, lineHeight:1.8, color:'#8f94b0', whiteSpace:'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: resultado?.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#9d6fff">$1</strong>').replace(/\n/g,'<br/>') }} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat IA flutuante */}
      <div style={{ position:'fixed', bottom:28, right:28, zIndex:999 }}>
        <AnimatePresence>
          {chatAberto && (
            <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20, scale:0.95 }}
              style={{ position:'absolute', bottom:60, right:0, width:340, height:480, borderRadius:18, background:'rgba(8,8,14,0.96)', backdropFilter:'blur(48px)', border:'1px solid rgba(157,111,255,0.28)', boxShadow:'0 24px 80px rgba(0,0,0,0.72)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(157,111,255,0.08)' }}>
                <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#fff' }}>🤖 HAPSIS IA</span>
                <button onClick={() => setChatAberto(false)} style={{ background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:18 }}>×</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                {chatMsgs.map((m, i) => (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'85%', padding:'9px 12px', borderRadius:10, fontSize:13, lineHeight:1.5, background: m.role==='user' ? 'rgba(240,180,41,0.14)' : 'rgba(157,111,255,0.10)', border:`1px solid ${m.role==='user' ? 'rgba(240,180,41,0.22)' : 'rgba(157,111,255,0.22)'}`, color:'#f0f1ff' }}>
                      {m.texto}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, color:'#4c5070', fontSize:13 }}>
                    <motion.div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#9d6fff' }}
                      animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
                    Digitando...
                  </div>
                )}
              </div>
              <div style={{ padding:12, borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:8 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && enviarChat()}
                  placeholder="Pergunte sobre suas vendas..."
                  style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'9px 12px', fontSize:13, color:'#fff', outline:'none', fontFamily:'inherit' }} />
                <button onClick={enviarChat} disabled={chatLoading}
                  style={{ width:36, height:36, borderRadius:8, background:'rgba(157,111,255,0.20)', border:'1px solid rgba(157,111,255,0.30)', color:'#9d6fff', cursor:'pointer', fontSize:16, flexShrink:0 }}>➤</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale:1.08 }} whileTap={{ scale:0.95 }} onClick={() => setChatAberto(o => !o)}
          animate={{ boxShadow: ['0 8px 32px rgba(157,111,255,0.50)','0 8px 40px rgba(157,111,255,0.80)','0 8px 32px rgba(157,111,255,0.50)'] }}
          transition={{ duration:2, repeat:Infinity }}
          style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,rgba(157,111,255,0.88),rgba(139,92,246,0.82))', border:'1px solid rgba(255,255,255,0.24)', color:'#fff', fontSize:22, display:'grid', placeItems:'center', cursor:'pointer' }}>
          🤖
        </motion.button>
      </div>
    </div>
  )
}