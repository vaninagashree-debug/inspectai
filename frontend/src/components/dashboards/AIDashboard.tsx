import React, { useState, useEffect } from 'react'
import { Settings, Award } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Model {
  id: number
  name: string
  version: number
  task_type: string
  metrics: {
    accuracy?: number
    precision?: number
    recall?: number
    f1_score?: number
    confusion_matrix?: number[][]
    roc_curve?: Array<{ fpr: number; tpr: number; threshold: number }>
    pr_curve?: Array<{ recall: number; precision: number; threshold: number }>
    history?: {
      train_loss: number[]
      val_loss: number[]
      val_accuracy: number[]
    }
  }
  status: string
  hyperparameters: Record<string, any>
  is_production: boolean
}

interface AIDashboardProps {
  token: string
}

export default function AIDashboard({ token }: AIDashboardProps) {
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

  const historyData = activeModel?.metrics?.history?.train_loss?.map((loss, idx) => ({
    epoch: idx + 1,
    TrainLoss: loss,
    ValLoss: activeModel.metrics?.history?.val_loss?.[idx] || 0
  })) || []

  const matrix = activeModel?.metrics?.confusion_matrix || []
  const classCount = matrix.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">AI Engine Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">Deep learning validation reports, confusion matrix, and hyperparameter trials</p>
        </div>
        
        <select
          value={activeModel?.id || ''}
          onChange={e => setActiveModel(models.find(m => m.id === parseInt(e.target.value)) || null)}
          className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-400"
        >
          {(models || []).map(m => (
            <option key={m.id} value={m.id}>
              {m.name} (V{m.version}) {m.is_production ? '[Production]' : ''}
            </option>
          ))}
        </select>
      </div>

      {activeModel ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white">Validation Precision Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f172a]/60 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 text-xs block mb-1">Accuracy Index</span>
                <span className="text-2xl font-extrabold text-cyan-400">
                  {activeModel.metrics?.accuracy ? `${(activeModel.metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="bg-[#0f172a]/60 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 text-xs block mb-1">Precision Index</span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {activeModel.metrics?.precision ? `${(activeModel.metrics.precision * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="bg-[#0f172a]/60 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 text-xs block mb-1">Recall Sensitivity</span>
                <span className="text-2xl font-extrabold text-violet-400">
                  {activeModel.metrics?.recall ? `${(activeModel.metrics.recall * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              <div className="bg-[#0f172a]/60 p-4 rounded-xl border border-slate-800 text-center">
                <span className="text-slate-400 text-xs block mb-1">F1 Quality Score</span>
                <span className="text-2xl font-extrabold text-pink-400">
                  {activeModel.metrics?.f1_score ? `${(activeModel.metrics.f1_score * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="bg-[#0f172a]/30 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <h4 className="text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                Optuna Tuning Trials Config
              </h4>
              <div>Learning Rate: <span className="text-white">{activeModel.hyperparameters?.lr || '1e-3'}</span></div>
              <div>Batch Size: <span className="text-white">{activeModel.hyperparameters?.batch_size || 16}</span></div>
              <div>Optimizer: <span className="text-white">Adam (Adaptive Moment Estimation)</span></div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Dynamic Quality Confusion Matrix</h3>
              <span className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                {classCount}x{classCount} Evaluation Grid
              </span>
            </div>
            
            {classCount > 0 ? (
              <div className="space-y-4 overflow-x-auto">
                <div className="min-w-[320px]">
                  {/* Column Header (Predicted Classes) */}
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider text-center mb-2">
                    Predicted Class (Model Output)
                  </div>
                  
                  <div className="grid gap-2" style={{ gridTemplateColumns: `auto repeat(${classCount}, minmax(0, 1fr))` }}>
                    {/* Empty top-left cell */}
                    <div className="text-[10px] text-slate-500 font-semibold p-2 flex items-center justify-center">
                      Actual \ Pred
                    </div>
                    {/* Column class labels */}
                    {['crack', 'dent', 'normal', 'porosity'].slice(0, classCount).map((cls, idx) => (
                      <div key={`col-${idx}`} className="text-[11px] font-bold text-slate-300 p-2 text-center truncate bg-slate-900/60 rounded border border-slate-800 capitalize">
                        {cls}
                      </div>
                    ))}

                    {/* Matrix Rows */}
                    {matrix.map((row, r_idx) => {
                      const classNames = ['crack', 'dent', 'normal', 'porosity']
                      const rowLabel = classNames[r_idx] || `Class ${r_idx}`
                      return (
                        <React.Fragment key={`row-group-${r_idx}`}>
                          {/* Row label */}
                          <div className="text-[11px] font-bold text-slate-300 p-2 flex items-center justify-end truncate bg-slate-900/60 rounded border border-slate-800 capitalize">
                            {rowLabel}
                          </div>
                          {/* Matrix cells */}
                          {row.map((val, c_idx) => {
                            const isDiagonal = r_idx === c_idx
                            const totalRow = row.reduce((a, b) => a + b, 0)
                            const percentage = totalRow > 0 ? ((val / totalRow) * 100).toFixed(0) : 0
                            
                            const bg = isDiagonal 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 glow-emerald' 
                              : val > 0 
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                                : 'bg-slate-900/30 border-slate-800 text-slate-500'
                            
                            return (
                              <div key={`${r_idx}-${c_idx}`} className={`p-3 rounded-lg border text-center font-mono font-bold text-sm flex flex-col items-center justify-center ${bg}`}>
                                <span>{val}</span>
                                <span className="text-[9px] font-normal opacity-70 mt-0.5">{percentage}%</span>
                              </div>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-400 inline-block"/> Diagonal = True Positives (Correct)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-400 inline-block"/> Off-Diagonal = Misclassifications</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
                No matrix data computed. Run a validation split during model training to render.
              </div>
            )}
          </div>

          {historyData.length > 0 && (
            <div className="lg:col-span-2 glass-card rounded-xl p-5 border border-white/5 space-y-4">
              <h3 className="text-lg font-bold text-white">Loss Reduction Convergence</h3>
              <div className="h-64 bg-[#0f172a]/30 p-2 rounded-xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="epoch" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="TrainLoss" stroke="#06b6d4" strokeWidth={2} name="Train Loss" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ValLoss" stroke="#f43f5e" strokeWidth={2} name="Val Loss" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center text-slate-500 bg-[#0f172a]/20 border border-slate-800/40 rounded-xl">
          <Award className="w-12 h-12 mb-3 text-slate-600 animate-pulse" />
          <span>No models available. Deploy a model to inspect its detailed validation metrics and confusion matrix.</span>
        </div>
      )}
    </div>
  )
}
