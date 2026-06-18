import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Paleta HAPSIS ─────────────────────────────────────────────
const C = {
  gold:    '#f0b429', gold2:'#c9960e',
  blue:    '#4d9fff', green:'#00c896',
  red:     '#ff4d6a', orange:'#ff8c42',
  purple:  '#9d6fff', muted:'#4c5070',
  text2:   '#8f94b0', text:'#f0f1ff',
  border:  'rgba(255,255,255,0.07)',
  surface: 'rgba(14,15,22,0.80)',
  surface2:'rgba(18,19,28,0.85)',
}

// ── Gráfico de Área — estilo Apexify ──────────────────────────
function AreaChart({ dados=[], color=C.gold, height=180, periodo='mensal', receitaHoje=0 }) {
  const ref   = useRef(null)
  const [w, setW] = useState(680)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width || 680))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (!dados || dados.length < 2) return (
    <div ref={ref} style={{ height, display:'flex', alignItems:'center', justifyContent:'center',
      color:C.muted, fontSize:13, fontFamily:'Plus Jakarta Sans,sans-serif' }}>
      Sem dados suficientes para o período
    </div>
  )

  const pad  = { t:16, r:24, b:36, l:16 }
  const iw   = w - pad.l - pad.r
  const ih   = height - pad.t - pad.b
  const max  = Math.max(...dados.map(d => d.val), 1)
  const min  = Math.min(...dados.map(d => d.val), 0)
  const range = max - min || 1
  const pts  = dados.map((d,i) => ({
    x: pad.l + (i / (dados.length - 1)) * iw,
    y: pad.t + (1 - (d.val - min) / range) * ih,
    d,
  }))

  // Linha suave com curvas bezier
  const linePath = pts.map((p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cpx  = (prev.x + p.x) / 2
    return `C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(pad.t+ih).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.t+ih).toFixed(1)} Z`

  const gradId  = `grad_${color.replace('#','')}`
  const gradId2 = `grad2_${color.replace('#','')}`
  const svgH    = height

  // Grid lines horizontais (3 linhas)
  const gridLines = [0.25, 0.5, 0.75].map(t => pad.t + t * ih)

  return (
    <div ref={ref} style={{ position:'relative', width:'100%' }}>
      <svg width="100%" height={svgH} style={{ overflow:'visible', display:'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
            <stop offset="60%"  stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id={gradId2} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={color} stopOpacity="0.5" />
            <stop offset="50%"  stopColor={color} stopOpacity="1.0" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Grid lines horizontais */}
        {gridLines.map((y, i) => (
          <line key={i} x1={pad.l} y1={y} x2={pad.l + iw} y2={y}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* Área degradê */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Linha principal — animada */}
        <motion.path d={linePath} fill="none"
          stroke={`url(#${gradId2})`} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength:0, opacity:0 }}
          animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:1.4, ease:[0.22,1,0.36,1] }} />

        {/* Pontos interativos */}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1
          const isFirst = i === 0
          const isMid = i === Math.floor(pts.length / 2)
          const show = isLast || isFirst || isMid || dados.length <= 7
          return show ? (
            <g key={i}>
              {/* halo */}
              <circle cx={p.x} cy={p.y} r={isLast ? 10 : 7}
                fill={color} opacity="0.12" />
              {/* ponto */}
              <motion.circle cx={p.x} cy={p.y} r={isLast ? 5 : 3.5}
                fill={isLast ? color : 'transparent'}
                stroke={color} strokeWidth="2"
                initial={{ scale:0, opacity:0 }}
                animate={{ scale:1, opacity:1 }}
                transition={{ delay:0.9 + i*0.06 }} />
              {/* tooltip do ponto */}
              {(isLast || show) && (
                <g>
                  <rect x={p.x - 44} y={p.y - 36} width={88} height={22}
                    rx="6" fill="rgba(14,15,22,0.95)"
                    stroke={`${color}55`} strokeWidth="1" />
                  <text x={p.x} y={p.y - 20} textAnchor="middle"
                    fontSize="10" fill={color} fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="700">
                    {p.d.val > 999
                      ? `R$ ${(p.d.val/1000).toFixed(0)}k`
                      : p.d.val.toLocaleString('pt-BR')}
                  </text>
                  {isLast && periodo==='mensal' && receitaHoje > 0 && (
                    <g>
                      <rect x={p.x - 36} y={p.y + 10} width={72} height={17} rx="4"
                        fill="rgba(240,180,41,0.18)" stroke="rgba(240,180,41,0.5)" strokeWidth="0.8" />
                      <text x={p.x} y={p.y + 22} textAnchor="middle"
                        fontSize="9" fill="#f0b429" fontFamily="Plus Jakarta Sans,sans-serif" fontWeight="700">
                        {`Hoje R$ ${receitaHoje > 999 ? (receitaHoje/1000).toFixed(0)+'k' : receitaHoje}`}
                      </text>
                    </g>
                  )}
                </g>
              )}
            </g>
          ) : null
        })}

        {/* Labels eixo X */}
        {dados.map((d, i) => {
          const x = pad.l + (i / (dados.length - 1)) * iw
          const skip = dados.length > 12 && i % 2 !== 0
          return !skip ? (
            <text key={i} x={x} y={svgH - 4} textAnchor="middle"
              fontSize="10" fill={C.muted} fontFamily="Plus Jakarta Sans,sans-serif">
              {d.label || d.mes}
            </text>
          ) : null
        })}

        {/* Linha base */}
        <line x1={pad.l} y1={pad.t + ih} x2={pad.l + iw} y2={pad.t + ih}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Loader ─────────────────────────────────────────────────────
