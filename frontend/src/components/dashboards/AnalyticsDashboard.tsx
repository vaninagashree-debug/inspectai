import { useState, useEffect } from 'react'
import { Award } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Model {
  id: number
  name: string
  version: number
  metrics: {
    roc_curve?: Array<{ fpr: number; tpr: number; threshold: number }>
    pr_curve?: Array<{ recall: number; precision: number; threshold: number }>
  }
  is_production: boolean
}

interface AnalyticsDashboardProps {
  token: string
}

export default function AnalyticsDashboard({ token }: AnalyticsDashboardProps) {
  const [models, setModels] = useState<Model[]>([])
  const [activeModel, setActiveModel] = useState<Model | null>(null)

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setModels(data)
        const prod = data.find((m: Model) => m.is_production) || data[0]
        if (prod) setActiveModel(prod)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const rocData = activeModel?.metrics?.roc_curve || []
  const prData = activeModel?.metrics?.pr_curve || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">Dynamic Quality Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">Visual evaluation curves for model sensitivity and precision limits</p>
        </div>

        <select
          value={activeModel?.id || ''}
          onChange={e => setActiveModel(models.find(m => m.id === parseInt(e.target.value)) || null)}
          className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-400"
        >
          {models.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} (V{m.version})
            </option>
          ))}
        </select>
      </div>

      {activeModel ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white">Receiver Operating Characteristic (ROC)</h3>
            <p className="text-xs text-slate-400">Plots True Positive Rate against False Positive Rate dynamically computed</p>
            
            <div className="h-72 bg-[#0f172a]/30 p-2 rounded-xl border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rocData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="fpr" stroke="#64748b" domain={[0, 1]} type="number" fontSize={11} name="False Positive Rate" />
                  <YAxis stroke="#64748b" domain={[0, 1]} type="number" fontSize={11} name="True Positive Rate" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="tpr" stroke="#06b6d4" strokeWidth={2} name="True Positive Rate (TPR)" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="fpr" stroke="#475569" strokeDasharray="5 5" name="Random Guess" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white">Precision-Recall (PR) Curve</h3>
            <p className="text-xs text-slate-400">Plots Precision against Recall across variable classification thresholds</p>
            
            <div className="h-72 bg-[#0f172a]/30 p-2 rounded-xl border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="recall" stroke="#64748b" domain={[0, 1]} type="number" fontSize={11} name="Recall" />
                  <YAxis stroke="#64748b" domain={[0, 1]} type="number" fontSize={11} name="Precision" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="precision" stroke="#10b981" strokeWidth={2} name="Precision" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center text-slate-500 bg-[#0f172a]/20 border border-slate-800/40 rounded-xl">
          <Award className="w-12 h-12 mb-3 text-slate-600" />
          <span>No models deployed. Build a custom dataset to execute performance analytics.</span>
        </div>
      )}
    </div>
  )
}
