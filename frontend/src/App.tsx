import { useState, useEffect } from 'react'
import { 
  Shield, BarChart2, Cpu, Settings2, Activity, Play, 
  Layers, HardDrive, Database, ShieldCheck, LogOut 
} from 'lucide-react'

// Import views
import AuthScreen from './components/dashboards/AuthScreen'
import ExecutiveDashboard from './components/dashboards/ExecutiveDashboard'
import QualityDashboard from './components/dashboards/QualityDashboard'
import ProductionDashboard from './components/dashboards/ProductionDashboard'
import AIDashboard from './components/dashboards/AIDashboard'
import AnalyticsDashboard from './components/dashboards/AnalyticsDashboard'
import OperationsDashboard from './components/dashboards/OperationsDashboard'
import RealTimeInspection from './components/dashboards/RealTimeInspection'
import DatasetsPage from './components/dashboards/DatasetsPage'
import ModelsPage from './components/dashboards/ModelsPage'
import ConfigurationPage from './components/dashboards/ConfigurationPage'

interface Inspection {
  id: number
  image_path: string
  predictions: any
  quality_score: number
  status: string
  severity: string
  created_at: string
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || '')
  const [role, setRole] = useState<string>(localStorage.getItem('role') || '')
  
  const [activeTab, setActiveTab] = useState('executive')
  const [serverOnline, setServerOnline] = useState(true)
  
  // Dynamic state hooks
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([])
  const [summary, setSummary] = useState({
    total_inspected: 0,
    pass_count: 0,
    fail_count: 0,
    yield_rate: 100.0,
    average_score: 100.0,
    active_models: 0,
    active_datasets: 0,
    severity_distribution: { Low: 0, Medium: 0, High: 0, Critical: 0, None: 0 },
    defect_distribution: {}
  })
  const [trends, setTrends] = useState<any[]>([])
  
  // Training cross-navigation triggers
  const [trainingTrigger, setTrainingTrigger] = useState<{ datasetId: number; name: string } | null>(null)

  const handleLoginSuccess = (userToken: string, userUsername: string, userRole: string) => {
    localStorage.setItem('token', userToken)
    localStorage.setItem('username', userUsername)
    localStorage.setItem('role', userRole)
    setToken(userToken)
    setUsername(userUsername)
    setRole(userRole)
  }

  const handleLogout = () => {
    localStorage.clear()
    setToken(null)
    setUsername('')
    setRole('')
  }

  // Fetch summary and logs
  const fetchSummaryData = async () => {
    if (!token) return
    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      const sumRes = await fetch('/api/analytics/summary', { headers })
      const trendRes = await fetch('/api/analytics/trends', { headers })
      const inspRes = await fetch('/api/inspections', { headers })

      if (sumRes.ok) setSummary(await sumRes.json())
      if (trendRes.ok) setTrends(await trendRes.json())
      if (inspRes.ok) setRecentInspections(await inspRes.json())
      
      setServerOnline(true)
    } catch (e) {
      setServerOnline(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchSummaryData()
    }
  }, [token])

  // Establish WebSockets Connection
  useEffect(() => {
    if (!token) return
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const wsUrl = `${protocol}://${host}/api/inspections/ws`
    
    let socket: WebSocket | null = null
    let reconnectTimeout: any = null

    const connectWS = () => {
      socket = new WebSocket(wsUrl)
      
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data)
        if (payload.event === 'new_inspection') {
          setRecentInspections(prev => [payload, ...prev.slice(0, 49)])
          fetchSummaryData()
        }
      }

      socket.onerror = () => {
        setServerOnline(false)
      }

      socket.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 5000)
      }
    }

    connectWS()

    return () => {
      if (socket) socket.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [token])

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'executive':
        return <ExecutiveDashboard summary={summary} trends={trends} />
      case 'quality':
        return <QualityDashboard summary={summary} recentInspections={recentInspections} />
      case 'production':
        return <ProductionDashboard trends={trends} recentInspections={recentInspections} />
      case 'ai':
        return <AIDashboard token={token} />
      case 'analytics':
        return <AnalyticsDashboard token={token} />
      case 'operations':
        return <OperationsDashboard summary={summary} />
      case 'realtime':
        return (
          <RealTimeInspection 
            token={token} 
            recentInspections={recentInspections} 
            onNewInspection={(insp) => setRecentInspections(prev => [insp, ...prev])} 
          />
        )
      case 'datasets':
        return (
          <DatasetsPage 
            token={token} 
            role={role} 
            onStartTraining={(datasetId, name) => {
              setTrainingTrigger({ datasetId, name })
              setActiveTab('models')
            }} 
          />
        )
      case 'models':
        return (
          <ModelsPage 
            token={token} 
            role={role} 
            trainingTrigger={trainingTrigger} 
            onClearTrainingTrigger={() => setTrainingTrigger(null)} 
          />
        )
      case 'configs':
        return <ConfigurationPage token={token} role={role} />
      default:
        return <ExecutiveDashboard summary={summary} trends={trends} />
    }
  }

  const sidebarLinks = [
    { id: 'executive', label: 'Executive Overview', icon: Layers },
    { id: 'quality', label: 'Quality Metrics', icon: ShieldCheck },
    { id: 'production', label: 'Production Logs', icon: Activity },
    { id: 'ai', label: 'AI Engine Analytics', icon: Cpu },
    { id: 'analytics', label: 'Dynamic Curves', icon: BarChart2 },
    { id: 'operations', label: 'Operations Control', icon: HardDrive },
    { id: 'realtime', label: 'Live QC Monitor', icon: Play },
    { id: 'datasets', label: 'Datasets Registry', icon: Database },
    { id: 'models', label: 'Models Registry', icon: Cpu },
    { id: 'configs', label: 'QC Rules & Settings', icon: Settings2 }
  ]

  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-[#0f172a]/80 border-r border-white/5 flex flex-col justify-between relative z-20 backdrop-blur-md">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-400/30 rounded-xl flex items-center justify-center text-cyan-400 glow-cyan">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base block tracking-wider leading-none">VisionGuard</span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase mt-1 tracking-widest block">Quality AI</span>
            </div>
          </div>

          {/* Links list */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
            {sidebarLinks.map(link => {
              const Icon = link.icon
              const isActive = activeTab === link.id
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 glow-cyan' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {link.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User panel logout */}
        <div className="p-4 border-t border-white/5 bg-[#0b0f19]/30">
          <div className="flex items-center justify-between">
            <div className="truncate max-w-[150px]">
              <span className="text-xs font-bold text-white block truncate">{username}</span>
              <span className="text-[10px] text-slate-500 font-medium capitalize block">{role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-[#0f172a]/60 border-b border-white/5 px-8 flex items-center justify-between backdrop-blur-md relative z-10">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">System Connection:</span>
            <span className={`font-semibold flex items-center gap-1.5 ${serverOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {serverOnline ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Line 1 Deployed
            </span>
          </div>
        </header>

        {/* Render Switch Panel view */}
        <main className="flex-1 overflow-y-auto p-8 relative z-0">
          {renderActiveView()}
        </main>
      </div>
    </div>
  )
}
