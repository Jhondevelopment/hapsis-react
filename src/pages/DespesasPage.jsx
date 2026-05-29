import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

function fmt(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}

export function DespesasPage({ perfil }) {
  const [despesas, setDespesas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [confirm,  setConfirm]  = useState(null)
  const [form,     setForm]     = useState({ descricao:'', valor:'', vencimento:'', categoria:'Fixo' })

  useEffect(()=>{carregar()},[])

  async function carregar(){
    try{
      const {data}=await supabase.from('despesas').select('*').order('vencimento',{ascending:true})
      setDespesas(data||[])
    }catch(e){console.error(e)}
    finally{setLoading(false)}
  }

  async function salvar(){
    if(!form.descricao.trim()||!form.valor||!form.vencimento) return
    await supabase.from('despesas').insert([{descricao:form.descricao,valor:parseFloat(form.valor),vencimento:form.vencimento,status:'Pendente',categoria:form.categoria}])
    setModal(false)
    setForm({descricao:'',valor:'',vencimento:'',categoria:'Fixo'})
    carregar()
  }

  async function quitar(id){
    await supabase.from('despesas').update({status:'Pago'}).eq('id',id)
    setConfirm(null); carregar()
  }

  async function deletar(id){
    await supabase.from('despesas').delete().eq('id',id)
    setConfirm(null); carregar()
  }

  const pendentes = despesas.filter(d=>d.status==='Pendente')
  const pagas     = despesas.filter(d=>d.status==='Pago')
  const totalPend = pendentes.reduce((s,d)=>s+(parseFloat(d.valor)||0),0)
  const totalPago = pagas.reduce((s,d)=>s+(parseFloat(d.valor)||0),0)

  if(loading)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <motion.div style={{width:36,height:36,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#f0b429'}}
        animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}} />
    </div>
  )

  return(
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f1ff'}}>🧾 Contas a Pagar</h1>
          <p style={{fontSize:13,color:'#4c5070',marginTop:4}}>Despesas e custos operacionais</p>
        </div>
        <motion.button onClick={()=>setModal(true)} whileHover={{y:-1}} whileTap={{scale:0.97}}
          style={{padding:'9px 16px',background:'linear-gradient(180deg,rgba(240,180,41,0.16),rgba(240,180,41,0.08))',border:'1px solid rgba(240,180,41,0.28)',borderRadius:10,color:'#f0b429',fontWeight:700,fontSize:13,cursor:'pointer'}}>
          + Nova Despesa
        </motion.button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:22}}>
        {[
          {label:'Pendente',   v:fmt(totalPend), cor:'#ff4d6a', n:pendentes.length},
          {label:'Pago',       v:fmt(totalPago), cor:'#00c896', n:pagas.length},
          {label:'Total Mês',  v:fmt(totalPend+totalPago), cor:'#f0b429', n:despesas.length},
        ].map(s=>(
          <div key={s.label} style={{padding:'16px 18px',borderRadius:12,background:'linear-gradient(160deg,rgba(18,19,30,0.96),rgba(10,11,18,0.93))',backdropFilter:'blur(32px)',border:'1px solid #1e2030',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.cor},transparent)`,opacity:0.5}} />
            <p style={{fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.7px',marginBottom:8}}>{s.label}</p>
            <p style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:s.cor}}>{s.v}</p>
            <p style={{fontSize:11,color:'#4c5070',marginTop:4}}>{s.n} lançamentos</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{background:'linear-gradient(160deg,rgba(16,17,26,0.94),rgba(10,11,18,0.90))',backdropFilter:'blur(24px)',border:'1px solid #1e2030',borderRadius:14,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead style={{background:'rgba(0,0,0,0.22)'}}>
            <tr>{['Descrição','Categoria','Vencimento','Valor','Status','Ações'].map(h=>(
              <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:10.5,fontWeight:700,color:'#4c5070',textTransform:'uppercase',letterSpacing:'0.6px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {despesas.length===0&&<tr><td colSpan={6} style={{padding:'40px',textAlign:'center',color:'#4c5070',fontSize:13}}>Nenhuma despesa registrada</td></tr>}
            {despesas.map((d,i)=>{
              const pago=d.status==='Pago'
              const venc=new Date(d.vencimento+'T12:00:00')
              const atrasado=!pago&&venc<new Date()
              return(
                <motion.tr key={d.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  style={{borderBottom:'1px solid rgba(30,32,48,0.42)',background:atrasado?'rgba(255,77,106,0.03)':'transparent'}}>
                  <td style={{padding:'12px 14px',color:'#f0f1ff',fontWeight:600}}>{d.descricao}</td>
                  <td style={{padding:'12px 14px',color:'#8f94b0',fontSize:12}}>{d.categoria||'Fixo'}</td>
                  <td style={{padding:'12px 14px',color:atrasado?'#ff4d6a':'#8f94b0',fontSize:13,fontWeight:atrasado?700:400}}>
                    {venc.toLocaleDateString('pt-BR')} {atrasado&&'⚠️'}
                  </td>
                  <td style={{padding:'12px 14px',color:pago?'#4c5070':'#ff4d6a',fontWeight:700,textDecoration:pago?'line-through':'none'}}>{fmt(d.valor)}</td>
                  <td style={{padding:'12px 14px'}}>
                    <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,
                      background:pago?'rgba(0,200,150,0.12)':'rgba(255,77,106,0.12)',
                      color:pago?'#00c896':'#ff4d6a'}}>
                      {pago?'PAGO':'PENDENTE'}
                    </span>
                  </td>
                  <td style={{padding:'12px 14px'}}>
                    <div style={{display:'flex',gap:6}}>
                      {!pago&&<motion.button onClick={()=>setConfirm({tipo:'quitar',id:d.id,desc:d.descricao,val:d.valor})} whileHover={{y:-1}} whileTap={{scale:0.97}}
                        style={{padding:'5px 10px',background:'rgba(0,200,150,0.10)',border:'1px solid rgba(0,200,150,0.22)',borderRadius:7,color:'#00c896',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        ✓ Pagar
                      </motion.button>}
                      <motion.button onClick={()=>setConfirm({tipo:'deletar',id:d.id,desc:d.descricao})} whileHover={{y:-1}} whileTap={{scale:0.97}}
                        style={{padding:'5px 10px',background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.20)',borderRadius:7,color:'#ff4d6a',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        🗑️
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nova despesa */}
      <AnimatePresence>
        {modal&&(
          <div style={{position:'fixed',inset:0,background:'rgba(3,3,7,0.75)',backdropFilter:'blur(14px)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
            onClick={e=>e.target===e.currentTarget&&setModal(false)}>
            <motion.div initial={{opacity:0,y:20,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
              transition={{type:'spring',stiffness:320,damping:28}}
              style={{position:'relative',borderRadius:20,padding:32,width:'100%',maxWidth:420,background:'rgba(8,8,14,0.98)',backdropFilter:'blur(52px)',border:'1px solid rgba(240,180,41,0.22)',boxShadow:'0 40px 100px rgba(0,0,0,0.80)'}}>
              <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(240,180,41,0.50),transparent)'}} />
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:20,color:'#f0f1ff'}}>🧾 Nova Despesa</h2>
                <button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'#4c5070',cursor:'pointer',fontSize:20}}>×</button>
              </div>
              {[
                {label:'Descrição',campo:'descricao',type:'text',placeholder:'Ex: Aluguel, Google Ads...'},
                {label:'Valor (R$)',campo:'valor',type:'number',placeholder:'0,00'},
              ].map(f=>(
                <div key={f.campo} style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8}}>{f.label}</label>
                  <input type={f.type} value={form[f.campo]} onChange={e=>setForm(ff=>({...ff,[f.campo]:e.target.value}))} placeholder={f.placeholder}
                    style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none',fontFamily:'inherit'}}
                    onFocus={e=>e.target.style.borderColor='rgba(240,180,41,0.45)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                </div>
              ))}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8}}>Vencimento</label>
                  <input type="date" value={form.vencimento} onChange={e=>setForm(ff=>({...ff,vencimento:e.target.value}))}
                    style={{width:'100%',background:'rgba(255,255,255,0.035)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none'}} />
                </div>
                <div>
                  <label style={{display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.6px',color:'#4c5070',marginBottom:8}}>Categoria</label>
                  <select value={form.categoria} onChange={e=>setForm(ff=>({...ff,categoria:e.target.value}))}
                    style={{width:'100%',background:'#0d1117',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,padding:'11px 15px',fontSize:14,color:'#f0f1ff',outline:'none'}}>
                    {['Fixo','Variável','Marketing','Pessoal','Tecnologia','Outro'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setModal(false)} style={{flex:1,padding:'12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,cursor:'pointer'}}>Cancelar</button>
                <motion.button onClick={salvar} whileHover={{y:-1}} whileTap={{scale:0.98}}
                  style={{flex:2,padding:'12px',background:'linear-gradient(160deg,rgba(240,180,41,0.94),rgba(200,147,14,0.90))',border:'1px solid rgba(255,255,255,0.28)',borderRadius:10,color:'#060709',fontWeight:700,cursor:'pointer',fontFamily:'Syne,sans-serif'}}>
                  🧾 Registrar Despesa
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirm&&(
          <div style={{position:'fixed',inset:0,background:'rgba(3,3,7,0.80)',backdropFilter:'blur(16px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
              style={{padding:28,borderRadius:16,width:'100%',maxWidth:380,background:'rgba(8,8,14,0.99)',backdropFilter:'blur(52px)',border:`1px solid ${confirm.tipo==='quitar'?'rgba(0,200,150,0.28)':'rgba(255,77,106,0.28)'}`}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:17,color:'#f0f1ff',marginBottom:10}}>
                {confirm.tipo==='quitar'?'Quitar despesa?':'Deletar despesa?'}
              </h3>
              <p style={{fontSize:13,color:'#8f94b0',marginBottom:20}}>
                {confirm.tipo==='quitar'?`Confirmar pagamento de ${fmt(confirm.val)} para "${confirm.desc}"?`:`Remover "${confirm.desc}" permanentemente?`}
              </p>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)',borderRadius:10,color:'#8f94b0',fontWeight:600,cursor:'pointer'}}>Cancelar</button>
                <button onClick={()=>confirm.tipo==='quitar'?quitar(confirm.id):deletar(confirm.id)}
                  style={{flex:2,padding:'11px',background:confirm.tipo==='quitar'?'rgba(0,200,150,0.20)':'rgba(255,77,106,0.20)',border:`1px solid ${confirm.tipo==='quitar'?'rgba(0,200,150,0.36)':'rgba(255,77,106,0.36)'}`,borderRadius:10,color:confirm.tipo==='quitar'?'#00c896':'#ff4d6a',fontWeight:700,cursor:'pointer'}}>
                  {confirm.tipo==='quitar'?'✓ Confirmar':'🗑️ Deletar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}