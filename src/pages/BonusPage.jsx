import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export function BonusPage({ perfil }) {
  const [campanhas, setCampanhas] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ nome:'', meta_valor:0, premio:'', status:'Ativa', descricao:'' })
  const [salvando,  setSalvando]  = useState(false)
  const [metricas,  setMetricas]  = useState({ receita:0, fechados:0 })

  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)

  useEffect(() => { carregar(); carregarMetricas() }, [])

  async function carregar() {
    try {
      const { data } = await supabase.from('campanhas_bonus').select('*').order('created_at',{ascending:false})
      setCampanhas(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function carregarMetricas() {
    try {
      let q = supabase.from('leads').select('valor,status,aprovado,estornado').eq('status','Fechados').eq('aprovado',true).eq('estornado',false)
      if (perfil?.role === 'vendedor') q = q.eq('user_id', perfil.id)
      const { data } = await q
      const leads = data || []
      setMetricas({
        receita:  leads.reduce((s,l)=>s+(parseFloat(l.valor)||0),0),
        fechados: leads.length,
      })
    } catch (e) { console.error(e) }
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    try {
      await supabase.from('campanhas_bonus').insert([form])
      setModal(false); setForm({ nome:'', meta_valor:0, premio:'', status:'Ativa', descricao:'' }); carregar()
    } catch (e) { alert(e.message) }
    finally { setSalvando(false) }
  }

  async function alterarStatus(id, status) {
    await supabase.from('campanhas_bonus').update({ status }).eq('id', id)
    carregar()
  }

  async function deletar(id) {
    if (!confirm('Deletar esta campanha?')) return
    await supabase.from('campanhas_bonus').delete().eq('id', id)
    carregar()
  }

  const campanhaAtiva = campanhas.find(c => c.status === 'Ativa')
  const progresso = campanhaAtiva ? Math.min((metricas.receita / (parseFloat(campanhaAtiva.meta_valor)||1)) * 100, 100) : 0
  const metaBatida = progresso >= 100

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#f0f1ff' }}>🎁 Bônus & Campanhas</h1>
          <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Metas e recompensas da equipe</p>
        </div>
        {isGestor && (
          <motion.button onClick={() => setModal(true)} whileHover={{ y:-1 }} whileTap={{ scale:0.97 }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px',
              background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))',
              border:'1px solid rgba(240,180,41,0.26)', borderRadius:10,
              color:'#f0b429', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + Nova Campanha
          </motion.button>
        )}
      </div>

      {/* Banner campanha ativa */}
      {campanhaAtiva && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          style={{ padding:'22px 24px', borderRadius:16, marginBottom:22,
            background: metaBatida
              ? 'linear-gradient(135deg,rgba(0,200,150,0.14),rgba(0,200,150,0.06))'
              : 'linear-gradient(135deg,rgba(240,180,41,0.12),rgba(240,180,41,0.05))',
            backdropFilter:'blur(32px)',
            border:`1px solid ${metaBatida?'rgba(0,200,150,0.30)':'rgba(240,180,41,0.24)'}`,
            position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
            background:`linear-gradient(90deg,transparent,${metaBatida?'#00c896':'#f0b429'},transparent)`, opacity:0.6 }} />

          {metaBatida && (
            <motion.div animate={{ rotate:[0,5,-5,0] }} transition={{ duration:0.5, repeat:3 }}
              style={{ position:'absolute', top:16, right:20, fontSize:32 }}>🏆</motion.div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color: metaBatida?'#00c896':'#f0b429' }}>
                🎯 Campanha Ativa
              </span>
              <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20, color:'#f0f1ff', margin:'6px 0 4px' }}>
                {campanhaAtiva.nome}
              </h2>
              {campanhaAtiva.descricao && <p style={{ fontSize:13, color:'#8f94b0' }}>{campanhaAtiva.descricao}</p>}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <p style={{ fontSize:12, color:'#4c5070', marginBottom:4 }}>Sua receita</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color: metaBatida?'#00c896':'#f0b429' }}>
                {metricas.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:12, color:'#4c5070', marginBottom:4 }}>Meta</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#8f94b0' }}>
                {parseFloat(campanhaAtiva.meta_valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
              </p>
            </div>
          </div>

          <div style={{ height:10, background:'rgba(0,0,0,0.30)', borderRadius:6, overflow:'hidden', marginBottom:10 }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${progresso}%` }}
              transition={{ duration:1.2, ease:[0.22,1,0.36,1] }}
              style={{ height:'100%', background: metaBatida
                ? 'linear-gradient(90deg,#00c896,#00e8b0)'
                : 'linear-gradient(90deg,#f0b429,#ffd166)',
                borderRadius:6 }} />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color: metaBatida?'#00c896':'#f0b429' }}>
              {Math.round(progresso)}% concluído
            </span>
            {campanhaAtiva.premio && (
              <span style={{ fontSize:12, color:'#8f94b0' }}>
                🎁 Prêmio: <strong style={{ color:'#f0f1ff' }}>{campanhaAtiva.premio}</strong>
              </span>
            )}
          </div>

          {metaBatida && (
            <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              style={{ marginTop:14, padding:'12px 16px', borderRadius:10, background:'rgba(0,200,150,0.10)',
                border:'1px solid rgba(0,200,150,0.24)', textAlign:'center' }}>
              <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#00c896' }}>
                🏆 META BATIDA! Parabéns! Você conquistou: {campanhaAtiva.premio}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Lista de campanhas */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <motion.div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
            animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {campanhas.map((c, i) => {
            const cor = c.status==='Ativa'?'#00c896':c.status==='Encerrada'?'#4c5070':'#f0b429'
            return (
              <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                style={{ padding:'16px 20px', borderRadius:14,
                  background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',
                  backdropFilter:'blur(24px)', border:`1px solid ${cor}22`,
                  borderLeft:`3px solid ${cor}`, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
                  background:`linear-gradient(90deg,transparent,${cor}18,transparent)` }} />

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#f0f1ff' }}>{c.nome}</h3>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background:`${cor}18`, color:cor }}>{c.status}</span>
                    </div>
                    <div style={{ display:'flex', gap:16, fontSize:12.5, color:'#8f94b0' }}>
                      <span>🎯 Meta: <strong style={{ color:'#f0f1ff' }}>R$ {parseFloat(c.meta_valor||0).toLocaleString('pt-BR')}</strong></span>
                      {c.premio && <span>🎁 <strong style={{ color:'#f0f1ff' }}>{c.premio}</strong></span>}
                    </div>
                    {c.descricao && <p style={{ fontSize:12, color:'#4c5070', marginTop:4 }}>{c.descricao}</p>}
                  </div>
                  {isGestor && (
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {c.status !== 'Ativa' && (
                        <button onClick={() => alterarStatus(c.id,'Ativa')}
                          style={{ padding:'5px 10px', background:'rgba(0,200,150,0.12)', border:'1px solid rgba(0,200,150,0.24)', borderRadius:7, color:'#00c896', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                          Ativar
                        </button>
                      )}
                      {c.status === 'Ativa' && (
                        <button onClick={() => alterarStatus(c.id,'Encerrada')}
                          style={{ padding:'5px 10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:7, color:'#8f94b0', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                          Encerrar
                        </button>
                      )}
                      <button onClick={() => deletar(c.id)}
                        style={{ padding:'5px 10px', background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.22)', borderRadius:7, color:'#ff4d6a', fontSize:11, fontWeight:700, cursor:'pointer' }}>×</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
          {campanhas.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'#323448' }}>
              <span style={{ fontSize:40, marginBottom:10, opacity:0.3 }}>🎁</span>
              <p style={{ fontSize:13 }}>Nenhuma campanha cadastrada</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(3,3,7,0.75)', backdropFilter:'blur(14px)', zIndex:400,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
              transition={{ type:'spring', stiffness:300, damping:28 }}
              style={{ position:'relative', borderRadius:20, padding:32, width:'100%', maxWidth:440,
                background:'rgba(8,8,14,0.98)', backdropFilter:'blur(52px)',
                border:'1px solid rgba(240,180,41,0.22)', boxShadow:'0 40px 100px rgba(0,0,0,0.80)' }}>
              <div style={{ position:'absolute', top:0, left:'10%', right:'10%', height:1,
                background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.50),transparent)' }} />

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20, color:'#f0f1ff' }}>🎁 Nova Campanha</h2>
                <button onClick={()=>setModal(false)} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.09)', color:'#4c5070', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>

              {[
                { label:'Nome da Campanha', campo:'nome', type:'text', placeholder:'Ex: Sprint de Janeiro' },
                { label:'Meta de Receita (R$)', campo:'meta_valor', type:'number', placeholder:'Ex: 50000' },
                { label:'Prêmio', campo:'premio', type:'text', placeholder:'Ex: R$ 500 + folga' },
                { label:'Descrição', campo:'descricao', type:'text', placeholder:'Detalhe os critérios...' },
              ].map(f => (
                <div key={f.campo} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#4c5070', marginBottom:8 }}>{f.label}</label>
                  <input type={f.type} value={form[f.campo]} onChange={e=>setForm(ff=>({...ff,[f.campo]:e.target.value}))} placeholder={f.placeholder}
                    style={{ width:'100%', background:'rgba(255,255,255,0.035)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'#f0f1ff', outline:'none', fontFamily:'inherit' }}
                    onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                </div>
              ))}

              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button onClick={()=>setModal(false)} style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, color:'#8f94b0', fontWeight:600, cursor:'pointer' }}>Cancelar</button>
                <motion.button onClick={salvar} disabled={salvando||!form.nome.trim()} whileHover={{y:-1}} whileTap={{scale:0.98}}
                  style={{ flex:2, padding:'12px', background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))', border:'1px solid rgba(255,255,255,0.28)', borderRadius:10, color:'#060709', fontWeight:700, cursor:'pointer', fontFamily:'Syne,sans-serif', opacity:salvando||!form.nome.trim()?0.6:1 }}>
                  {salvando?'Salvando...':'🎁 Criar Campanha'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}