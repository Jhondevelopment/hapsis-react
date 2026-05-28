import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase'

export function EquipesPage({ perfil }) {
  const [equipe,  setEquipe]  = useState([])
  const [loading, setLoading] = useState(true)
  const [convite, setConvite] = useState({ aberto:false, email:'', nome:'', cargo:'vendedor', enviando:false, msg:'' })

  useEffect(() => { carregarEquipe() }, [])

  async function carregarEquipe() {
    try {
      const { data } = await supabase.from('profiles').select('*').order('full_name')
      setEquipe(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function enviarConvite() {
    setConvite(c => ({ ...c, enviando:true, msg:'' }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const jwt = session?.access_token || SUPABASE_KEY
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hapsis-invite`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${jwt}` },
        body: JSON.stringify({ email:convite.email, nome:convite.nome, cargo:convite.cargo, convidado_por: perfil?.full_name })
      })
      const data = await res.json()
      if (data.ok) {
        setConvite(c => ({ ...c, msg:'✓ Convite enviado!', email:'', nome:'', cargo:'vendedor' }))
        setTimeout(() => setConvite(c => ({ ...c, aberto:false, msg:'' })), 2500)
      } else {
        setConvite(c => ({ ...c, msg: data.erro || 'Erro ao enviar.' }))
      }
    } catch {
      setConvite(c => ({ ...c, msg:'Erro de conexão.' }))
    } finally {
      setConvite(c => ({ ...c, enviando:false }))
    }
  }

  const roleLabel = { gestor_geral:'Gestor Geral', gestor_sub:'Sub Gerente', vendedor:'Vendedor' }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Gestão de Equipes</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>{equipe.length} membros</p>
        </div>
        <button onClick={() => setConvite(c => ({ ...c, aberto:true }))}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', background:'linear-gradient(180deg,rgba(0,200,150,0.16),rgba(0,200,150,0.08))', border:'1px solid rgba(0,200,150,0.26)', borderRadius:10, color:'#00c896', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          ✉️ Convidar membro
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {equipe.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
            style={{ padding:20, borderRadius:14, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:'1px solid #1e2030' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#f0b429', fontSize:18, fontFamily:'Syne,sans-serif', flexShrink:0 }}>
                {m.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:14, color:'#f0f1ff' }}>{m.full_name || 'Sem nome'}</p>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:12, background: m.role==='gestor_geral'?'rgba(157,111,255,0.14)':m.role==='gestor_sub'?'rgba(240,180,41,0.14)':'rgba(77,159,255,0.14)', color: m.role==='gestor_geral'?'#9d6fff':m.role==='gestor_sub'?'#f0b429':'#4d9fff' }}>
                  {roleLabel[m.role] || m.role}
                </span>
              </div>
            </div>
            <div style={{ fontSize:12, color:'#4c5070' }}>
              {m.email && <p>✉️ {m.email}</p>}
              {m.meta_mensal && <p style={{ marginTop:4 }}>🎯 Meta: R$ {parseFloat(m.meta_mensal).toLocaleString('pt-BR')}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {convite.aberto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.62)', backdropFilter:'blur(12px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target===e.currentTarget && setConvite(c => ({ ...c, aberto:false }))}>
          <motion.div initial={{ opacity:0, y:20, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
            style={{ position:'relative', borderRadius:18, padding:32, width:'100%', maxWidth:420, background:'linear-gradient(160deg,rgba(12,13,22,0.98),rgba(8,8,14,0.96))', backdropFilter:'blur(52px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 32px 84px rgba(0,0,0,0.68)' }}>
            <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1, background:'linear-gradient(90deg,transparent,rgba(0,200,150,0.40),transparent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>✉️ Convidar membro</h2>
              <button onClick={() => setConvite(c => ({ ...c, aberto:false }))} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14 }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'#8f94b0', marginBottom:20 }}>A pessoa receberá um e-mail com link de acesso.</p>
            {[
              { label:'E-mail', campo:'email', type:'email', placeholder:'nome@empresa.com' },
              { label:'Nome completo', campo:'nome', type:'text', placeholder:'Ex: João Silva' },
            ].map(f => (
              <div key={f.campo} style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                <input type={f.type} value={convite[f.campo]} onChange={e => setConvite(c => ({ ...c, [f.campo]:e.target.value }))} placeholder={f.placeholder}
                  style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none', fontFamily:'inherit' }} />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>Cargo</label>
              <select value={convite.cargo} onChange={e => setConvite(c => ({ ...c, cargo:e.target.value }))}
                style={{ width:'100%', background:'#0d1117', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#fff', outline:'none' }}>
                <option value="vendedor">Vendedor</option>
                <option value="gestor_sub">Sub Gerente</option>
                {perfil?.role === 'gestor_geral' && <option value="gestor_geral">Gestor Geral</option>}
              </select>
            </div>
            {convite.msg && (
              <div style={{ padding:'10px 12px', borderRadius:8, marginBottom:16, fontSize:12, background: convite.msg.startsWith('✓')?'rgba(0,200,150,0.10)':'rgba(255,77,106,0.10)', border:`1px solid ${convite.msg.startsWith('✓')?'rgba(0,200,150,0.28)':'rgba(255,77,106,0.28)'}`, color: convite.msg.startsWith('✓')?'#00c896':'#ff4d6a' }}>
                {convite.msg}
              </div>
            )}
            <button onClick={enviarConvite} disabled={convite.enviando || !convite.email || !convite.nome}
              style={{ width:'100%', padding:'14px', background:'linear-gradient(180deg,rgba(0,200,150,0.94),rgba(0,168,126,0.90))', border:'1px solid rgba(255,255,255,0.28)', borderRadius:10, color:'#060709', fontWeight:700, cursor:'pointer', fontSize:15, fontFamily:'Syne,sans-serif', opacity: convite.enviando?0.7:1 }}>
              {convite.enviando ? 'Enviando...' : '✉️ Enviar Convite'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}