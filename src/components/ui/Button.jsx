import { motion } from 'framer-motion'

const variants = {
  primary: { background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))', border:'1px solid rgba(255,255,255,0.28)', borderTop:'1px solid rgba(255,255,255,0.44)', color:'#060709', boxShadow:'0 4px 20px rgba(240,180,41,0.30),inset 0 1px 0 rgba(255,255,255,0.52)' },
  danger:  { background:'linear-gradient(180deg,rgba(255,77,106,0.16),rgba(255,77,106,0.08))', border:'1px solid rgba(255,77,106,0.28)', color:'#ff4d6a' },
  ghost:   { background:'linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))', border:'1px solid rgba(255,255,255,0.10)', color:'#8f94b0' },
  accent:  { background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))', border:'1px solid rgba(240,180,41,0.26)', color:'#f0b429' },
  success: { background:'linear-gradient(180deg,rgba(0,200,150,0.16),rgba(0,200,150,0.08))', border:'1px solid rgba(0,200,150,0.26)', color:'#00c896' },
  purple:  { background:'linear-gradient(180deg,rgba(157,111,255,0.88),rgba(139,92,246,0.82))', border:'1px solid rgba(255,255,255,0.24)', color:'#fff' },
}

const sizes = {
  sm: { padding:'6px 12px', fontSize:'12px' },
  md: { padding:'8px 16px', fontSize:'13px' },
  lg: { padding:'10px 20px', fontSize:'14px' },
  xl: { padding:'14px 20px', fontSize:'15px', width:'100%' },
}

export function Button({ variant='ghost', size='md', children, loading, ...props }) {
  return (
    <motion.button
      whileHover={{ y:-1, filter:'brightness(1.07)' }}
      whileTap={{ scale:0.97, y:0 }}
      transition={{ type:'spring', stiffness:400, damping:25 }}
      style={{
        ...variants[variant],
        ...sizes[size],
        position:'relative',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        gap:8,
        fontFamily:'Syne,sans-serif',
        fontWeight:700,
        borderRadius:10,
        backdropFilter:'blur(20px)',
        cursor:'pointer',
        overflow:'hidden',
      }}
      disabled={loading}
      {...props}
    >
      <span style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(255,255,255,0.09),transparent)', pointerEvents:'none', borderRadius:'inherit' }} />
      {loading
        ? <span style={{ width:14, height:14, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin 0.65s linear infinite', display:'inline-block' }} />
        : children}
      <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
    </motion.button>
  )
}