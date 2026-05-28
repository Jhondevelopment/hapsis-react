import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Componentes base ──────────────────────────────────────────
function SparkBar({ data=[], color='#f0b429' }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:44, minWidth:80 }}>
      {data.map((v,i) => (
        <motion.div key={i}
          initial={{ height:0 }} animate={{ height:`${(v/max)*100}%` }}
          transition={{ delay:i*0.05, duration:0.6, ease:[0.22,1,0.36,1] }}
          style={{ flex:1, background:color, borderRadius:'3px 3px 0 0',
            opacity:i===data.length-1?1:0.35, minWidth:4 }} />
      ))}
    </div>
  )
}

function ApexCard({ label, value, sub, color='#f0b429', spark=[], icon, trend, delay=0 }) {
  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      whileHover={{ y:-3 }}
      transition={{ delay, type:'spring', stiffness:280, damping:24 }}
      style={{ position:'relative', overflow:'hidden', borderRadius:16, padding:'20px 22px',
        background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
        backdropFilter:'blur(32px)', border:'1px solid #1e2030', isolation:'isolate' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${color},transparent)`, opacity:0.55 }} />
      <div style={{ position:'absolute', top:-60, right:-60, width:140, height:140,
        borderRadius:'50%', background:color, filter:'blur(70px)', opacity:0.07, pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:10 }}>{label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:700, color, lineHeight:1, textShadow:`0 0 28px ${color}22` }}>{value}</p>
            {sub && <p style={{ fontSize:11.5, color:'#4c5070', marginTop:6 }}>{sub}</p>}
          </div>
          {icon && (
            <div style={{ width:46, height:46, borderRadius:12, background:`${color}18`, border:`1px solid ${color}30`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
              {icon}
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12 }}>
          {trend !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:trend>=0?'#00c896':'#ff4d6a' }}>
                {trend>=0?'↑':'↓'} {Math.abs(trend)}%
              </span>
              <span style={{ fontSize:10.5, color:'#4c5070' }}>vs anterior</span>
            </div>
          )}
          {spark.length>0 && <SparkBar data={spark} color={color} />}
        </div>
      </div>
    </motion.div>
  )
}

function Card({ title, accent='#f0b429', delay=0, children, style={} }) {
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      style={{ padding:'22px 24px', borderRadius:16,
        background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
        backdropFilter:'blur(32px)', border:'1px solid #1e2030',
        position:'relative', overflow:'hidden', ...style }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${accent},transparent)`, opacity:0.45 }} />
      {title && <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'#f0f1ff', marginBottom:16 }}>{title}</h3>}
      {children}
    </motion.div>
  )
}

