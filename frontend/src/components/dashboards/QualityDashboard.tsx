import { AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface SummaryData {
  total_inspected: number
  pass_count: number
  fail_count: number
  yield_rate: number
  average_score: number
  defect_distribution: Record<string, number>
  severity_distribution: Record<string, number>
}

interface QualityDashboardProps {
  summary: SummaryData
  recentInspections: any[]
}

const COLORS = ['#06b6d4', '#f43f5e', '#a78bfa', '#f59e0b', '#10b981']

export default function QualityDashboard({ summary, recentInspections }: QualityDashboardProps) {
  const rawDefects = summary?.defect_distribution || {}
  const defectData = Array.isArray(rawDefects)
    ? rawDefects.map((item: any) => ({ name: item.name, value: item.value }))
    : Object.entries(rawDefects).map(([name, val]) => ({ name, value: typeof val === 'number' ? val : 1 }))

  const severityMap: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  (recentInspections || []).forEach((insp: any) => {
    if (insp && insp.severity && insp.severity !== 'None' && insp.severity in severityMap) {
      severityMap[insp.severity] += 1
    }
  })

  const rawSeverity = summary?.severity_distribution || {}
  if (Array.isArray(rawSeverity)) {
    rawSeverity.forEach((item: any) => {
      if (item && item.name && item.name !== 'None') {
        severityMap[item.name] = (severityMap[item.name] || 0) + (item.value || 0)
      }
    })
  } else if (typeof rawSeverity === 'object') {
    Object.entries(rawSeverity).forEach(([key, val]) => {
      if (key !== 'None' && typeof val === 'number') {
        severityMap[key] = (severityMap[key] || 0) + val
      }
    })
  }

  const severityData = Object.entries(severityMap).map(([name, Count]) => ({
    name,
    Count
  }))
  const hasSeverityCounts = severityData.some(d => d.Count > 0)

  const criticalAlerts = (recentInspections || [])
    .filter(i => i && i.status === 'FAIL' && (i.severity === 'High' || i.severity === 'Critical'))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Quality Inspection Diagnostics</h1>
        <p className="text-slate-400 mt-1 text-sm">Deep analysis of defects distributions, quality deviations, and alerts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4 flex flex-col justify-between">
          <h3 className="text-lg font-bold text-white">Detected Defect Distribution</h3>
          {defectData.length > 0 ? (
            <div className="h-60 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectData}
                    cx="50%"
                    cy="50%"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={10}
                  >
                    {defectData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
              No defects detected in current log session.
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white">Defect Severity Counts</h3>
          <div className="h-60 bg-[#0f172a]/30 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
            {hasSeverityCounts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} domain={[0, 'dataMax + 1']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="Count" fill="#f43f5e" radius={[4, 4, 0, 0]} minPointSize={4} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs text-center">
                No defect severities logged. All recent inspections passed quality thresholds.
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col justify-between glow-cyan">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Overall Quality Index</h3>
            <p className="text-xs text-slate-400">Mean conformance value calculated across recent inspections</p>
          </div>
          <div className="text-center py-6">
            <div className="inline-block relative">
              <span className="text-5xl font-extrabold text-cyan-400">{(summary?.average_score ?? 100).toFixed(1)}%</span>
            </div>
            <p className="text-xs text-slate-400 mt-3">Target index threshold is set to 95.0%</p>
          </div>
          <div className="bg-[#0f172a]/80 p-3 rounded-lg border border-slate-800 flex justify-between text-xs">
            <span className="text-slate-400">Tolerance Margin:</span>
            <span className="text-emerald-400 font-semibold">Within limits</span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
          Active High-Severity QC Rejections
        </h3>
        <div className="space-y-3">
          {criticalAlerts.map(insp => (
            <div key={insp.id} className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-lg flex justify-between items-center text-sm">
              <div className="space-y-1">
                <span className="font-bold text-white">Inspection QC #{insp.id}</span>
                <p className="text-xs text-slate-400">
                  Detected <b className="text-rose-300 capitalize">{(insp.predictions?.class || insp.predictions?.defect_detected || 'Unknown')}</b> (Confidence: {(((insp.predictions?.confidence ?? 0)) * 100).toFixed(0)}%)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono">
                {insp.severity} ALERT
              </span>
            </div>
          ))}
          {criticalAlerts.length === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs">
              No high-severity quality rejections registered in the active logs.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
