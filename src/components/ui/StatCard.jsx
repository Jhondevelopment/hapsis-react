import { motion } from 'framer-motion'

const colors = {
  default:{ line:'#f0b429', shadow:'rgba(240,180,41,0.055)', color:'#f0f1ff' },
  green:  { line:'#00c896', shadow:'rgba(0,200,150,0.055)',  color:'#00c896' },
  blue:   { line:'#4d9fff', shadow:'rgba(77,159,255,0.055)', color:'#4d9fff' },
  orange: { line:'#ff8c42', shadow:'rgba(255,140,66,0.055)', color:'#ff8c42' },
  red:    { line:'#ff4d6a', shadow:'rgba(255,77,106,0.055)', color:'#ff4d6a' },
  purple: { line:'#9d6fff', shadow:'rgba(157,111,255,0.055)',color:'#9d6fff' },
}

export function StatCard({ label, value, sub, icon, color='default', trend }) {
  const c = colors[color] || colors.default
  return (
    <motion.div
      initial={{ opacity:0, y:8 }}
      animate={{ opacity:1, y:0 }}
      whileHover={{ y:-3 }}
      transition={{ type:'spring', stiffness:300, damping:25 }}
      style={{
        position:'relative',
        overflow:'hidden',
        borderRadius:14,
        padding:20,
        background:'linear-gradient(160deg,rgba(20,21,32,0.94),rgba(12,13,20,0.90))',
        backdropFilter:'blur(28px)',
        border:'1px solid #1e2030',
        isolation:'isolate',
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1.5, background:`linear-gradient(90deg,transparent,${c.line},transparent)`, opacity:0.42 }} />

      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11 }}>
          <p style={{ fontSize:10.5, fontWeight:700, color:'#4c5070', textTransform:'uppercase', letterSpacing:'0.65px' }}>
            {label}
          </p>
          {icon && <span style={{ fontSize:18, opacity:0.4 }}>{icon}</span>}
        </div>

        <p style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, color:c.color, lineHeight:1, textShadow:`0 0 22px ${c.shadow}` }}>
          {value}
        </p>

        {(sub || trend) && (
          <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
            {trend && (
              <span style={{ fontSize:11, fontWeight:700, color: trend > 0 ? '#00c896' : '#ff4d6a' }}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {sub && <span style={{ fontSize:11, color:'#4c5070' }}>{sub}</span>}
          </div>
        )}
      </div>
    </motion.div>
  )
}