function BarChart({ dados, height=130 }) {
  const max = Math.max(...dados.map(d=>d.val), 1)
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, marginBottom:8 }}>
        {dados.map((d,i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end' }}>
            <motion.div initial={{ height:0 }} animate={{ height:`${(d.val/max)*100}%` }}
              transition={{ delay:i*0.07, duration:0.7, ease:[0.22,1,0.36,1] }}
              style={{ width:'100%',
                background:i===dados.length-1?'linear-gradient(180deg,#f0b429,#c9960e)':'rgba(240,180,41,0.22)',
                borderRadius:'5px 5px 0 0', minHeight:4, position:'relative', overflow:'hidden' }}>
              {i===dados.length-1 && <div style={{ position:'absolute', top:0, left:0, right:0, height:'40%',
                background:'linear-gradient(180deg,rgba(255,255,255,0.15),transparent)' }} />}
            </motion.div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {dados.map((d,i) => (
          <div key={i} style={{ flex:1, textAlign:'center', fontSize:9.5, color:'#4c5070',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.mes}</div>
        ))}
      </div>
    </div>
  )
}

function ProgressBar({ label, atual, meta, cor }) {
  const pct = meta>0 ? Math.min((atual/meta)*100,100) : 0
  const c   = cor||(pct>=100?'#00c896':pct>=60?'#f0b429':'#ff4d6a')
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12.5, color:'#8f94b0' }}>{label}</span>
        <span style={{ fontSize:12.5, fontWeight:700, color:c }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height:7, background:'rgba(0,0,0,0.45)', borderRadius:6, overflow:'hidden', position:'relative' }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:1.2, ease:[0.22,1,0.36,1], delay:0.4 }}
          style={{ height:'100%', background:`linear-gradient(90deg,${c},${c}aa)`, borderRadius:6 }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ fontSize:10.5, color:'#4c5070' }}>
          {typeof atual==='number'&&atual>999 ? atual.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : atual}
        </span>
        <span style={{ fontSize:10.5, color:'#4c5070' }}>
          meta: {typeof meta==='number'&&meta>999 ? meta.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : meta}
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD VENDEDOR — visão pessoal
// ══════════════════════════════════════════════════════════════
function DashboardVendedor({ perfil }) {
  const [leads,    setLeads]    = useState([])
  const [ranking,  setRanking]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const [{ data: l }, { data: todos }] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', perfil.id).order('created_at',{ascending:false}),
        supabase.from('leads').select('user_id,valor,status,aprovado,estornado'),
      ])
      setLeads(l || [])

      // Ranking geral para saber posição
      const { data: perfis } = await supabase.from('profiles').select('id,full_name')
      const rank = (perfis||[]).map(p => {
        const pLeads = (todos||[]).filter(x=>x.user_id===p.id&&x.status==='Fechados'&&x.aprovado===true&&!x.estornado)
        return { id:p.id, nome:p.full_name, receita:pLeads.reduce((s,x)=>s+(parseFloat(x.valor)||0),0) }
      }).sort((a,b)=>b.receita-a.receita)
      setRanking(rank)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const total      = leads.length
  const fechados   = leads.filter(l=>l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
  const pendentes  = leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado)
  const perdidos   = leads.filter(l=>l.status==='Perdidos')
  const emAberto   = leads.filter(l=>!['Fechados','Perdidos'].includes(l.status))
  const receita    = fechados.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const taxaConv   = total>0 ? Math.round((fechados.length/total)*100) : 0
  const ticket     = fechados.length>0 ? Math.round(receita/fechados.length) : 0
  const meta       = perfil?.meta_mensal ? parseFloat(perfil.meta_mensal) : 10000
  const valorPerdas= perdidos.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const posRanking = ranking.findIndex(r=>r.id===perfil.id)+1

  // Follow-ups próximos (próximos 7 dias)
  const hoje = new Date()
  const em7  = new Date(hoje); em7.setDate(em7.getDate()+7)
  const followUps = leads.filter(l => {
    if (!l.data_followup) return false
    const d = new Date(l.data_followup+'T12:00:00')
    return d >= hoje && d <= em7
  }).sort((a,b)=>new Date(a.data_followup)-new Date(b.data_followup))

  // Receita por mês
  const mesesData = (() => {
    const m = {}
    fechados.forEach(l=>{
      const d = new Date(l.created_at||Date.now())
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      m[k] = (m[k]||0)+(parseFloat(l.valor)||0)
    })
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
      .map(([k,v])=>({ mes:new Date(k+'-01').toLocaleDateString('pt-BR',{month:'short'}), val:v }))
  })()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <motion.div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid transparent', borderTopColor:'#f0b429', margin:'0 auto' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#f0f1ff', letterSpacing:'-0.5px' }}>
            Olá, {perfil?.full_name?.split(' ')[0]||'Vendedor'} 👋
          </h1>
          <p style={{ fontSize:13.5, color:'#4c5070', marginTop:5 }}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}
          </p>
        </div>
        {posRanking > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:12,
            background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.20)' }}>
            <span style={{ fontSize:20 }}>{posRanking===1?'🥇':posRanking===2?'🥈':posRanking===3?'🥉':'🏅'}</span>
            <div>
              <p style={{ fontSize:11, color:'#4c5070', margin:0 }}>Ranking</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'#f0b429', margin:0 }}>
                #{posRanking}° lugar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Linha 1 — 4 stats pessoais */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
        <ApexCard delay={0}    label="Minha Receita"   value={receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="#f0b429" icon="💰" spark={mesesData.map(d=>d.val)} sub={`${fechados.length} vendas`} />
        <ApexCard delay={0.07} label="Leads Abertos"   value={emAberto.length}  color="#4d9fff" icon="📋" sub={`${total} leads total`} />
        <ApexCard delay={0.14} label="Conversão"        value={taxaConv+'%'}     color="#00c896" icon="📈" sub={`ticket R$ ${ticket.toLocaleString('pt-BR',{maximumFractionDigits:0})}`} />
        <ApexCard delay={0.21} label="Perdas"           value={perdidos.length}  color="#ff4d6a" icon="❌" sub={valorPerdas>0?valorPerdas.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):`${perdidos.length} leads perdidos`} />
      </div>

      {/* Linha 2 — Gráfico receita + Meta + Pendentes */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:18 }}>

        {/* Gráfico */}
        <Card title="💰 Minha Receita Mensal" accent="#f0b429" delay={0.25}>
          {mesesData.length>0
            ? <BarChart dados={mesesData} />
            : <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'#4c5070', fontSize:13 }}>Nenhuma venda fechada ainda</div>}
        </Card>

        {/* Meta pessoal */}
        <Card title="🎯 Minha Meta" accent="#00c896" delay={0.32}>
          <ProgressBar label="Receita"   atual={receita}        meta={meta} />
          <ProgressBar label="Fechados"  atual={fechados.length} meta={10}  />
          <ProgressBar label="Conversão" atual={taxaConv}        meta={30} cor="#9d6fff" />
          {pendentes.length > 0 && (
            <div style={{ marginTop:14, padding:'10px 12px', borderRadius:10,
              background:'rgba(255,140,66,0.08)', border:'1px solid rgba(255,140,66,0.22)' }}>
              <p style={{ fontSize:12, color:'#ff8c42', margin:0 }}>
                ⏳ {pendentes.length} venda{pendentes.length>1?'s':''} aguardando aprovação
              </p>
            </div>
          )}
        </Card>

        {/* Follow-ups */}
        <Card title="📅 Follow-ups" accent="#9d6fff" delay={0.38}>
          {followUps.length === 0 ? (
            <div style={{ textAlign:'center', color:'#4c5070', padding:'20px 0' }}>
              <span style={{ fontSize:28, display:'block', marginBottom:8, opacity:0.3 }}>📅</span>
              <p style={{ fontSize:12 }}>Nenhum follow-up nos próximos 7 dias</p>
            </div>
          ) : followUps.slice(0,5).map((l,i) => (
            <motion.div key={l.id} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4+i*0.05 }}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'#f0f1ff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>{l.nome}</p>
                <p style={{ fontSize:11, color:'#4c5070', margin:0 }}>{l.produto||'—'}</p>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:'#9d6fff', flexShrink:0 }}>
                {new Date(l.data_followup+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
              </span>
            </motion.div>
          ))}
        </Card>
      </div>

      {/* Linha 3 — Funil pessoal + últimos leads */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:14 }}>

        {/* Funil pessoal */}
        <Card title="📊 Meu Funil" accent="#4d9fff" delay={0.42}>
          {[
            { label:'Novos',      val:leads.filter(l=>l.status==='Novos').length,      cor:'#4d9fff' },
            { label:'Em Contato', val:leads.filter(l=>l.status==='Contato').length,    cor:'#f0b429' },
            { label:'Negociação', val:leads.filter(l=>l.status==='Negociacao').length, cor:'#ff8c42' },
            { label:'Fechados',   val:fechados.length,                                  cor:'#00c896' },
            { label:'Perdidos',   val:perdidos.length,                                  cor:'#ff4d6a' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12.5, color:'#8f94b0' }}>{item.label}</span>
                <span style={{ fontSize:12.5, fontWeight:700, color:item.cor }}>{item.val}</span>
              </div>
              <div style={{ height:6, background:'rgba(0,0,0,0.45)', borderRadius:6, overflow:'hidden' }}>
                <motion.div initial={{ width:0 }}
                  animate={{ width:total>0?`${(item.val/total)*100}%`:'0%' }}
                  transition={{ duration:1, delay:0.6 }}
                  style={{ height:'100%', background:item.cor, borderRadius:6 }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Últimos leads */}
        <Card title="⚡ Meus Últimos Leads" accent="#ff8c42" delay={0.48}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {leads.slice(0,8).map((l,i) => {
              const cor={Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}[l.status]||'#4c5070'
              return (
                <motion.div key={l.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5+i*0.04 }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
                    background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:cor, boxShadow:`0 0 6px ${cor}`, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#f0f1ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{l.nome}</p>
                    <p style={{ fontSize:11, color:'#4c5070', margin:0 }}>{l.produto||'—'}</p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 6px', borderRadius:8, background:`${cor}18`, color:cor }}>{l.status}</span>
                    {parseFloat(l.valor)>0 && <p style={{ fontSize:10.5, color:'#00c896', fontWeight:700, margin:0, marginTop:2 }}>R$ {parseFloat(l.valor).toLocaleString('pt-BR',{maximumFractionDigits:0})}</p>}
                  </div>
                </motion.div>
              )
            })}
            {leads.length===0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#4c5070', fontSize:13, padding:'30px 0' }}>
                <span style={{ fontSize:32, display:'block', marginBottom:8, opacity:0.3 }}>📋</span>
                Nenhum lead ainda. Adicione no Pipeline!
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD GESTOR — visão completa da equipe
// ══════════════════════════════════════════════════════════════
function DashboardGestor({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [equipe,  setEquipe]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from('leads').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('*'),
      ])
      setLeads(l||[])
      setEquipe(p||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const total      = leads.length
  const fechados   = leads.filter(l=>l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
  const pendentes  = leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado)
  const perdidos   = leads.filter(l=>l.status==='Perdidos')
  const estornados = leads.filter(l=>l.estornado)
  const inad       = leads.filter(l=>l.is_inadimplente&&!l.estornado)
  const emAberto   = leads.filter(l=>!['Fechados','Perdidos'].includes(l.status))
  const receita    = fechados.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const valorPerdas= perdidos.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const taxaConv   = total>0 ? Math.round((fechados.length/total)*100) : 0
  const ticket     = fechados.length>0 ? Math.round(receita/fechados.length) : 0

  // Receita por mês
  const mesesData = (() => {
    const m = {}
    fechados.forEach(l=>{
      const d = new Date(l.created_at||Date.now())
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      m[k] = (m[k]||0)+(parseFloat(l.valor)||0)
    })
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
      .map(([k,v])=>({ mes:new Date(k+'-01').toLocaleDateString('pt-BR',{month:'short'}), val:v }))
  })()
  const receitaMes = mesesData.length>0 ? mesesData[mesesData.length-1].val : 0
  const meta = perfil?.meta_mensal ? parseFloat(perfil.meta_mensal) : 50000

  // Forecast
  const somaEmNeg   = leads.filter(l=>l.status==='Negociacao').reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const somaNovos   = leads.filter(l=>l.status==='Novos').reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const forecast    = somaEmNeg*0.5 + somaNovos*0.1

  // Top vendedores
  const topVendedores = equipe.map(p => {
    const f = leads.filter(l=>l.user_id===p.id&&l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
    return { ...p, receita:f.reduce((s,l)=>s+(parseFloat(l.valor)||0),0), fechados:f.length,
      total:leads.filter(l=>l.user_id===p.id).length }
  }).sort((a,b)=>b.receita-a.receita).slice(0,5)

  // Motivos de perda
  const motivosPerda = (() => {
    const m = {}
    perdidos.forEach(l=>{ const k=l.motivo_perda||'Sem registro'; m[k]=(m[k]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4)
  })()

  // Receita por produto
  const porProduto = (() => {
    const m = {}
    fechados.forEach(l=>{ const k=l.produto||'Sem produto'; m[k]=(m[k]||0)+(parseFloat(l.valor)||0) })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4)
  })()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <motion.div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid transparent', borderTopColor:'#f0b429', margin:'0 auto' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#f0f1ff', letterSpacing:'-0.5px' }}>
            Painel Geral 📊
          </h1>
          <p style={{ fontSize:13.5, color:'#4c5070', marginTop:5 }}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <motion.div animate={{ opacity:[1,0.7,1] }} transition={{ duration:2.5, repeat:Infinity }}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:99,
            fontSize:12, fontWeight:700, color:'#00c896', background:'rgba(0,200,150,0.10)', border:'1px solid rgba(0,200,150,0.22)' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#00c896', boxShadow:'0 0 8px #00c896' }} />
          Ao vivo
        </motion.div>
      </div>

      {/* Linha 1 — 4 stat cards principais */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
        <ApexCard delay={0}    label="Receita Total"   value={receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="#f0b429" icon="💰" spark={mesesData.map(d=>d.val)} sub={`${fechados.length} vendas fechadas`} />
        <ApexCard delay={0.07} label="Total de Leads"  value={total}            color="#4d9fff" icon="👥" sub={`${emAberto.length} em andamento`} />
        <ApexCard delay={0.14} label="Taxa Conversão"  value={taxaConv+'%'}     color="#00c896" icon="📈" sub={`ticket R$ ${ticket.toLocaleString('pt-BR',{maximumFractionDigits:0})}`} />
        <ApexCard delay={0.21} label="Perdas"          value={perdidos.length}  color="#ff4d6a" icon="❌" sub={valorPerdas>0?valorPerdas.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):`${perdidos.length} leads perdidos`} />
      </div>

      {/* Linha 2 — 4 cards secundários */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }}>
        <ApexCard delay={0.1}  label="Pendentes"       value={pendentes.length} color="#ff8c42" icon="⏳" sub="aguardando aprovação" />
        <ApexCard delay={0.15} label="Inadimplentes"   value={inad.length}      color="#ff4d6a" icon="⚠️" sub="pagamentos em atraso" />
        <ApexCard delay={0.2}  label="Forecast"        value={forecast.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="#4d9fff" icon="🔮" sub="projeção de fechamento" />
        <ApexCard delay={0.25} label="Receita do Mês"  value={receitaMes.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color="#00c896" icon="📅" sub="mês atual" />
      </div>

      {/* Linha 3 — Gráfico + Meta + Funil */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14, marginBottom:18 }}>
        <Card title="💰 Receita Mensal" accent="#f0b429" delay={0.3}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <p style={{ fontSize:12, color:'#4c5070' }}>Últimos 6 meses</p>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'#f0b429' }}>
                {receitaMes.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
              </p>
              <p style={{ fontSize:11, color:'#00c896', fontWeight:600 }}>↑ este mês</p>
            </div>
          </div>
          {mesesData.length>0 ? <BarChart dados={mesesData} /> : <div style={{ height:130, display:'flex', alignItems:'center', justifyContent:'center', color:'#4c5070', fontSize:13 }}>Aguardando vendas...</div>}
        </Card>

        <Card title="🎯 Meta da Equipe" accent="#00c896" delay={0.38}>
          <ProgressBar label="Receita"   atual={receitaMes}      meta={meta} />
          <ProgressBar label="Fechados"  atual={fechados.length} meta={30} />
          <ProgressBar label="Conversão" atual={taxaConv}        meta={30} cor="#9d6fff" />
          <ProgressBar label="Leads"     atual={total}           meta={200} cor="#4d9fff" />
        </Card>

        <Card title="📊 Funil Geral" accent="#4d9fff" delay={0.45}>
          {[
            { label:'Novos',      val:leads.filter(l=>l.status==='Novos').length,      cor:'#4d9fff' },
            { label:'Contato',    val:leads.filter(l=>l.status==='Contato').length,    cor:'#f0b429' },
            { label:'Negociação', val:leads.filter(l=>l.status==='Negociacao').length, cor:'#ff8c42' },
            { label:'Fechados',   val:fechados.length,                                  cor:'#00c896' },
            { label:'Perdidos',   val:perdidos.length,                                  cor:'#ff4d6a' },
          ].map(item=>(
            <div key={item.label} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#8f94b0' }}>{item.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:item.cor }}>{item.val}</span>
              </div>
              <div style={{ height:5, background:'rgba(0,0,0,0.45)', borderRadius:4, overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} animate={{ width:total>0?`${(item.val/total)*100}%`:'0%' }}
                  transition={{ duration:1, delay:0.6 }}
                  style={{ height:'100%', background:item.cor, borderRadius:4 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Linha 4 — Top vendedores + Motivos perda + Produtos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:18 }}>

        <Card title="🏆 Top Vendedores" accent="#f0b429" delay={0.5}>
          {topVendedores.filter(v=>v.receita>0).length===0
            ? <p style={{ color:'#4c5070', fontSize:13 }}>Sem dados ainda.</p>
            : topVendedores.filter(v=>v.receita>0).map((v,i)=>(
            <motion.div key={v.id} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.55+i*0.06 }}
              style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'8px 10px', borderRadius:10,
                background:i===0?'rgba(240,180,41,0.06)':'transparent',
                border:i===0?'1px solid rgba(240,180,41,0.14)':'1px solid transparent' }}>
              <span style={{ fontSize:16, width:24, flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#f0f1ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{v.full_name||'—'}</p>
                <p style={{ fontSize:10.5, color:'#4c5070', margin:0 }}>{v.fechados} fechados · {v.total} leads</p>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:'#00c896', flexShrink:0 }}>
                {v.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
              </span>
            </motion.div>
          ))}
        </Card>

        <Card title="❌ Motivos de Perda" accent="#ff4d6a" delay={0.55}>
          {motivosPerda.length===0
            ? <div style={{ textAlign:'center', color:'#4c5070', fontSize:13, padding:'20px 0' }}>
                <span style={{ fontSize:32, display:'block', marginBottom:8, opacity:0.3 }}>🎉</span>
                Nenhuma perda registrada
              </div>
            : motivosPerda.map(([motivo,qtd],i)=>(
            <div key={motivo} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12, color:'#8f94b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>{motivo}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#ff4d6a', flexShrink:0 }}>{qtd}</span>
              </div>
              <div style={{ height:5, background:'rgba(0,0,0,0.42)', borderRadius:4, overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${(qtd/Math.max(...motivosPerda.map(([,v])=>v)))*100}%`}}
                  transition={{ duration:0.9, delay:0.5+i*0.08 }}
                  style={{ height:'100%', background:'#ff4d6a', borderRadius:4 }} />
              </div>
            </div>
          ))}
        </Card>

        <Card title="📦 Receita por Produto" accent="#9d6fff" delay={0.6}>
          {porProduto.length===0
            ? <p style={{ color:'#4c5070', fontSize:13 }}>Sem dados de produtos.</p>
            : porProduto.map(([prod,val],i)=>(
            <div key={prod} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12, color:'#8f94b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{prod}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#9d6fff', flexShrink:0 }}>
                  {val.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                </span>
              </div>
              <div style={{ height:5, background:'rgba(0,0,0,0.42)', borderRadius:4, overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} animate={{ width:receita>0?`${(val/receita)*100}%`:'0%'}}
                  transition={{ duration:0.9, delay:0.5+i*0.08 }}
                  style={{ height:'100%', background:'linear-gradient(90deg,#9d6fff,#7c3aed)', borderRadius:4 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Linha 5 — Atividade recente */}
      <Card title="⚡ Atividade Recente da Equipe" accent="#ff8c42" delay={0.65}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          {leads.slice(0,10).map((lead,i)=>{
            const cor={Fechados:'#00c896',Perdidos:'#ff4d6a',Novos:'#4d9fff',Negociacao:'#ff8c42',Contato:'#f0b429'}[lead.status]||'#4c5070'
            return(
              <motion.div key={lead.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.7+i*0.03 }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
                  background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:cor, boxShadow:`0 0 8px ${cor}`, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'#f0f1ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{lead.nome}</p>
                  <p style={{ fontSize:11, color:'#4c5070', margin:0 }}>{lead.produto||'—'}</p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <span style={{ fontSize:10.5, fontWeight:700, padding:'2px 6px', borderRadius:8, background:`${cor}18`, color:cor }}>{lead.status}</span>
                  {parseFloat(lead.valor)>0 && <p style={{ fontSize:10.5, color:'#00c896', fontWeight:700, margin:0, marginTop:2 }}>R$ {parseFloat(lead.valor).toLocaleString('pt-BR',{maximumFractionDigits:0})}</p>}
                </div>
              </motion.div>
            )
          })}
          {leads.length===0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#4c5070', fontSize:13, padding:'30px 0' }}>
              <span style={{ fontSize:32, display:'block', marginBottom:8, opacity:0.3 }}>📋</span>
              Nenhum lead cadastrado ainda.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EXPORT — roteamento automático por role
// ══════════════════════════════════════════════════════════════
export function DashboardPage({ perfil }) {
  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)
  return isGestor ? <DashboardGestor perfil={perfil} /> : <DashboardVendedor perfil={perfil} />
}