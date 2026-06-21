import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth }           from './hooks/useAuth'
import { LoginPage }         from './pages/LoginPage'
import { DashboardPage }     from './pages/DashboardPage'
import { PipelinePage }      from './pages/PipelinePage'
import { AgendaPage }        from './pages/AgendaPage'
import { ArenaPage }         from './pages/ArenaPage'
import { RelatorioPage }     from './pages/RelatorioPage'
import { IAPreditivaPage }   from './pages/IAPreditivaPage'
import { EquipesPage }       from './pages/EquipesPage'
import { AprovacoesPage }    from './pages/AprovacoesPage'
import { CaixaPage }         from './pages/CaixaPage'
import { MRRPage }           from './pages/MRRPage'
import { DespesasPage }      from './pages/DespesasPage'
import { OKRsPage }          from './pages/OKRsPage'
import { PlaybookPage }      from './pages/PlaybookPage'
import { ProdutosPage }      from './pages/ProdutosPage'
import { ExportacaoPage }    from './pages/ExportacaoPage'
import { InadimplenciaPage } from './pages/InadimplenciaPage'
import { ClientesPage }      from './pages/ClientesPage'
import { PerfilPage }        from './pages/PerfilPage'
import { AvisosPage }        from './pages/AvisosPage'
import { BonusPage }         from './pages/BonusPage'
import { IntelPage }         from './pages/IntelPage'
import { PosVendaPage }      from './pages/PosVendaPage'
import { Topbar }            from './components/layout/Topbar'
import { Sidebar }           from './components/layout/Sidebar'
import { ChatIA }            from './components/features/ChatIA'

function PlaceholderPage({ tab }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:256, gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:16, background:'rgba(240,180,41,0.10)', border:'1px solid rgba(240,180,41,0.20)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🚧</div>
      <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>{tab}</h3>
      <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Em breve disponível.</p>
    </div>
  )
}

function AppShell({ perfil, onSignOut }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  // Lead a ser aberto automaticamente no Pipeline (vindo da busca do Topbar)
  const [leadParaAbrir, setLeadParaAbrir] = useState(null)

  // Chamado pelo Topbar quando o usuário clica num resultado da busca
  const abrirLeadNoPipeline = useCallback((leadId) => {
    setLeadParaAbrir(leadId)
    setActiveTab('pipeline')
  }, [])

  const renderPage = useCallback(() => {
    switch (activeTab) {
      case 'dashboard':     return <DashboardPage    key={activeTab} perfil={perfil} />
      case 'pipeline':      return <PipelinePage     key={activeTab} perfil={perfil} leadParaAbrir={leadParaAbrir} onLeadAberto={() => setLeadParaAbrir(null)} />
      case 'clientes':      return <ClientesPage     key={activeTab} perfil={perfil} />
      case 'agenda':        return <AgendaPage        key={activeTab} perfil={perfil} />
      case 'arena':         return <ArenaPage         key={activeTab} perfil={perfil} />
      case 'relatorio':     return <RelatorioPage     key={activeTab} perfil={perfil} />
      case 'avisos':        return <AvisosPage        key={activeTab} perfil={perfil} />
      case 'bonus':         return <BonusPage         key={activeTab} perfil={perfil} />
      case 'pos-venda':     return <PosVendaPage      key={activeTab} perfil={perfil} />
      case 'aprovacoes':    return <AprovacoesPage    key={activeTab} perfil={perfil} />
      case 'inadimplencia': return <InadimplenciaPage key={activeTab} perfil={perfil} />
      case 'caixa':         return <CaixaPage         key={activeTab} perfil={perfil} />
      case 'despesas':      return <DespesasPage      key={activeTab} perfil={perfil} />
      case 'mrr':           return <MRRPage           key={activeTab} perfil={perfil} />
      case 'equipes':       return <EquipesPage       key={activeTab} perfil={perfil} />
      case 'produtos':      return <ProdutosPage      key={activeTab} perfil={perfil} />
      case 'okrs':          return <OKRsPage          key={activeTab} perfil={perfil} />
      case 'playbook':      return <PlaybookPage      key={activeTab} perfil={perfil} />
      case 'intel-hub':     return <IntelPage         key={activeTab} perfil={perfil} abaInicial="hub" />
      case 'intel-mov':     return <IntelPage         key={activeTab} perfil={perfil} abaInicial="mov" />
      case 'ia-preditiva':  return <IAPreditivaPage   key={activeTab} perfil={perfil} />
      case 'exportacao':    return <ExportacaoPage    key={activeTab} perfil={perfil} />
      case 'perfil':        return <PerfilPage        key={activeTab} perfil={perfil} />
      default:              return <PlaceholderPage   key={activeTab} tab={activeTab} />
    }
  }, [activeTab, perfil, leadParaAbrir])

  return (
    <div style={{ position:'relative', display:'flex', flexDirection:'column', minHeight:'100vh', zIndex:1 }}>
      <Topbar perfil={perfil} onSignOut={onSignOut} onAbrirLead={abrirLeadNoPipeline} />
      <div style={{ display:'flex', flex:1, overflow:'hidden', height:'calc(100vh - 60px)' }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} perfil={perfil} />
        <main style={{ flex:1, overflowY:'auto', padding:'26px 30px', position:'relative' }}>
          <motion.div
            key={activeTab}
            initial={{ opacity:0, y:6 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.18, ease:[0.22,1,0.36,1] }}>
            {renderPage()}
          </motion.div>
        </main>
      </div>
      <ChatIA perfil={perfil} />
    </div>
  )
}

export default function App() {
  const { user, perfil, loading, signOut } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#060609' }}>
      <motion.div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#f0b429' }}
        animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }} />
    </div>
  )
  if (!user) return <LoginPage />
  return <AppShell perfil={perfil} onSignOut={signOut} />
}