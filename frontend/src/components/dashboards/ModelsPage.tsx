import { useState, useEffect } from 'react'
import { Cpu, Award, RotateCw, Trash2, Power } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Model {
  id: number
  name: string
  version: number
  dataset_id: number
  task_type: string
  path: string
  metrics: {
    accuracy?: number
    precision?: number
    recall?: number
    f1_score?: number
    history?: {
      train_loss: number[]
      val_loss: number[]
      val_accuracy: number[]
    }
  }
  status: string
  hyperparameters: Record<string, any>
  is_production: boolean
  created_at: string
}

interface ModelsPageProps {
  token: string
  role: string
  trainingTrigger: { datasetId: number; name: string } | null
  onClearTrainingTrigger: () => void
}

export default function ModelsPage({ token, role, trainingTrigger, onClearTrainingTrigger }: ModelsPageProps) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [trainingStatus, setTrainingStatus] = useState<any>(null)
  const [activeTrainingId, setActiveTrainingId] = useState<number | null>(null)

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setModels(data)
        const training = data.find((m: Model) => m.status === 'training' || m.status === 'optimizing')
        if (training) {
          setActiveTrainingId(training.id)
        } else {
          setActiveTrainingId(null)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const triggerTraining = async (datasetId: number, name: string) => {
    try {
      const res = await fetch(`/api/models/train?dataset_id=${datasetId}&name=${name}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const newModel = await res.json()
        setActiveTrainingId(newModel.id)
        fetchModels()
      } else {
        const data = await res.json()
        alert(data.detail || 'Training trigger failed')
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      onClearTrainingTrigger()
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    if (trainingTrigger) {
      triggerTraining(trainingTrigger.datasetId, trainingTrigger.name)
    }
  }, [trainingTrigger])

  useEffect(() => {
    if (activeTrainingId === null) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/models/progress/${activeTrainingId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const progress = await res.json()
          setTrainingStatus(progress)
          if (progress.status === 'active' || progress.status === 'error') {
            setActiveTrainingId(null)
            setTrainingStatus(null)
            fetchModels()
          }
        }
      } catch (e) {
        console.error(e)
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [activeTrainingId])

  const handleToggleProduction = async (model: Model) => {
    const isProd = !model.is_production
    try {
      const res = await fetch(`/api/models/${model.id}/production`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_production: isProd })
      })
      if (res.ok) {
        fetchModels()
        if (selectedModel?.id === model.id) {
          setSelectedModel({ ...model, is_production: isProd })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this model version?')) return
    try {
      const res = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        if (selectedModel?.id === id) setSelectedModel(null)
        fetchModels()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const canModify = role === 'Admin' || role === 'Engineer'

  const chartData = selectedModel?.metrics?.history?.train_loss?.map((loss, idx) => ({
    epoch: idx + 1,
    trainLoss: loss,
    valLoss: selectedModel.metrics.history?.val_loss[idx] || 0,
    accuracy: selectedModel.metrics.history?.val_accuracy[idx] || 0
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Model Registry</h1>
        <p className="text-slate-400 mt-1 text-sm">Register, evaluate, tune, and deploy deep learning inspection models</p>
      </div>

      {activeTrainingId && (
        <div className="bg-cyan-950/30 border border-cyan-500/30 p-5 rounded-xl flex items-center justify-between glow-cyan">
          <div className="flex items-center gap-3">
            <RotateCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <div>
              <h3 className="font-bold text-white">Hyperparameter Optimization & Training Loop In Progress...</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {trainingStatus?.status === 'optimizing' 
                  ? 'Optuna finding best learning rate/batch size...' 
                  : `Training Network (Epoch: ${trainingStatus?.epoch || 1}/5)`
                }
              </p>
            </div>
          </div>
          {trainingStatus?.epoch > 0 && (
            <div className="text-right text-sm">
              <div className="text-cyan-400 font-semibold">Loss: {trainingStatus.val_loss?.toFixed(4) || 'N/A'}</div>
              <div className="text-emerald-400 text-xs mt-0.5">Acc: {(trainingStatus.accuracy * 100)?.toFixed(1) || '0.0'}%</div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-slate-300">Available Models</h2>
          {models.map(model => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model)}
              className={`p-4 rounded-xl cursor-pointer border transition text-left relative ${
                selectedModel?.id === model.id
                  ? 'bg-cyan-500/10 border-cyan-500 glow-cyan'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white text-base truncate max-w-[150px]">{model.name}</h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                    V{model.version}
                  </span>
                  {model.is_production && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      PROD
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs mt-3">
                <span className="text-slate-400 capitalize">{model.task_type.replace('_', ' ')}</span>
                <span className={`font-semibold ${
                  model.status === 'active' ? 'text-emerald-400' : model.status === 'error' ? 'text-rose-400' : 'text-amber-400 animate-pulse'
                }`}>
                  {model.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}

          {models.length === 0 && (
            <div className="p-8 text-center text-slate-500 bg-[#0f172a]/30 border border-dashed border-slate-800 rounded-xl">
              No models trained yet. Go to Datasets page and trigger training.
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedModel ? (
            <div className="glass-card rounded-xl p-6 border border-white/5 space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedModel.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 capitalize">
                    {selectedModel.task_type.replace('_', ' ')} Model | Version {selectedModel.version}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canModify && (
                    <button
                      onClick={() => handleToggleProduction(selectedModel)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                        selectedModel.is_production
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {selectedModel.is_production ? 'Retire Production' : 'Promote to Production'}
                    </button>
                  )}
                  {role === 'Admin' && (
                    <button
                      onClick={() => handleDelete(selectedModel.id)}
                      className="p-1.5 border border-rose-500/30 bg-rose-500/5 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0f172a]/60 rounded-xl p-4 border border-slate-800 text-center">
                  <span className="text-slate-400 text-xs block mb-1">Accuracy</span>
                  <span className="text-2xl font-bold text-cyan-400">
                    {selectedModel.metrics.accuracy ? `${(selectedModel.metrics.accuracy * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="bg-[#0f172a]/60 rounded-xl p-4 border border-slate-800 text-center">
                  <span className="text-slate-400 text-xs block mb-1">Precision</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {selectedModel.metrics.precision ? `${(selectedModel.metrics.precision * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="bg-[#0f172a]/60 rounded-xl p-4 border border-slate-800 text-center">
                  <span className="text-slate-400 text-xs block mb-1">Recall</span>
                  <span className="text-2xl font-bold text-violet-400">
                    {selectedModel.metrics.recall ? `${(selectedModel.metrics.recall * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div className="bg-[#0f172a]/60 rounded-xl p-4 border border-slate-800 text-center">
                  <span className="text-slate-400 text-xs block mb-1">F1-Score</span>
                  <span className="text-2xl font-bold text-pink-400">
                    {selectedModel.metrics.f1_score ? `${(selectedModel.metrics.f1_score * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-300">Training History (Loss curves)</h4>
                  <div className="h-60 bg-[#0f172a]/40 p-2 rounded-xl border border-slate-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="epoch" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, color: '#fff' }} />
                        <Line type="monotone" dataKey="trainLoss" stroke="#06b6d4" strokeWidth={2} name="Train Loss" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="valLoss" stroke="#f43f5e" strokeWidth={2} name="Val Loss" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="bg-[#0f172a]/40 rounded-xl p-5 border border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Optuna Hyperparameters & Paths
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="text-slate-400">Optimized Batch Size: <span className="text-white">{selectedModel.hyperparameters.batch_size || 16}</span></div>
                    <div className="text-slate-400">Optimized Learning Rate: <span className="text-white">{selectedModel.hyperparameters.lr || '1e-3'}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-400 truncate">Weights Storage: <span className="text-cyan-400" title={selectedModel.path}>{selectedModel.path}</span></div>
                    <div className="text-slate-400">Registered: <span className="text-white">{new Date(selectedModel.created_at).toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 bg-[#0f172a]/20 border border-slate-800/40 rounded-xl">
              <Award className="w-12 h-12 mb-3 text-slate-600" />
              <span>Select a model from the list to view validation performance metrics, curves, and hyperparameter logs.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
