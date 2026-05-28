import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

// ── Floating metric cards decorativos ────────────────────────
const metrics = [
  { icon:'💰', value:'R$ 48.200', label:'Receita este mês',   pos:{ top:'15%', left:'5%'  } },
  { icon:'🏆', value:'23 fechados', label:'Deals ganhos',     pos:{ top:'20%', right:'5%' } },
  { icon:'📈', value:'68% conversão', label:'Taxa de conv.',  pos:{ bottom:'25%', left:'4%'} },
  { icon:'👥', value:'12 ativos',  label:'Pipeline ativo',    pos:{ bottom:'20%', right:'4%'} },
]

function FloatingCard({ icon, value, label, pos, delay }) {
  return (
    <motion.div
      initial={{ opacity:0, y:20 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.6, ease:[0.22,1,0.36,1] }}
      style={{ position:'fixed', ...pos, display:'flex', alignItems:'center', gap:10,
        background:'rgba(15,16,24,0.80)', backdropFilter:'blur(20px)',
        border:'1px solid rgba(255,255,255,0.07)', borderRadius:14,
        padding:'10px 14px', zIndex:5,
        animation:`floatCard ${3+delay}s ease-in-out infinite alternate` }}
    >
      <div style={{ width:36, height:36, borderRadius:10, background:'rgba(240,180,41,0.12)',
        border:'1px solid rgba(240,180,41,0.20)', display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
      <div>
        <p style={{ fontSize:13, fontWeight:700, color:'#f0f1ff', lineHeight:1 }}>{value}</p>
        <p style={{ fontSize:10.5, color:'#4c5070', marginTop:3 }}>{label}</p>
      </div>
    </motion.div>
  )
}

// ── Indicador de força da senha ───────────────────────────────
function SenhaStrength({ senha }) {
  if (!senha) return null
  const checks = [
    senha.length >= 8,
    /[A-Z]/.test(senha),
    /[0-9]/.test(senha),
    /[^A-Za-z0-9]/.test(senha),
  ]
  const score = checks.filter(Boolean).length
  const cores  = ['#ff4d6a','#ff8c42','#f0b429','#00c896']
  const labels = ['Fraca','Média','Boa','Forte']
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[0,1,2,3].map(i => (
          <motion.div key={i}
            animate={{ background: i<score ? cores[score-1] : 'rgba(255,255,255,0.06)' }}
            style={{ flex:1, height:3, borderRadius:3 }} />
        ))}
      </div>
      <p style={{ fontSize:11, color: score>0?cores[score-1]:'#4c5070' }}>
        Senha {labels[score-1] || 'muito fraca'}
      </p>
    </div>
  )
}

