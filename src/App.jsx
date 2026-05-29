import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
    <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:256, gap:16 }}>
      <div style={{ width:64, height:64, borderRadius:16, background:'rgba(240,180,41,0.10)', border:'1px solid rgba(240,180,41,0.20)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🚧</div>
      <h3 style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18, color:'#fff' }}>{tab}</h3>
      <p style={{ fontSize:13, color:'#4c5070', marginTop:4 }}>Em breve disponível.</p>
    </motion.div>
  )
}

function AppShell({ perfil, onSignOut }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  function renderPage() {
    switch (activeTab) {
      case 'dashboard':     return <DashboardPage    perfil={perfil} />
      case 'pipeline':      return <PipelinePage     perfil={perfil} />
      case 'clientes':      return <ClientesPage     perfil={perfil} />
      case 'agenda':        return <AgendaPage        perfil={perfil} />
      case 'arena':         return <ArenaPage         perfil={perfil} />
      case 'relatorio':     return <RelatorioPage     perfil={perfil} />
      case 'avisos':        return <AvisosPage        perfil={perfil} />
      case 'bonus':         return <BonusPage         perfil={perfil} />
      case 'pos-venda':     return <PosVendaPage      perfil={perfil} />
      case 'aprovacoes':    return <AprovacoesPage    perfil={perfil} />
      case 'inadimplencia': return <InadimplenciaPage perfil={perfil} />
      case 'caixa':         return <CaixaPage         perfil={perfil} />
      case 'despesas':      return <DespesasPage      perfil={perfil} />
      case 'mrr':           return <MRRPage           perfil={perfil} />
      case 'equipes':       return <EquipesPage       perfil={perfil} />
      case 'produtos':      return <ProdutosPage      perfil={perfil} />
      case 'okrs':          return <OKRsPage          perfil={perfil} />
      case 'playbook':      return <PlaybookPage      perfil={perfil} />
      case 'intel-hub':     return <IntelPage         perfil={perfil} abaInicial="hub" />
      case 'intel-mov':     return <IntelPage         perfil={perfil} abaInicial="mov" />
      case 'ia-preditiva':  return <IAPreditivaPage   perfil={perfil} />
      case 'exportacao':    return <ExportacaoPage    perfil={perfil} />
      case 'perfil':        return <PerfilPage        perfil={perfil} />
      default:              return <PlaceholderPage   tab={activeTab} />
    }
  }

  return (
    <div style={{ position:'relative', display:'flex', flexDirection:'column', minHeight:'100vh', zIndex:1 }}>
      <Topbar perfil={perfil} onSignOut={onSignOut} />
      <div style={{ display:'flex', flex:1, overflow:'hidden', height:'calc(100vh - 60px)' }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} perfil={perfil} />
        <main style={{ flex:1, overflowY:'auto', padding:'26px 30px', position:'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-4 }} transition={{ duration:0.18, ease:[0.22,1,0.36,1] }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
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