function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <motion.div style={{ width:40, height:40, borderRadius:'50%', border:'2.5px solid transparent', borderTopColor:C.gold }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )
}

// ── Stat Card — limpo estilo Apexify ──────────────────────────
function StatCard({ label, value, sub, color=C.gold, icon, trend, delay=0, compact=false }) {
  return (
    <motion.div
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      whileHover={{ y:-2 }}
      transition={{ delay, type:'spring', stiffness:300, damping:26 }}
      style={{ position:'relative', overflow:'hidden', borderRadius:14,
        padding: compact ? '16px 18px' : '20px 22px',
        background:`linear-gradient(180deg, ${color}3a 0%, ${color}12 40%, rgba(8,9,16,0.98) 80%)`,
        border:`1px solid ${color}45`,
        backdropFilter:'blur(24px)' }}>
      {/* Linha colorida topo */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent 0%,${color} 50%,transparent 100%)`,
        opacity:0.55 }} />
      {/* Orb sutil */}
      <div style={{ position:'absolute', top:-40, right:-40, width:100, height:100,
        borderRadius:'50%', background:color, filter:'blur(60px)', opacity:0.18, pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: compact ? 10 : 14 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:10.5, fontWeight:700, color:C.muted, textTransform:'uppercase',
              letterSpacing:'0.7px', margin:'0 0 8px' }}>{label}</p>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize: compact ? 20 : 26,
              fontWeight:700, color, lineHeight:1, margin:0,
              textShadow:`0 0 20px ${color}25` }}>{value}</p>
            {sub && <p style={{ fontSize:11, color:C.text2, margin:'5px 0 0' }}>{sub}</p>}
          </div>
          {icon && (
            <div style={{ width:38, height:38, borderRadius:10, background:`${color}15`,
              border:`1px solid ${color}25`, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:18, flexShrink:0 }}>{icon}</div>
          )}
        </div>
        {trend !== undefined && (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:11, fontWeight:700, color:trend>=0?C.green:C.red }}>
              {trend>=0?'↑':'↓'} {Math.abs(trend)}%
            </span>
            <span style={{ fontSize:10, color:C.muted }}>vs mês anterior</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Card ───────────────────────────────────────────────────────
function Card({ title, accent=C.gold, delay=0, children, style={}, right }) {
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      style={{ borderRadius:14, background:`linear-gradient(180deg, ${accent}35 0%, ${accent}10 45%, rgba(8,9,16,0.97) 80%)`,
        border:`1px solid ${accent}40`,
        backdropFilter:'blur(24px)', position:'relative', overflow:'hidden', ...style }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent 0%,${accent} 50%,transparent 100%)`,
        opacity:0.55 }} />
      {(title || right) && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'18px 20px 0' }}>
          {title && <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:13.5,
            color:C.text, margin:0 }}>{title}</h3>}
          {right}
        </div>
      )}
      <div style={{ padding: title || right ? '14px 20px 18px' : '18px 20px' }}>{children}</div>
    </motion.div>
  )
}

// ── Progress Bar ───────────────────────────────────────────────
function ProgressBar({ label, atual, meta, cor }) {
  const pct = meta>0 ? Math.min((atual/meta)*100, 100) : 0
  const c   = cor||(pct>=100?C.green:pct>=60?C.gold:C.red)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12, color:C.text2 }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color:c }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height:5, background:'rgba(0,0,0,0.35)', borderRadius:5, overflow:'hidden' }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:1.1, ease:[0.22,1,0.36,1], delay:0.5 }}
          style={{ height:'100%', borderRadius:5, background:`linear-gradient(90deg,${c},${c}bb)` }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
        <span style={{ fontSize:10, color:C.muted }}>
          {typeof atual==='number'&&atual>999 ? atual.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : atual}
        </span>
        <span style={{ fontSize:10, color:C.muted }}>
          meta: {typeof meta==='number'&&meta>999 ? meta.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : meta}
        </span>
      </div>
    </div>
  )
}

// ── Badge status ───────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    Fechados:   [C.green,  'rgba(0,200,150,0.12)'],
    Novos:      [C.blue,   'rgba(77,159,255,0.12)'],
    Negociacao: [C.orange, 'rgba(255,140,66,0.12)'],
    Contato:    [C.gold,   'rgba(240,180,41,0.12)'],
    Perdidos:   [C.red,    'rgba(255,77,106,0.12)'],
  }
  const [color, bg] = map[status] || [C.muted, 'rgba(76,80,112,0.12)']
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10.5, fontWeight:700,
      padding:'3px 8px', borderRadius:99, background:bg, color }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:color, flexShrink:0 }} />
      {status}
    </span>
  )
}

