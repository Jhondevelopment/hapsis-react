import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'

const navGroups = [
  { roles:['vendedor','gestor_sub','gestor_geral'], items:[
    { id:'dashboard', label:'Dashboard',       icon:'⬛' },
    { id:'pipeline',  label:'Pipeline',         icon:'📋' },
    { id:'clientes',  label:'Base de Clientes', icon:'👥' },
    { id:'agenda',    label:'Agenda',           icon:'📅' },
    { id:'arena',     label:'Arena de Vendas',  icon:'🏆' },
    { id:'relatorio', label:'Meu Relatório',    icon:'📊' },
    { id:'bonus',     label:'Bônus',            icon:'🎁' },
    { id:'avisos',    label:'Avisos',           icon:'📢', badge:'avisos' },
  ]},
  { roles:['gestor_sub','gestor_geral'], category:'Operação', items:[
    { id:'aprovacoes',    label:'Aprovações',         icon:'✅', badge:'aprovacoes' },
    { id:'inadimplencia', label:'Inadimpl. & Estornos', icon:'⚠️' },
  ]},
  { roles:['gestor_sub','gestor_geral'], category:'Financeiro', items:[
    { id:'caixa',    label:'Caixa & Comissões', icon:'💰' },
    { id:'despesas', label:'Contas a Pagar',    icon:'🧾' },
    { id:'mrr',      label:'MRR',               icon:'📈' },
  ]},
  { roles:['gestor_geral'], category:'Diretoria', items:[
    { id:'equipes',  label:'Gestão de Equipes', icon:'👤' },
    { id:'produtos', label:'Produtos & Regras', icon:'📦' },
  ]},
  { roles:['gestor_geral'], category:'Estratégia', items:[
    { id:'okrs',     label:'OKRs',     icon:'🎯' },
    { id:'playbook', label:'Playbook', icon:'📖' },
  ]},
  { roles:['gestor_geral'], category:'HAPSIS Intel', items:[
    { id:'intel-hub', label:'Central Intel',  icon:'⚡', accent:true },
    { id:'intel-mov', label:'Movimentações',  icon:'📡', accent:true },
  ]},
  { roles:['gestor_geral'], category:'IA & Dados', items:[
    { id:'ia-preditiva', label:'IA Preditiva', icon:'🤖', accent:true },
    { id:'exportacao',   label:'Exportação',   icon:'📤' },
  ]},
  { roles:['vendedor','gestor_sub','gestor_geral'], category:'Conta', items:[
    { id:'perfil', label:'Meu Perfil', icon:'⚙️' },
  ]},
]

export function Sidebar({ activeTab, onTabChange, perfil }) {
  const role = perfil?.role || 'vendedor'
  const [badges, setBadges] = useState({ aprovacoes:0, avisos:0 })

  useEffect(() => {
    carregarBadges()
    const ch = supabase.channel('sidebar-badges-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},carregarBadges)
      .on('postgres_changes',{event:'*',schema:'public',table:'avisos'},carregarBadges)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [role])

  async function carregarBadges() {
    try {
      const promises = [
        supabase.from('avisos').select('id', { count:'exact', head:true }),
      ]
      if (['gestor_geral','gestor_sub'].includes(role)) {
        promises.push(
          supabase.from('leads').select('id', { count:'exact', head:true })
            .eq('status','Fechados').or('aprovado.eq.false,aprovado.is.null').eq('estornado',false)
        )
      }
      const results = await Promise.all(promises)
      setBadges({
        avisos:     results[0]?.count || 0,
        aprovacoes: results[1]?.count || 0,
      })
    } catch {}
  }

  return (
    <aside style={{ width:236, flexShrink:0, padding:'18px 10px', display:'flex', flexDirection:'column',
      gap:2, overflowY:'auto', position:'relative', background:'rgba(6,6,9,0.97)',
      backdropFilter:'blur(36px)', borderRight:'1px solid rgba(255,255,255,0.05)', scrollbarWidth:'none' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:110,
        background:'linear-gradient(180deg,rgba(240,180,41,0.025),transparent)', pointerEvents:'none' }} />

      {navGroups.filter(g=>g.roles.includes(role)).map((group,gi)=>(
        <div key={gi}>
          {group.category && (
            <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.9px',
              color:'rgba(255,255,255,0.50)', margin:'16px 0 5px', padding:'7px 11px', borderRadius:9,
              background:'linear-gradient(180deg,rgba(255,255,255,0.088),rgba(255,255,255,0.030))',
              backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.07)',
              borderTop:'1px solid rgba(255,255,255,0.17)' }}>
              {group.category}
            </div>
          )}
          {group.items.map(item=>{
            const active = activeTab === item.id
            const badgeN = item.badge==='aprovacoes' ? badges.aprovacoes
                         : item.badge==='avisos'     ? badges.avisos
                         : 0
            return(
              <motion.button key={item.id} onClick={()=>onTabChange(item.id)}
                whileHover={{ paddingLeft:active?11:18 }}
                whileTap={{ scale:0.98 }}
                transition={{ type:'spring', stiffness:400, damping:30 }}
                style={{ position:'relative', display:'flex', alignItems:'center', gap:9, width:'100%',
                  padding:'9px 11px', borderRadius:8, border:'none',
                  background:active?'linear-gradient(90deg,rgba(240,180,41,0.10),rgba(240,180,41,0.03))':'transparent',
                  color:active?'#fff':item.accent?'#9d6fff':'rgba(255,255,255,0.38)',
                  fontWeight:active?600:500, fontSize:13, cursor:'pointer',
                  textAlign:'left', fontFamily:'DM Sans,sans-serif', transition:'color 0.15s' }}>
                <AnimatePresence>
                  {active&&<motion.span initial={{scaleY:0,opacity:0}} animate={{scaleY:1,opacity:1}} exit={{scaleY:0,opacity:0}}
                    style={{position:'absolute',left:0,top:5,bottom:5,width:2.5,borderRadius:'0 3px 3px 0',
                      background:'linear-gradient(180deg,#f0b429,#c9960e)',boxShadow:'0 0 10px rgba(240,180,41,0.6)'}} />}
                </AnimatePresence>
                <span style={{fontSize:15}}>{item.icon}</span>
                <span style={{flex:1}}>{item.label}</span>
                {badgeN > 0 && (
                  <motion.span initial={{scale:0}} animate={{scale:1}}
                    style={{fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:99,
                      background:item.badge==='aprovacoes'?'rgba(255,140,66,0.20)':'rgba(77,159,255,0.20)',
                      color:item.badge==='aprovacoes'?'#ff8c42':'#4d9fff',
                      border:`1px solid ${item.badge==='aprovacoes'?'rgba(255,140,66,0.35)':'rgba(77,159,255,0.35)'}`,
                      flexShrink:0}}>
                    {badgeN}
                  </motion.span>
                )}
              </motion.button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}