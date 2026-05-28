import { motion } from 'framer-motion'
import { useLeads } from '../hooks/useLeads'

export function AgendaPage({ perfil }) {
  const { leads, loading } = useLeads(perfil)

  const hoje   = new Date().toISOString().split('T')[0]
  const grupos = {
    atrasados: leads.filter(l => l.data_followup && l.data_followup < hoje && l.status !== 'Fechados' && l.status !== 'Perdidos'),
    hoje:      leads.filter(l => l.data_followup === hoje),
    futuros:   leads.filter(l => l.data_followup && l.data_followup > hoje),
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <motion.div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'#fff' }}>Agenda</h1>
        <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Follow-ups e compromissos do pipeline</p>
      </div>

      {grupos.atrasados.length > 0 && (
        <div style={{ marginBottom:22 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#ff4d6a', display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(255,77,106,0.22)' }}>
            ⚠️ Atrasados ({grupos.atrasados.length})
          </h3>
          {grupos.atrasados.map(l => <AgendaItem key={l.id} lead={l} tipo="atrasado" />)}
        </div>
      )}

      {grupos.hoje.length > 0 && (
        <div style={{ marginBottom:22 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#f0b429', display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(240,180,41,0.22)' }}>
            📅 Hoje ({grupos.hoje.length})
          </h3>
          {grupos.hoje.map(l => <AgendaItem key={l.id} lead={l} tipo="hoje" />)}
        </div>
      )}

      {grupos.futuros.length > 0 && (
        <div style={{ marginBottom:22 }}>
          <h3 style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#f0f1ff', display:'flex', alignItems:'center', gap:8, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            🗓️ Próximos ({grupos.futuros.length})
          </h3>
          {grupos.futuros.map(l => <AgendaItem key={l.id} lead={l} tipo="futuro" />)}
        </div>
      )}

      {Object.values(grupos).every(g => g.length === 0) && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, color:'#323448' }}>
          <span style={{ fontSize:48, marginBottom:12, opacity:0.35 }}>📅</span>
          <p style={{ fontSize:13 }}>Nenhum follow-up agendado</p>
        </div>
      )}
    </div>
  )
}

function AgendaItem({ lead, tipo }) {
  const cores = { atrasado:'#ff4d6a', hoje:'#f0b429', futuro:'#4c5070' }
  const cor   = cores[tipo]

  return (
    <motion.div whileHover={{ x:6 }}
      style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', borderRadius:10, background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))', backdropFilter:'blur(24px)', border:`1px solid #1e2030`, borderLeft:`2.5px solid ${cor}`, marginBottom:8 }}>
      <div>
        <p style={{ fontWeight:700, fontSize:14, color:'#f0f1ff' }}>{lead.nome}</p>
        {lead.produto && <p style={{ fontSize:12, color:'#8f94b0', marginTop:3 }}>📦 {lead.produto}</p>}
      </div>
      <div style={{ textAlign:'right' }}>
        <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:6, background: tipo==='atrasado'?'rgba(255,77,106,0.14)':tipo==='hoje'?'rgba(240,180,41,0.14)':'rgba(76,80,112,0.18)', color:cor }}>
          {tipo==='atrasado' ? '⚠️ Atrasado' : tipo==='hoje' ? '🎯 Hoje' : '📅 '+new Date(lead.data_followup).toLocaleDateString('pt-BR')}
        </span>
        {lead.valor && <p style={{ fontSize:12, color:'#00c896', fontWeight:700, marginTop:4 }}>R$ {parseFloat(lead.valor).toLocaleString('pt-BR')}</p>}
      </div>
    </motion.div>
  )
}