// ── Tabs ───────────────────────────────────────────────────────
function Tabs({ items, active, onChange, small=false }) {
  return (
    <div style={{ display:'flex', gap:2, padding:'3px', background:'rgba(0,0,0,0.25)',
      borderRadius:10, border:`1px solid ${C.border}`, width:'fit-content' }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onChange(item.id)}
          style={{ padding: small ? '5px 12px' : '6px 14px',
            borderRadius:8, border:'none', cursor:'pointer',
            fontSize: small ? 11.5 : 12.5, fontWeight:600, fontFamily:'Plus Jakarta Sans,sans-serif',
            transition:'all 0.2s',
            background: active===item.id ? 'rgba(240,180,41,0.14)' : 'transparent',
            color: active===item.id ? C.gold : C.muted,
            outline:'none' }}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ── Tabela de leads ────────────────────────────────────────────
function LeadsTable({ leads=[] }) {
  if (!leads.length) return (
    <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'28px 0' }}>
      <div style={{ fontSize:28, marginBottom:8, opacity:0.3 }}>📋</div>
      Nenhum lead cadastrado
    </div>
  )
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr>
            {['Lead','Produto','Status','Valor','Data'].map(h => (
              <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10,
                fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.6px',
                borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((l, i) => (
            <motion.tr key={l.id}
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.02 }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
              style={{ borderBottom:`1px solid rgba(30,32,48,0.5)`, transition:'background 0.15s' }}>
              <td style={{ padding:'10px 12px' }}>
                <span style={{ fontWeight:600, color:C.text, display:'block',
                  maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.nome}</span>
              </td>
              <td style={{ padding:'10px 12px', color:C.text2 }}>{l.produto||'—'}</td>
              <td style={{ padding:'10px 12px' }}><Badge status={l.status} /></td>
              <td style={{ padding:'10px 12px', fontWeight:700, color:C.green }}>
                {parseFloat(l.valor)>0 ? `R$ ${parseFloat(l.valor).toLocaleString('pt-BR',{maximumFractionDigits:0})}` : '—'}
              </td>
              <td style={{ padding:'10px 12px', color:C.muted, whiteSpace:'nowrap', fontSize:12 }}>
                {l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—'}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Processa dados por período ─────────────────────────────────
function processarDados(fechados, periodo) {
  const now  = new Date()
  const map  = {}

  if (periodo === 'mensal') {
    // Últimos 30 dias — agrupado por semana com datas reais
    for (let i=4; i>=0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i*7)
      const k = `sem-${4-i}`
      const dia = d.getDate().toString().padStart(2,'0')
      const mes = (d.getMonth()+1).toString().padStart(2,'0')
      map[k] = { label: `${dia}/${mes}`, val:0, isHoje: i===0 }
    }
    fechados.forEach(l => {
      const d    = new Date(l.created_at||Date.now())
      const diff = Math.floor((now - d) / (7*24*60*60*1000))
      if (diff < 5) {
        const k = `sem-${diff}`
        if (map[k]) map[k].val += parseFloat(l.valor)||0
      }
    })
  } else if (periodo === 'semestral') {
    // Últimos 6 meses
    for (let i=5; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[k] = { label: d.toLocaleDateString('pt-BR',{month:'short'}), val:0 }
    }
    fechados.forEach(l => {
      const d = new Date(l.created_at||Date.now())
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (map[k]) map[k].val += parseFloat(l.valor)||0
    })
  } else {
    // Anual — últimos 12 meses
    for (let i=11; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[k] = { label: d.toLocaleDateString('pt-BR',{month:'short'}), val:0 }
    }
    fechados.forEach(l => {
      const d = new Date(l.created_at||Date.now())
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (map[k]) map[k].val += parseFloat(l.valor)||0
    })
  }

  return Object.values(map)
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD GESTOR
// ══════════════════════════════════════════════════════════════
function DashboardGestor({ perfil }) {
  const [leads,     setLeads]     = useState([])
  const [equipe,    setEquipe]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('overview')
  const [periodo,   setPeriodo]   = useState('semestral')
  const [metaEdit,  setMetaEdit]  = useState(null) // 'receita'|'fechados'|'conversao'|'leads'|null
  const [metaInput, setMetaInput] = useState('')
  const [salvando,  setSalvando]  = useState(false)
  const [metas, setMetas] = useState({
    receita:  null, // null = usa perfil.meta_mensal
    fechados: 30,
    conversao:30,
    leads:    200,
  })

  useEffect(() => { carregar() }, [])

  async function salvarMeta(campo) {
    const raw = metaInput.replace(/[^\d,.]/g,'').replace(',','.')
    const val = parseFloat(raw)
    if (!val || val <= 0) return
    setSalvando(true)
    try {
      if (campo === 'receita') {
        await supabase.from('profiles').update({ meta_mensal: val }).eq('id', perfil.id)
        perfil.meta_mensal = val
      }
      setMetas(m => ({ ...m, [campo]: val }))
    } catch(e) { console.error(e) }
    setSalvando(false)
    setMetaEdit(null)
  }

  async function carregar() {
    try {
      const [{ data: l }, { data: p }] = await Promise.all([
        supabase.from('leads').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('*'),
      ])
      setLeads(l||[]); setEquipe(p||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fechados   = leads.filter(l=>l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
  const pendentes  = leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado)
  const perdidos   = leads.filter(l=>l.status==='Perdidos')
  const inad       = leads.filter(l=>l.is_inadimplente&&!l.estornado)
  const emAberto   = leads.filter(l=>!['Fechados','Perdidos'].includes(l.status))
  const total      = leads.length
  const receita    = fechados.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const valorPerdas= perdidos.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const taxaConv   = total>0 ? Math.round((fechados.length/total)*100) : 0
  const ticket     = fechados.length>0 ? Math.round(receita/fechados.length) : 0
  const metaReceita = perfil?.meta_mensal ? parseFloat(perfil.meta_mensal) : 50000
  const forecast   = leads.filter(l=>l.status==='Negociacao').reduce((s,l)=>s+(parseFloat(l.valor)||0),0)*0.5
                   + leads.filter(l=>l.status==='Novos').reduce((s,l)=>s+(parseFloat(l.valor)||0),0)*0.1

  const hoje = new Date()
  const todayStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`
  const receitaHoje = fechados
    .filter(l => l.created_at && l.created_at.startsWith(todayStr))
    .reduce((s,l) => s+(parseFloat(l.valor)||0), 0)

  const dadosGrafico = processarDados(fechados, periodo)
  const receitaMes   = dadosGrafico[dadosGrafico.length-1]?.val || 0

  const topVendedores = equipe.map(p => {
    const f = leads.filter(l=>l.user_id===p.id&&l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
    return { ...p, receita:f.reduce((s,l)=>s+(parseFloat(l.valor)||0),0), fechados:f.length, total:leads.filter(l=>l.user_id===p.id).length }
  }).sort((a,b)=>b.receita-a.receita).slice(0,5)

  const motivosPerda = (() => {
    const m = {}; perdidos.forEach(l=>{ const k=l.motivo_perda||'Sem registro'; m[k]=(m[k]||0)+1 })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4)
  })()

  const porProduto = (() => {
    const m = {}; fechados.forEach(l=>{ const k=l.produto||'Sem produto'; m[k]=(m[k]||0)+(parseFloat(l.valor)||0) })
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4)
  })()

  if (loading) return <Loader />

  return (
    <div style={{ paddingBottom:24 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700,
            color:C.text, letterSpacing:'-0.5px', margin:0 }}>Painel Geral</h1>
          <p style={{ fontSize:12.5, color:C.muted, marginTop:4 }}>
            {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <motion.div animate={{ opacity:[1,0.55,1] }} transition={{ duration:2.5, repeat:Infinity }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:99,
              fontSize:11.5, fontWeight:700, color:C.green, background:'rgba(0,200,150,0.09)',
              border:'1px solid rgba(0,200,150,0.20)' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:C.green, boxShadow:`0 0 6px ${C.green}` }} />
            Ao vivo
          </motion.div>
          <Tabs items={[{id:'overview',label:'Overview'},{id:'equipe',label:'Equipe'},{id:'historico',label:'Histórico'}]} active={tab} onChange={setTab} />
        </div>
      </div>

      {/* Stats Linha 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
        <StatCard delay={0}    label="Receita Total"  value={receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color={C.gold}   icon="💰" sub={`${fechados.length} vendas fechadas`} trend={8} />
        <StatCard delay={0.07} label="Total de Leads" value={total}           color={C.blue}   icon="👥" sub={`${emAberto.length} em andamento`} />
        <StatCard delay={0.14} label="Taxa Conversão" value={`${taxaConv}%`} color={C.green}  icon="📈" sub={`ticket R$ ${ticket.toLocaleString('pt-BR',{maximumFractionDigits:0})}`} />
        <StatCard delay={0.21} label="Perdas"         value={perdidos.length} color={C.red}    icon="❌" sub={valorPerdas>0?valorPerdas.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'sem perdas'} />
      </div>

      {/* Stats Linha 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        <StatCard delay={0.1}  label="Pendentes"     value={pendentes.length} color={C.orange} icon="⏳" sub="aguardando aprovação" compact />
        <StatCard delay={0.15} label="Inadimplentes" value={inad.length}      color={C.red}    icon="⚠️" sub="pagamentos em atraso" compact />
        <StatCard delay={0.2}  label="Forecast"      value={forecast.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color={C.blue} icon="🔮" sub="projeção de fechamento" compact />
        <StatCard delay={0.25} label="Receita do Mês" value={receitaMes.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color={C.green} icon="📅" sub="período selecionado" compact />
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            {/* Gráfico + Meta + Funil */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:12 }}>

              {/* Gráfico de Área — estilo Apexify */}
              <Card accent={C.gold} delay={0.28}
                title="Receita"
                right={
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700,
                        color:C.gold, margin:0, lineHeight:1 }}>
                        {receitaMes.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                      </p>
                      <p style={{ fontSize:10, color:C.green, fontWeight:600, margin:0 }}>↑ este período</p>
                    </div>
                    <Tabs small
                      items={[{id:'mensal',label:'Mês'},{id:'semestral',label:'Semestral'},{id:'anual',label:'Anual'}]}
                      active={periodo} onChange={setPeriodo} />
                  </div>
                }>
                <AreaChart dados={dadosGrafico} color={C.gold} height={170} periodo={periodo} receitaHoje={receitaHoje} />
              </Card>

              <Card accent={C.green} delay={0.34} title="Meta da Equipe">
                {[
                  { campo:'receita',   label:'Receita',   atual:receitaMes,      meta:metas.receita||metaReceita, cor:C.green },
                  { campo:'fechados',  label:'Fechados',  atual:fechados.length, meta:metas.fechados,             cor:C.gold  },
                  { campo:'conversao', label:'Conversão', atual:taxaConv,        meta:metas.conversao,            cor:C.purple},
                  { campo:'leads',     label:'Leads',     atual:total,           meta:metas.leads,                cor:C.blue  },
                ].map(({ campo, label, atual, meta, cor }) => {
                  const pct = meta>0 ? Math.min((atual/meta)*100,100) : 0
                  const barCor = pct>=100?C.green:pct>=60?cor:C.red
                  const editando = metaEdit===campo
                  return (
                    <div key={campo} style={{ marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                        <span style={{ fontSize:12, color:C.text2, fontFamily:'Plus Jakarta Sans,sans-serif' }}>{label}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {editando ? (
                            <>
                              <input value={metaInput} onChange={e=>setMetaInput(e.target.value)}
                                onKeyDown={e=>e.key==='Enter'&&salvarMeta(campo)}
                                autoFocus placeholder={String(meta)}
                                style={{ width:80, padding:'2px 7px', borderRadius:6, fontSize:11.5,
                                  border:`1px solid ${cor}55`, background:`${cor}10`,
                                  color:C.text, fontFamily:'Plus Jakarta Sans,sans-serif', outline:'none' }} />
                              <button onClick={()=>salvarMeta(campo)} disabled={salvando}
                                style={{ padding:'2px 8px', borderRadius:6, border:'none', cursor:'pointer',
                                  background:cor, color:'#060609', fontWeight:700, fontSize:11,
                                  fontFamily:'Plus Jakarta Sans,sans-serif' }}>
                                {salvando?'...':'✓'}
                              </button>
                              <button onClick={()=>setMetaEdit(null)}
                                style={{ padding:'2px 6px', borderRadius:6, border:`1px solid ${C.border}`,
                                  background:'transparent', color:C.muted, cursor:'pointer', fontSize:11 }}>✕</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize:12, fontWeight:700, color:barCor, fontVariantNumeric:'tabular-nums' }}>{Math.round(pct)}%</span>
                              <button onClick={()=>{ setMetaInput(String(meta)); setMetaEdit(campo) }}
                                style={{ padding:'1px 7px', borderRadius:5, border:`1px solid ${cor}30`,
                                  background:`${cor}0a`, color:cor, cursor:'pointer',
                                  fontSize:10, fontWeight:700, fontFamily:'Plus Jakarta Sans,sans-serif' }}>
                                ✎
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ height:5, background:'rgba(0,0,0,0.35)', borderRadius:5, overflow:'hidden' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                          transition={{ duration:1.1, ease:[0.22,1,0.36,1], delay:0.4 }}
                          style={{ height:'100%', background:`linear-gradient(90deg,${barCor},${barCor}bb)`, borderRadius:5 }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                        <span style={{ fontSize:10, color:C.muted, fontVariantNumeric:'tabular-nums' }}>
                          {typeof atual==='number'&&atual>999
                            ? atual.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
                            : atual}
                        </span>
                        <span style={{ fontSize:10, color:C.muted, fontVariantNumeric:'tabular-nums' }}>
                          meta: {typeof meta==='number'&&meta>999
                            ? meta.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})
                            : meta}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </Card>

              <Card title="Funil Geral" accent={C.blue} delay={0.38}>
                {[
                  { label:'Novos',      val:leads.filter(l=>l.status==='Novos').length,      cor:C.blue },
                  { label:'Contato',    val:leads.filter(l=>l.status==='Contato').length,    cor:C.gold },
                  { label:'Negociação', val:leads.filter(l=>l.status==='Negociacao').length, cor:C.orange },
                  { label:'Fechados',   val:fechados.length,                                  cor:C.green },
                  { label:'Perdidos',   val:perdidos.length,                                  cor:C.red },
                ].map(item=>(
                  <div key={item.label} style={{ marginBottom:11 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.text2 }}>{item.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:item.cor }}>{item.val}</span>
                    </div>
                    <div style={{ height:4, background:'rgba(0,0,0,0.35)', borderRadius:4, overflow:'hidden' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:total>0?`${(item.val/total)*100}%`:'0%' }}
                        transition={{ duration:1, delay:0.6 }}
                        style={{ height:'100%', background:item.cor, borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Top Vendedores + Motivos + Produtos */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <Card title="Top Vendedores" accent={C.gold} delay={0.42}>
                {topVendedores.filter(v=>v.receita>0).length===0
                  ? <p style={{ color:C.muted, fontSize:13 }}>Sem dados ainda.</p>
                  : topVendedores.filter(v=>v.receita>0).map((v,i)=>(
                  <motion.div key={v.id} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.5+i*0.06 }}
                    style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, padding:'9px 10px',
                      borderRadius:10, background:i===0?'rgba(240,180,41,0.06)':'rgba(255,255,255,0.02)',
                      border:`1px solid ${i===0?'rgba(240,180,41,0.16)':C.border}` }}>
                    <span style={{ fontSize:14, width:20, flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, fontWeight:600, color:C.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.full_name||'—'}</p>
                      <p style={{ fontSize:10.5, color:C.muted, margin:0 }}>{v.fechados} fechados</p>
                    </div>
                    <span style={{ fontSize:11.5, fontWeight:700, color:C.green, flexShrink:0 }}>
                      {v.receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                    </span>
                  </motion.div>
                ))}
              </Card>

              <Card title="Motivos de Perda" accent={C.red} delay={0.46}>
                {motivosPerda.length===0
                  ? <div style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'16px 0' }}>
                      <div style={{ fontSize:26, opacity:0.3, marginBottom:6 }}>🎉</div>
                      Nenhuma perda
                    </div>
                  : motivosPerda.map(([motivo,qtd],i)=>(
                  <div key={motivo} style={{ marginBottom:11 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.text2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'72%' }}>{motivo}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.red }}>{qtd}</span>
                    </div>
                    <div style={{ height:4, background:'rgba(0,0,0,0.35)', borderRadius:4, overflow:'hidden' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:`${(qtd/Math.max(...motivosPerda.map(([,v])=>v)))*100}%`}}
                        transition={{ duration:0.9, delay:0.5+i*0.08 }}
                        style={{ height:'100%', background:C.red, borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="Receita por Produto" accent={C.purple} delay={0.5}>
                {porProduto.length===0
                  ? <p style={{ color:C.muted, fontSize:13 }}>Sem dados de produtos.</p>
                  : porProduto.map(([prod,val],i)=>(
                  <div key={prod} style={{ marginBottom:11 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.text2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'58%' }}>{prod}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.purple }}>
                        {val.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                      </span>
                    </div>
                    <div style={{ height:4, background:'rgba(0,0,0,0.35)', borderRadius:4, overflow:'hidden' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:receita>0?`${(val/receita)*100}%`:'0%'}}
                        transition={{ duration:0.9, delay:0.5+i*0.08 }}
                        style={{ height:'100%', background:`linear-gradient(90deg,${C.purple},#7c3aed)`, borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Atividade recente */}
            <Card title="Atividade Recente" accent={C.orange} delay={0.55}>
              <LeadsTable leads={leads.slice(0,10)} />
            </Card>
          </motion.div>
        )}

        {tab === 'equipe' && (
          <motion.div key="equipe" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {equipe.map((m, i) => {
                const mLeads = leads.filter(l=>l.user_id===m.id)
                const mFech  = mLeads.filter(l=>l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
                const mRec   = mFech.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
                const mConv  = mLeads.length>0?Math.round((mFech.length/mLeads.length)*100):0
                return (
                  <motion.div key={m.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
                    style={{ padding:'18px', borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${C.gold},transparent)`, opacity:0.35 }} />
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(240,180,41,0.13)', border:'1px solid rgba(240,180,41,0.24)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:700, color:C.gold, fontSize:15 }}>
                        {m.full_name?.[0]?.toUpperCase()||'?'}
                      </div>
                      <div>
                        <p style={{ fontSize:13.5, fontWeight:700, color:C.text, margin:0 }}>{m.full_name||'—'}</p>
                        <p style={{ fontSize:11, color:C.muted, margin:0 }}>{m.role||'vendedor'}</p>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                      {[{l:'Leads',v:mLeads.length,c:C.blue},{l:'Fechados',v:mFech.length,c:C.green},{l:'Conv.',v:`${mConv}%`,c:C.gold}].map(s=>(
                        <div key={s.l} style={{ textAlign:'center', padding:'7px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}` }}>
                          <p style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:s.c, margin:0 }}>{s.v}</p>
                          <p style={{ fontSize:10, color:C.muted, margin:0 }}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:'8px 10px', borderRadius:8, background:'rgba(0,200,150,0.07)', border:'1px solid rgba(0,200,150,0.14)' }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:C.green, margin:0 }}>
                        {mRec.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                      </p>
                      <p style={{ fontSize:10, color:C.muted, margin:0 }}>receita gerada</p>
                    </div>
                  </motion.div>
                )
              })}
              {!equipe.length && <p style={{ color:C.muted, fontSize:13, gridColumn:'1/-1', textAlign:'center', padding:'40px 0' }}>Nenhum membro na equipe ainda.</p>}
            </div>
          </motion.div>
        )}

        {tab === 'historico' && (
          <motion.div key="historico" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <Card title="Histórico Completo de Leads" accent={C.gold} delay={0.1}>
              <LeadsTable leads={leads} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD VENDEDOR
// ══════════════════════════════════════════════════════════════
function DashboardVendedor({ perfil }) {
  const [leads,   setLeads]   = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('overview')
  const [periodo, setPeriodo] = useState('semestral')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const [{ data: l }, { data: todos }] = await Promise.all([
        supabase.from('leads').select('*').eq('user_id', perfil.id).order('created_at',{ascending:false}),
        supabase.from('leads').select('user_id,valor,status,aprovado,estornado'),
      ])
      setLeads(l||[])
      const { data: perfis } = await supabase.from('profiles').select('id,full_name')
      const rank = (perfis||[]).map(p => {
        const pL = (todos||[]).filter(x=>x.user_id===p.id&&x.status==='Fechados'&&x.aprovado===true&&!x.estornado)
        return { id:p.id, nome:p.full_name, receita:pL.reduce((s,x)=>s+(parseFloat(x.valor)||0),0) }
      }).sort((a,b)=>b.receita-a.receita)
      setRanking(rank)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fechados  = leads.filter(l=>l.status==='Fechados'&&l.aprovado===true&&!l.estornado)
  const pendentes = leads.filter(l=>l.status==='Fechados'&&(l.aprovado===false||l.aprovado===null)&&!l.estornado)
  const perdidos  = leads.filter(l=>l.status==='Perdidos')
  const emAberto  = leads.filter(l=>!['Fechados','Perdidos'].includes(l.status))
  const total     = leads.length
  const receita   = fechados.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const taxaConv  = total>0 ? Math.round((fechados.length/total)*100) : 0
  const ticket    = fechados.length>0 ? Math.round(receita/fechados.length) : 0
  const metaReceita = perfil?.meta_mensal ? parseFloat(perfil.meta_mensal) : 10000
  const valorPerd = perdidos.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const posRank   = ranking.findIndex(r=>r.id===perfil.id)+1

  const hoje = new Date(); const em7 = new Date(hoje); em7.setDate(em7.getDate()+7)
  const followUps = leads.filter(l => { if(!l.data_followup) return false; const d=new Date(l.data_followup+'T12:00:00'); return d>=hoje&&d<=em7 }).sort((a,b)=>new Date(a.data_followup)-new Date(b.data_followup))

  const dadosGrafico = processarDados(fechados, periodo)
  const receitaPeriodo = dadosGrafico[dadosGrafico.length-1]?.val || 0

  if (loading) return <Loader />

  return (
    <div style={{ paddingBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:C.text, letterSpacing:'-0.5px', margin:0 }}>
            Olá, {perfil?.full_name?.split(' ')[0]||'Vendedor'} 👋
          </h1>
          <p style={{ fontSize:12.5, color:C.muted, marginTop:4 }}>{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {posRank>0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:12,
              background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.18)' }}>
              <span style={{ fontSize:16 }}>{posRank===1?'🥇':posRank===2?'🥈':posRank===3?'🥉':'🏅'}</span>
              <div>
                <p style={{ fontSize:10, color:C.muted, margin:0 }}>Ranking</p>
                <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:C.gold, margin:0 }}>#{posRank}° lugar</p>
              </div>
            </div>
          )}
          <Tabs items={[{id:'overview',label:'Overview'},{id:'pipeline',label:'Pipeline'},{id:'historico',label:'Histórico'}]} active={tab} onChange={setTab} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        <StatCard delay={0}    label="Minha Receita"  value={receita.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})} color={C.gold}  icon="💰" sub={`${fechados.length} vendas`} trend={5} />
        <StatCard delay={0.07} label="Leads Abertos"  value={emAberto.length}  color={C.blue}  icon="📋" sub={`${total} total`} />
        <StatCard delay={0.14} label="Conversão"       value={`${taxaConv}%`} color={C.green} icon="📈" sub={`ticket R$ ${ticket.toLocaleString('pt-BR',{maximumFractionDigits:0})}`} />
        <StatCard delay={0.21} label="Perdas"          value={perdidos.length}  color={C.red}   icon="❌" sub={valorPerd>0?valorPerd.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'sem perdas'} />
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <Card accent={C.gold} delay={0.28} title="Minha Receita"
                right={
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:C.gold, margin:0, lineHeight:1 }}>
                        {receitaPeriodo.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}
                      </p>
                      <p style={{ fontSize:10, color:C.green, fontWeight:600, margin:0 }}>↑ período atual</p>
                    </div>
                    <Tabs small items={[{id:'mensal',label:'Mês'},{id:'semestral',label:'Semestral'},{id:'anual',label:'Anual'}]} active={periodo} onChange={setPeriodo} />
                  </div>
                }>
                <AreaChart dados={dadosGrafico} color={C.gold} height={170} />
              </Card>
              <Card title="Minha Meta" accent={C.green} delay={0.34}>
                <ProgressBar label="Receita"   atual={receita}         meta={metaReceita} />
                <ProgressBar label="Fechados"  atual={fechados.length} meta={10} />
                <ProgressBar label="Conversão" atual={taxaConv}        meta={30} cor={C.purple} />
                {pendentes.length>0 && (
                  <div style={{ marginTop:12, padding:'8px 10px', borderRadius:9, background:'rgba(255,140,66,0.08)', border:'1px solid rgba(255,140,66,0.18)' }}>
                    <p style={{ fontSize:11.5, color:C.orange, margin:0 }}>⏳ {pendentes.length} aguardando aprovação</p>
                  </div>
                )}
              </Card>
              <Card title="Follow-ups" accent={C.purple} delay={0.38}>
                {followUps.length===0
                  ? <div style={{ textAlign:'center', color:C.muted, padding:'18px 0' }}><div style={{ fontSize:24, opacity:0.3, marginBottom:6 }}>📅</div><p style={{ fontSize:12 }}>Nenhum nos próximos 7 dias</p></div>
                  : followUps.slice(0,5).map((l,i)=>(
                  <motion.div key={l.id} initial={{ opacity:0, x:-4 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4+i*0.05 }}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                    <div>
                      <p style={{ fontSize:12.5, fontWeight:600, color:C.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{l.nome}</p>
                      <p style={{ fontSize:11, color:C.muted, margin:0 }}>{l.produto||'—'}</p>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:C.purple, flexShrink:0 }}>
                      {new Date(l.data_followup+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
                    </span>
                  </motion.div>
                ))}
              </Card>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12 }}>
              <Card title="Meu Funil" accent={C.blue} delay={0.42}>
                {[
                  { label:'Novos',      val:leads.filter(l=>l.status==='Novos').length,      cor:C.blue },
                  { label:'Em Contato', val:leads.filter(l=>l.status==='Contato').length,    cor:C.gold },
                  { label:'Negociação', val:leads.filter(l=>l.status==='Negociacao').length, cor:C.orange },
                  { label:'Fechados',   val:fechados.length,                                  cor:C.green },
                  { label:'Perdidos',   val:perdidos.length,                                  cor:C.red },
                ].map(item=>(
                  <div key={item.label} style={{ marginBottom:11 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.text2 }}>{item.label}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:item.cor }}>{item.val}</span>
                    </div>
                    <div style={{ height:4, background:'rgba(0,0,0,0.35)', borderRadius:4, overflow:'hidden' }}>
                      <motion.div initial={{ width:0 }} animate={{ width:total>0?`${(item.val/total)*100}%`:'0%' }}
                        transition={{ duration:1, delay:0.6 }}
                        style={{ height:'100%', background:item.cor, borderRadius:4 }} />
                    </div>
                  </div>
                ))}
              </Card>
              <Card title="Meus Últimos Leads" accent={C.orange} delay={0.48}>
                <LeadsTable leads={leads.slice(0,8)} />
              </Card>
            </div>
          </motion.div>
        )}

        {tab === 'pipeline' && (
          <motion.div key="pipeline" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[
                { label:'Em Aberto',  ls:emAberto,  color:C.blue,   icon:'📋' },
                { label:'Pendentes',  ls:pendentes, color:C.orange, icon:'⏳' },
                { label:'Perdidos',   ls:perdidos,  color:C.red,    icon:'❌' },
              ].map(col=>(
                <Card key={col.label} title={`${col.icon} ${col.label} (${col.ls.length})`} accent={col.color} delay={0.1}>
                  {col.ls.slice(0,6).map((l,i)=>(
                    <motion.div key={l.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                      style={{ padding:'9px 11px', borderRadius:9, marginBottom:7,
                        background:'rgba(255,255,255,0.025)', border:`1px solid ${C.border}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <p style={{ fontSize:12.5, fontWeight:600, color:C.text, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{l.nome}</p>
                        {parseFloat(l.valor)>0 && <span style={{ fontSize:11.5, fontWeight:700, color:C.green }}>R$ {parseFloat(l.valor).toLocaleString('pt-BR',{maximumFractionDigits:0})}</span>}
                      </div>
                      <p style={{ fontSize:11, color:C.muted, margin:'3px 0 0' }}>{l.produto||'—'}</p>
                    </motion.div>
                  ))}
                  {!col.ls.length && <p style={{ fontSize:12, color:C.muted, textAlign:'center', padding:'18px 0' }}>Vazio</p>}
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'historico' && (
          <motion.div key="historico" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
            <Card title="Histórico de Leads" accent={C.gold} delay={0.1}>
              <LeadsTable leads={leads} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════
export function DashboardPage({ perfil }) {
  const isGestor = ['gestor_geral','gestor_sub'].includes(perfil?.role)
  return isGestor ? <DashboardGestor perfil={perfil} /> : <DashboardVendedor perfil={perfil} />
}