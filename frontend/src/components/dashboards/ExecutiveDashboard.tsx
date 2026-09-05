import { CheckCircle2, XCircle, Activity, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SummaryData {
  total_inspected: number
  pass_count: number
  fail_count: number
  yield_rate: number
  average_score: number
  active_models: number
  active_datasets: number
}

interface ExecutiveDashboardProps {
  summary: SummaryData
  trends: any[]
}

export default function ExecutiveDashboard({ summary, trends }: ExecutiveDashboardProps) {
  const chartData = (trends || []).map(t => ({
    date: t.date,
    Yield: t.total > 0 ? parseFloat(((t.pass / t.total) * 100).toFixed(1)) : 100.0,
    Total: t.total
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">Executive Overview</h1>
          <p className="text-slate-400 mt-1 text-sm">VisionGuard AI platform-wide quality metrics and operational status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between glow-cyan">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Inspected</span>
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white">{summary?.total_inspected ?? 0}</h2>
            <p className="text-[10px] text-slate-400 mt-1.5">Across all assembly lines</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between glow-emerald">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Passed Items</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white">{summary?.pass_count ?? 0}</h2>
            <p className="text-[10px] text-slate-400 mt-1.5">Meets dynamic quality rules</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between glow-rose">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Defects Flagged</span>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white">{summary?.fail_count ?? 0}</h2>
            <p className="text-[10px] text-slate-400 mt-1.5">Rejected from production</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between glow-cyan">
          <div className="flex justify-between items-start mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Overall Yield Rate</span>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white">{(summary?.yield_rate ?? 100).toFixed(1)}%</h2>
            <p className="text-[10px] text-slate-400 mt-1.5">Average quality acceptance index</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white">Platform Yield Acceptance Trend</h3>
          <div className="h-72 bg-[#0f172a]/30 p-2 rounded-xl border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                <Area type="monotone" dataKey="Yield" stroke="#06b6d4" fillOpacity={1} fill="url(#colorYield)" strokeWidth={2} name="Yield %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-5">
          <h3 className="text-lg font-bold text-white">System Diagnostics</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-slate-400">Database Connection</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Online (SQLite Async)
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-slate-400">ML Engine Device</span>
              <span className="text-cyan-400 font-semibold">
                CPU Mode
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-slate-400">Active Pipelines</span>
              <span className="text-white font-semibold">{summary?.active_models ?? 0} Models deployed</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-slate-400">Registered Datasets</span>
              <span className="text-white font-semibold">{summary?.active_datasets ?? 0} Datasets</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">System Logs status</span>
              <span className="text-emerald-400 font-semibold">Normal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
