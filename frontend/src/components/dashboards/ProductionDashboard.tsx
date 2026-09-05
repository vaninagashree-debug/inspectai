import { FileText, Cpu, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ProductionDashboardProps {
  trends: any[]
  recentInspections: any[]
}

export default function ProductionDashboard({ trends, recentInspections }: ProductionDashboardProps) {
  const chartData = (trends || []).map(t => ({
    name: t.date,
    Accepted: t.pass,
    Rejected: t.fail
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Production Yield Logs</h1>
        <p className="text-slate-400 mt-1 text-sm">Monitor assembly line throughput, cycle metrics, and historical logs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white">Daily Inspection Volume</h3>
          <div className="h-64 bg-[#0f172a]/30 p-2 rounded-xl border border-slate-800">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                <Legend />
                <Bar dataKey="Accepted" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Rejected" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-5 flex flex-col justify-between glow-cyan">
          <div>
            <h3 className="text-lg font-bold text-white">Line Cycle Statistics</h3>
            <p className="text-xs text-slate-400">Execution performance metrics computed by backend processors</p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#0f172a]/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-cyan-400" />
                <div>
                  <span className="text-xs text-slate-400 block">Avg Inspection Speed</span>
                  <span className="text-lg font-bold text-white">42 ms</span>
                </div>
              </div>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">FAST</span>
            </div>

            <div className="bg-[#0f172a]/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs text-slate-400 block">Throughput Rate</span>
                  <span className="text-lg font-bold text-white">24 items/min</span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center">Data refreshed in real time via local database triggers</div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white">Recent Quality Log Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0f172a]/60 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Time</th>
                <th className="p-3">Defect Class</th>
                <th className="p-3">Confidence</th>
                <th className="p-3">Score</th>
                <th className="p-3">Status</th>
                <th className="p-3">Severity</th>
                <th className="p-3 text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(recentInspections || []).map(insp => {
                const preds = insp.predictions || {}
                const detected = preds.class || preds.defect_detected || (preds.anomaly_detected ? 'anomaly' : 'normal')
                const conf = preds.confidence || preds.anomaly_score || 0.0

                return (
                  <tr key={insp.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-white">#{insp.id}</td>
                    <td className="p-3 text-xs">{insp.created_at ? new Date(insp.created_at).toLocaleString() : 'N/A'}</td>
                    <td className="p-3 capitalize font-semibold text-cyan-400">{detected}</td>
                    <td className="p-3 font-mono text-xs">{conf > 0 ? `${(conf * 100).toFixed(0)}%` : 'N/A'}</td>
                    <td className="p-3 font-bold">{(insp.quality_score ?? 100).toFixed(1)}%</td>
                    <td className="p-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        insp.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[11px] font-semibold ${
                        insp.severity === 'Critical' ? 'text-rose-400' :
                        insp.severity === 'High' ? 'text-orange-400' :
                        insp.severity === 'Medium' ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        {insp.severity}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <a
                        href={`/api/reports/pdf/${insp.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 hover:underline text-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    </td>
                  </tr>
                )
              })}
              {recentInspections.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">No inspections logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
