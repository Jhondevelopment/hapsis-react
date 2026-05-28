import { motion } from 'framer-motion'

export function Topbar({ perfil, onSignOut }) {
  const inicial   = perfil?.full_name?.[0]?.toUpperCase() || '?'
  const roleLabel = { gestor_geral:'Gestor Geral', gestor_sub:'Sub Gerente', vendedor:'Vendedor' }[perfil?.role] || perfil?.role

  return (
    <header style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', height:60, flexShrink:0, zIndex:100, background:'rgba(6,6,9,0.92)', backdropFilter:'blur(36px) saturate(200%)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.10) 22%,rgba(240,180,41,0.32) 50%,rgba(240,180,41,0.10) 78%,transparent)', pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, width:200, flexShrink:0 }}>
        <motion.div
          style={{ width:30, height:30, borderRadius:8, display:'grid', placeItems:'center', fontSize:14, fontWeight:900, color:'#060709', background:'linear-gradient(135deg,#f0b429,#c9960e)', position:'relative', overflow:'hidden', flexShrink:0 }}
          animate={{ boxShadow:['0 0 22px rgba(240,180,41,0.44)','0 0 38px rgba(240,180,41,0.76)','0 0 22px rgba(240,180,41,0.44)'] }}
          transition={{ duration:4, repeat:Infinity }}
        >
          <span style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.20),transparent)' }} />
          H
        </motion.div>
        <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:16, letterSpacing:'1.8px', color:'#fff' }}>
          HAPSIS
        </span>
      </div>

      {/* Busca */}
      <div style={{ position:'relative', flex:1, maxWidth:440 }}>
        <input
          placeholder="Buscar leads, clientes..."
          style={{ width:'100%', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'9px 20px', color:'#f0f1ff', fontFamily:'inherit', fontSize:13.5, outline:'none' }}
        />
      </div>

      {/* Usuário */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ textAlign:'right', lineHeight:1.2 }}>
          <p style={{ fontSize:13.5, fontWeight:600, color:'#fff' }}>{perfil?.full_name || 'Usuário'}</p>
          <p style={{ fontSize:11, color:'#4c5070' }}>{roleLabel}</p>
        </div>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(240,180,41,0.14)', border:'1px solid rgba(240,180,41,0.28)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontFamily:'Syne,sans-serif', color:'#f0b429', fontSize:14 }}>
          {inicial}
        </div>
        <button
          onClick={onSignOut}
          style={{ width:36, height:36, borderRadius:'50%', display:'grid', placeItems:'center', background:'rgba(255,77,106,0.10)', border:'1px solid rgba(255,77,106,0.22)', color:'#ff4d6a', cursor:'pointer', fontSize:16 }}
        >
          ✕
        </button>
      </div>
    </header>
  )
}