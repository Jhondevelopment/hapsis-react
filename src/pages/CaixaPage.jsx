import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }

function ModalConfirm({ titulo, mensagem, corBotao='#00c896', labelBotao, onConfirmar, onCancelar }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
      <motion.div initial={{opacity:0,y:16,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
        transition={{type:'spring',stiffness:340,damping:30}}
        style={{ position:'relative',borderRadius:18,padding:32,width:'100%',maxWidth:380,
          background:'rgba(8,8,14,0.99)',backdropFilter:'blur(52px)',
          border:`1px solid ${corBotao}33`,boxShadow:`0 40px 100px rgba(0,0,0,0.80)` }}>
        <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,background:`linear-gradient(90deg,transparent,${corBotao}55,transparent)` }} />
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <div style={{ width:56,height:56,borderRadius:'50%',background:`${corBotao}14`,border:`1px solid ${corBotao}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 16px' }}>💰</div>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:18,color:'#f0f1ff',marginBottom:10 }}>{titulo}</h3>
          <p style={{ fontSize:13.5,color:'#8f94b0',lineHeight:1.65 }} dangerouslySetInnerHTML={{__html:mensagem}} />
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancelar} style={{ flex:1,padding:'12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,fontSize:14,cursor:'pointer' }}>Cancelar</button>
          <motion.button onClick={onConfirmar} whileHover={{filter:'brightness(1.10)'}} whileTap={{scale:0.97}}
            style={{ flex:2,padding:'12px',background:`linear-gradient(160deg,${corBotao}dd,${corBotao}aa)`,border:'1px solid rgba(255,255,255,0.20)',borderRadius:10,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',fontFamily:'Syne,sans-serif' }}>
            {labelBotao}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export function CaixaPage({ perfil }) {
  const [leads,      setLeads]      = useState([])
  const [produtos,   setProdutos]   = useState([])
  const [historico,  setHistorico]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [equipe,     setEquipe]     = useState([])
  const [confirm,    setConfirm]    = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const [{ data: l }, { data: p }, { data: h }, { data: e }] = await Promise.all([
        supabase.from('leads').select('*').eq('status','Fechados').eq('aprovado',true).eq('estornado',false),
        supabase.from('produtos').select('*'),
        supabase.from('pagamentos_comissao').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('id,full_name,role,equipe'),
      ])
      setLeads(l||[])
      setProdutos(p||[])
      setHistorico(h||[])
      setEquipe(e||[])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const faturamentoBruto = leads.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
  const comissoesPagas   = historico.reduce((s,h)=>s+(parseFloat(h.valor)||0),0)

  // Comissões devidas por vendedor
  const vendedores = equipe.filter(p=>['vendedor','sdr'].includes(p.role))
  const comissoesDevidas = vendedores.map(v => {
    const vendasPendentes = leads.filter(l=>l.user_id===v.id&&!l.comissao_paga)
    const receita = vendasPendentes.reduce((s,l)=>s+(parseFloat(l.valor)||0),0)
    let comissao = 0
    vendasPendentes.forEach(lead => {
      const prod  = produtos.find(p=>p.nome===lead.produto)
      const taxa  = parseFloat(prod?.taxa_comissao||5)
      comissao   += (parseFloat(lead.valor)||0) * taxa / 100
    })
    return { ...v, receita, comissao, qtd: vendasPendentes.length }
  }).filter(v => v.qtd > 0)

  const totalComissoesDevidas = comissoesDevidas.reduce((s,v)=>s+v.comissao,0)
  const lucroLiquido = faturamentoBruto - totalComissoesDevidas - comissoesPagas

  // Por forma de pagamento
  const porPagamento = {}
  leads.forEach(l => {
    const k = l.forma_pagamento||'Não informado'
    porPagamento[k] = (porPagamento[k]||0) + (parseFloat(l.valor)||0)
  })

  async function pagarComissao(vendedor) {
    try {
      const ids = leads.filter(l=>l.user_id===vendedor.id&&!l.comissao_paga).map(l=>l.id)
      if (ids.length>0) await supabase.from('leads').update({comissao_paga:true}).in('id',ids)
      await supabase.from('pagamentos_comissao').insert([{
        user_id:               vendedor.id,
        valor:                 vendedor.comissao,
        responsavel_pagamento: perfil?.full_name,
        nome_vendedor:         vendedor.full_name,
      }])
      setConfirm(null)
      carregar()
    } catch(e) { alert(e.message) }
  }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:300 }}>
      <motion.div style={{ width:36,height:36,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429' }}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff' }}>Caixa & Comissões</h1>
        <p style={{ fontSize:13,color:'#4c5070',marginTop:4 }}>Controle financeiro da equipe</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22 }}>
        {[
          { label:'Faturamento Bruto',  v:fmt(faturamentoBruto),          cor:'#f0b429' },
          { label:'Comissões Devidas',  v:fmt(totalComissoesDevidas),     cor:'#ff8c42' },
          { label:'Lucro Líquido',      v:fmt(lucroLiquido),              cor:'#00c896' },
        ].map(s=>(
          <div key={s.label} style={{ padding:18,borderRadius:14,
            background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',
            backdropFilter:'blur(32px)',border:'1px solid #1e2030',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.cor},transparent)`,opacity:0.5 }} />
            <p style={{ fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.7px',marginBottom:8 }}>{s.label}</p>
            <p style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:s.cor }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Por forma de pagamento */}
      {Object.keys(porPagamento).length > 0 && (
        <div style={{ padding:20,borderRadius:14,background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',marginBottom:20,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#9d6fff,transparent)',opacity:0.4 }} />
          <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'#f0f1ff',marginBottom:16 }}>💳 Por Forma de Pagamento</h3>
          <div style={{ display:'flex',flexWrap:'wrap',gap:10 }}>
            {Object.entries(porPagamento).map(([k,v])=>(
              <div key={k} style={{ padding:'10px 16px',borderRadius:10,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize:12,color:'#8f94b0',marginBottom:4 }}>{k}</p>
                <p style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'#9d6fff' }}>{fmt(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comissões por vendedor */}
      <div style={{ padding:20,borderRadius:14,background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',marginBottom:20,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#f0b429,transparent)',opacity:0.4 }} />
        <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'#f0f1ff',marginBottom:16 }}>💸 Comissões Pendentes</h3>
        {comissoesDevidas.length === 0 ? (
          <div style={{ textAlign:'center',color:'#4c5070',padding:'20px 0' }}>
            <span style={{ fontSize:28,display:'block',marginBottom:8,opacity:0.3 }}>✅</span>
            Todas as comissões em dia!
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead><tr>{['Vendedor','Equipe','Receita Gerada','Comissão Devida',''].map(h=>(
                <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {comissoesDevidas.map(v=>(
                  <tr key={v.id} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)' }}>
                    <td style={{ padding:'12px 14px',color:'#f0f1ff',fontWeight:600 }}>{v.full_name}</td>
                    <td style={{ padding:'12px 14px',color:'#8f94b0',fontSize:12 }}>{v.equipe||'Geral'}</td>
                    <td style={{ padding:'12px 14px',color:'#00c896',fontWeight:700 }}>{fmt(v.receita)}</td>
                    <td style={{ padding:'12px 14px',color:'#f0b429',fontWeight:700 }}>{fmt(v.comissao)}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <motion.button onClick={()=>setConfirm(v)} whileHover={{y:-1}} whileTap={{scale:0.97}}
                        style={{ padding:'7px 14px',background:'rgba(0,200,150,0.14)',border:'1px solid rgba(0,200,150,0.28)',borderRadius:8,color:'#00c896',fontWeight:700,fontSize:12,cursor:'pointer' }}>
                        💰 Quitar
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico de pagamentos */}
      {historico.length > 0 && (
        <div style={{ padding:20,borderRadius:14,background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#00c896,transparent)',opacity:0.4 }} />
          <h3 style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'#f0f1ff',marginBottom:16 }}>📋 Histórico de Pagamentos</h3>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead><tr>{['Vendedor','Responsável','Valor','Data'].map(h=>(
              <th key={h} style={{ padding:'10px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {historico.slice(0,20).map(h=>(
                <tr key={h.id} style={{ borderBottom:'1px solid rgba(30,32,48,0.42)' }}>
                  <td style={{ padding:'11px 14px',color:'#f0f1ff',fontWeight:600 }}>{h.nome_vendedor||'—'}</td>
                  <td style={{ padding:'11px 14px',color:'#8f94b0',fontSize:12 }}>{h.responsavel_pagamento||'—'}</td>
                  <td style={{ padding:'11px 14px',color:'#00c896',fontWeight:700 }}>{fmt(h.valor)}</td>
                  <td style={{ padding:'11px 14px',color:'#4c5070',fontSize:12 }}>{h.created_at?new Date(h.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {confirm && (
          <ModalConfirm
            titulo="Quitar comissão?"
            mensagem={`Confirmar o pagamento de <strong style="color:#00c896">${fmt(confirm.comissao)}</strong> para <strong>${confirm.full_name}</strong>?`}
            corBotao="#00c896"
            labelBotao="💰 Confirmar Pagamento"
            onConfirmar={()=>pagarComissao(confirm)}
            onCancelar={()=>setConfirm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}