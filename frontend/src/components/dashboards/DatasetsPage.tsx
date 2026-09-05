import React, { useState, useEffect } from 'react'
import { Database, Upload, Trash2, Play } from 'lucide-react'

interface Dataset {
  id: number
  name: string
  task_type: string
  path: string
  classes: string[]
  metadata_info: {
    image_count?: number
    formats?: string[]
    resolution?: string
    class_distribution?: Record<string, number>
  }
  created_at: string
}

interface DatasetsPageProps {
  token: string
  role: string
  onStartTraining: (datasetId: number, name: string) => void
}

export default function DatasetsPage({ token, role, onStartTraining }: DatasetsPageProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [uploadName, setUploadName] = useState('')
  const [taskType, setTaskType] = useState('classification')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/datasets', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setDatasets(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !uploadName) {
      setError('Please provide a name and select a zip file.')
      return
    }
    setLoading(true)
    setError('')
    setMsg('')

    const formData = new FormData()
    formData.append('name', uploadName)
    formData.append('task_type', taskType)
    formData.append('file', file)

    try {
      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Upload failed')
      }

      setMsg('Dataset uploaded and analyzed successfully!')
      setUploadName('')
      setFile(null)
      fetchDatasets()
    } catch (err: any) {
      setError(err.message || 'Error uploading dataset')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dataset? All models linked will be deleted.')) return
    try {
      const res = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchDatasets()
      } else {
        const data = await res.json()
        alert(data.detail || 'Delete failed')
      }
    } catch (e: any) {
      alert(e.message)
    }
  }

  const canModify = role === 'Admin' || role === 'Engineer'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">Dataset Registry</h1>
          <p className="text-slate-400 mt-1 text-sm">Upload, version, and analyze quality control image datasets</p>
        </div>
      </div>

      {canModify && (
        <div className="glass-card rounded-xl p-6 glow-cyan">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            Upload New Inspection Dataset
          </h2>

          {msg && <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm rounded-lg">{msg}</div>}
          {error && <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm rounded-lg">{error}</div>}

          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Dataset Name</label>
              <input
                type="text"
                required
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-sm"
                placeholder="e.g. Line1_Shaft_Dents"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Inspection Task</label>
              <select
                value={taskType}
                onChange={e => setTaskType(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-sm"
              >
                <option value="classification">Image Classification (Defect Types)</option>
                <option value="object_detection">Object Detection (Defect Location)</option>
                <option value="segmentation">Semantic Segmentation (Defect Masks)</option>
                <option value="anomaly_detection">Anomaly Detection (Unsupervised Autoencoder)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">ZIP Dataset File</label>
              <input
                type="file"
                required
                accept=".zip"
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20 transition duration-200 text-sm"
            >
              {loading ? 'Uploading & Analyzing...' : 'Upload ZIP'}
            </button>
          </form>
        </div>
      )}

      {/* Dataset Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {datasets.map(dataset => (
          <div key={dataset.id} className="glass-card rounded-xl p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg">
                  <Database className="w-5 h-5" />
                </span>
                <span className="text-xs uppercase px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full font-semibold border border-slate-700">
                  {dataset.task_type.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-1.5">{dataset.name}</h3>
              <p className="text-xs text-slate-400 mb-4">Uploaded: {new Date(dataset.created_at).toLocaleDateString()}</p>

              {/* Stats */}
              <div className="bg-[#0f172a]/60 rounded-lg p-3.5 space-y-2 text-sm border border-slate-800 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Total Images:</span>
                  <span className="text-white font-semibold">{dataset.metadata_info.image_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Resolution:</span>
                  <span className="text-white font-semibold">{dataset.metadata_info.resolution || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Formats:</span>
                  <span className="text-white font-semibold">{(dataset.metadata_info.formats || []).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">Classes:</span>
                  <span className="text-cyan-400 font-semibold truncate max-w-[150px]">
                    {dataset.classes.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800">
              {canModify && (
                <button
                  onClick={() => onStartTraining(dataset.id, dataset.name)}
                  className="flex-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Train Model
                </button>
              )}
              {role === 'Admin' && (
                <button
                  onClick={() => handleDelete(dataset.id)}
                  className="p-2 border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                  title="Delete Dataset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {datasets.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 bg-[#0f172a]/30 border border-dashed border-slate-800 rounded-xl">
            No datasets uploaded yet. Upload a classification or detection zip dataset to begin.
          </div>
        )}
      </div>
    </div>
  )
}