// ── Input com label flutuante ─────────────────────────────────
function Input({ label, type='text', value, onChange, placeholder, error, autoComplete }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value
  const borderColor = error ? 'rgba(255,77,106,0.5)' : focused ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.08)'
  const bg          = error ? 'rgba(255,77,106,0.04)' : focused ? 'rgba(240,180,41,0.04)' : 'rgba(255,255,255,0.035)'
  return (
    <div style={{ marginBottom: error ? 4 : 16 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.6px', color: error?'#ff4d6a':'#4c5070', marginBottom:8 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width:'100%', background:bg, border:`1px solid ${borderColor}`,
          borderRadius:10, padding:'12px 16px', fontSize:14, color:'#f0f1ff',
          outline:'none', fontFamily:'inherit', transition:'all 0.2s',
          boxShadow: focused ? `0 0 0 3px ${error?'rgba(255,77,106,0.10)':'rgba(240,180,41,0.09)'}` : 'none' }}
      />
      {error && <p style={{ fontSize:11, color:'#ff4d6a', marginTop:5 }}>{error}</p>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// PÁGINA DE LOGIN PRINCIPAL
// ══════════════════════════════════════════════════════════════
export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [modo,    setModo]    = useState('login') // login | cadastro | esqueci
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [nome,    setNome]    = useState('')
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')
  const [sucesso, setSucesso] = useState('')
  const [errors,  setErrors]  = useState({})
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [emailConfirmado, setEmailConfirmado] = useState(false)

  function validar() {
    const e = {}
    if (!email.trim())      e.email = 'E-mail obrigatório'
    if (!/\S+@\S+\.\S+/.test(email)) e.email = 'E-mail inválido'
    if (modo !== 'esqueci') {
      if (!senha)            e.senha = 'Senha obrigatória'
      if (modo === 'cadastro' && senha.length < 6) e.senha = 'Mínimo 6 caracteres'
      if (modo === 'cadastro' && !nome.trim()) e.nome = 'Nome obrigatório'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validar()) return
    setErro(''); setSucesso(''); setLoading(true)

    try {
      if (modo === 'login') {
        await signIn(email, senha)

      } else if (modo === 'cadastro') {
        await signUp(email, senha, nome)
        setEmailConfirmado(true)

      } else if (modo === 'esqueci') {
        const { error } = await import('../lib/supabase').then(m =>
          m.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          })
        )
        if (error) throw error
        setSucesso('✅ Link de recuperação enviado! Verifique seu e-mail.')
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials':  'E-mail ou senha incorretos.',
        'Email not confirmed':         'Confirme seu e-mail antes de entrar.',
        'User already registered':     'Este e-mail já está cadastrado.',
        'Password should be at least': 'Senha deve ter pelo menos 6 caracteres.',
      }
      const key   = Object.keys(msgs).find(k => err.message?.includes(k))
      setErro(key ? msgs[key] : err.message || 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Tela de confirmação de e-mail
  if (emailConfirmado) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#060609', padding:20 }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        style={{ maxWidth:420, width:'100%', textAlign:'center', padding:44,
          background:'rgba(8,8,14,0.90)', backdropFilter:'blur(52px)',
          border:'1px solid rgba(255,255,255,0.08)', borderRadius:22,
          boxShadow:'0 36px 84px rgba(0,0,0,0.68)' }}>
        <div style={{ width:72, height:72, borderRadius:20, background:'rgba(0,200,150,0.14)',
          border:'1px solid rgba(0,200,150,0.28)', display:'flex', alignItems:'center',
          justifyContent:'center', margin:'0 auto 20px', fontSize:36 }}>✉️</div>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:22, color:'#f0f1ff', marginBottom:12 }}>
          Confirme seu e-mail!
        </h2>
        <p style={{ fontSize:13.5, color:'#8f94b0', lineHeight:1.7, marginBottom:24 }}>
          Enviamos um link de confirmação para<br/>
          <strong style={{ color:'#f0f1ff' }}>{email}</strong>
        </p>
        <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:18,
          border:'1px solid rgba(255,255,255,0.06)', textAlign:'left', marginBottom:24 }}>
          {['Abra o e-mail enviado pelo HAPSIS',
            'Clique em "Confirmar meu cadastro"',
            'Volte aqui e faça login com sua senha'].map((s,i) => (
            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:i<2?12:0 }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(240,180,41,0.18)',
                color:'#f0b429', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</span>
              <span style={{ fontSize:13, color:'#8f94b0' }}>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setEmailConfirmado(false); setModo('login') }}
          style={{ width:'100%', padding:'13px', background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',
            border:'1px solid rgba(255,255,255,0.28)', borderRadius:10, color:'#060709',
            fontWeight:700, cursor:'pointer', fontSize:15, fontFamily:'Syne,sans-serif' }}>
          Já confirmei — Fazer login
        </button>
      </motion.div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden', background:'#060609' }}>

      <style>{`
        @keyframes floatCard { from{transform:translateY(0)} to{transform:translateY(-8px)} }
      `}</style>

      {/* Orbs */}
      <div style={{ position:'absolute', top:'15%', left:'20%', width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(157,111,255,0.14),transparent 70%)',
        filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'20%', right:'18%', width:420, height:420, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(240,180,41,0.12),transparent 70%)',
        filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'55%', right:'8%', width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle,rgba(0,200,150,0.08),transparent 70%)',
        filter:'blur(40px)', pointerEvents:'none' }} />

      {/* Grade */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.5,
        backgroundImage:'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
        backgroundSize:'54px 54px',
        WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)',
        maskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)' }} />

      {/* Floating cards */}
      {metrics.map((m,i) => <FloatingCard key={i} {...m} delay={0.8+i*0.15} />)}

      {/* Card principal */}
      <motion.div
        initial={{ opacity:0, y:28, scale:0.96 }}
        animate={{ opacity:1, y:0, scale:1 }}
        transition={{ type:'spring', stiffness:260, damping:22 }}
        style={{ position:'relative', zIndex:10, width:'100%', maxWidth:440, margin:'0 20px' }}
      >
        <div style={{ position:'relative', borderRadius:22, padding:'40px 40px 36px',
          background:'rgba(8,8,14,0.90)', backdropFilter:'blur(52px) saturate(200%)',
          border:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 0 0 1px rgba(240,180,41,0.04),0 36px 84px rgba(0,0,0,0.68)' }}>

          {/* Linha âmbar */}
          <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1,
            background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.50),transparent)' }} />

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <motion.div
              animate={{ boxShadow:['0 0 22px rgba(240,180,41,0.44)','0 0 38px rgba(240,180,41,0.76)','0 0 22px rgba(240,180,41,0.44)'] }}
              transition={{ duration:4, repeat:Infinity }}
              style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#f0b429,#c9960e)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                fontWeight:900, color:'#060709', position:'relative', overflow:'hidden', flexShrink:0 }}>
              <span style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.22),transparent)' }} />
              H
            </motion.div>
            <div>
              <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, letterSpacing:'2px', color:'#f0f1ff', margin:0 }}>HAPSIS</h1>
              <p style={{ fontSize:11, color:'#4c5070', letterSpacing:'0.5px', margin:0 }}>Enterprise CRM</p>
            </div>
          </div>

          {/* Título do modo */}
          <AnimatePresence mode="wait">
            <motion.div key={modo}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              transition={{ duration:0.2 }} style={{ marginBottom:24 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:22, color:'#f0f1ff', margin:0 }}>
                {modo==='login' ? 'Bem-vindo de volta' : modo==='cadastro' ? 'Criar sua conta' : 'Recuperar senha'}
              </h2>
              <p style={{ fontSize:13, color:'#8f94b0', marginTop:6, marginBottom:0 }}>
                {modo==='login' ? 'Acesse sua plataforma de vendas.' :
                 modo==='cadastro' ? 'Vendedores se cadastram aqui. Gestores entram por convite.' :
                 'Enviaremos um link de recuperação por e-mail.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Role info para cadastro */}
          <AnimatePresence>
            {modo === 'cadastro' && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                style={{ marginBottom:16, padding:'12px 14px', borderRadius:10,
                  background:'rgba(77,159,255,0.06)', border:'1px solid rgba(77,159,255,0.18)' }}>
                <p style={{ fontSize:12, color:'#4d9fff', margin:0, lineHeight:1.5 }}>
                  ℹ️ Cadastros públicos entram como <strong>Vendedor</strong>.<br/>
                  Para acesso como Gestor, solicite um convite ao administrador.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column' }}>

            {/* Nome — só no cadastro */}
            <AnimatePresence>
              {modo === 'cadastro' && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}>
                  <Input label="Nome completo" value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Ex: João Silva" error={errors.nome} autoComplete="name" />
                </motion.div>
              )}
            </AnimatePresence>

            <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" error={errors.email} autoComplete="email" />

            {modo !== 'esqueci' && (
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.6px', color: errors.senha?'#ff4d6a':'#4c5070', marginBottom:8 }}>Senha</label>
                <div style={{ position:'relative' }}>
                  <input
                    type={mostrarSenha?'text':'password'} value={senha}
                    onChange={e => setSenha(e.target.value)} placeholder="••••••••"
                    autoComplete={modo==='login'?'current-password':'new-password'}
                    style={{ width:'100%', background: errors.senha?'rgba(255,77,106,0.04)':'rgba(255,255,255,0.035)',
                      border:`1px solid ${errors.senha?'rgba(255,77,106,0.5)':'rgba(255,255,255,0.08)'}`,
                      borderRadius:10, padding:'12px 44px 12px 16px', fontSize:14, color:'#f0f1ff',
                      outline:'none', fontFamily:'inherit', transition:'all 0.2s' }} />
                  <button type="button" onClick={() => setMostrarSenha(v=>!v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', color:'#4c5070', cursor:'pointer', fontSize:16 }}>
                    {mostrarSenha ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.senha && <p style={{ fontSize:11, color:'#ff4d6a', marginTop:5 }}>{errors.senha}</p>}
                {modo === 'cadastro' && <SenhaStrength senha={senha} />}
              </div>
            )}

            {/* Mensagens */}
            <AnimatePresence>
              {erro && (
                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  style={{ padding:'11px 14px', borderRadius:10, marginBottom:14, fontSize:12.5,
                    color:'#ff4d6a', background:'rgba(255,77,106,0.08)', border:'1px solid rgba(255,77,106,0.24)' }}>
                  ⚠️ {erro}
                </motion.div>
              )}
              {sucesso && (
                <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  style={{ padding:'11px 14px', borderRadius:10, marginBottom:14, fontSize:12.5,
                    color:'#00c896', background:'rgba(0,200,150,0.08)', border:'1px solid rgba(0,200,150,0.24)' }}>
                  {sucesso}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Esqueci senha link */}
            {modo === 'login' && (
              <div style={{ textAlign:'right', marginBottom:12, marginTop:-8 }}>
                <button type="button" onClick={() => { setModo('esqueci'); setErro(''); setSucesso('') }}
                  style={{ background:'none', border:'none', color:'#4c5070', fontSize:12, cursor:'pointer' }}>
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* Botão principal */}
            <motion.button type="submit" disabled={loading}
              whileHover={{ y:-1, filter:'brightness(1.07)' }}
              whileTap={{ scale:0.98 }}
              style={{ width:'100%', padding:'14px', borderRadius:10, fontSize:15, fontWeight:700,
                fontFamily:'Syne,sans-serif', cursor:'pointer', transition:'all 0.2s',
                background: loading?'rgba(240,180,41,0.5)':'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',
                border:'1px solid rgba(255,255,255,0.28)', color:'#060709',
                boxShadow:'0 4px 20px rgba(240,180,41,0.30),inset 0 1px 0 rgba(255,255,255,0.52)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              {loading ? (
                <>
                  <motion.span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#060709', display:'inline-block' }}
                    animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} />
                  {modo==='login'?'Entrando...':modo==='cadastro'?'Criando conta...':'Enviando...'}
                </>
              ) : (
                modo==='login' ? '→ Entrar no HAPSIS' :
                modo==='cadastro' ? '✓ Criar minha conta' :
                '📧 Enviar link de recuperação'
              )}
            </motion.button>
          </form>

          {/* Links de alternância */}
          <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#8f94b0' }}>
            {modo === 'login' && (
              <span>
                Novo por aqui?{' '}
                <button onClick={() => { setModo('cadastro'); setErro(''); setSucesso(''); setErrors({}) }}
                  style={{ background:'none', border:'none', color:'#f0b429', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                  Criar conta grátis
                </button>
              </span>
            )}
            {modo === 'cadastro' && (
              <span>
                Já tenho conta.{' '}
                <button onClick={() => { setModo('login'); setErro(''); setSucesso(''); setErrors({}) }}
                  style={{ background:'none', border:'none', color:'#f0b429', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                  Fazer login
                </button>
              </span>
            )}
            {modo === 'esqueci' && (
              <button onClick={() => { setModo('login'); setErro(''); setSucesso('') }}
                style={{ background:'none', border:'none', color:'#f0b429', fontWeight:600, cursor:'pointer', fontSize:13 }}>
                ← Voltar ao login
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}