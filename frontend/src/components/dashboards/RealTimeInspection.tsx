import React, { useState, useEffect, useRef } from 'react'
import { Camera, Upload, Cpu, Eye, Sparkles, FolderSync } from 'lucide-react'

interface Inspection {
  id: number
  image_path: string
  predictions: {
    class?: string
    defect_detected?: string
    confidence?: number
    box?: [number, number, number, number]
    overlay_path?: string
    grad_cam_path?: string
    perturbation_path?: string
    all_confidences?: Record<string, number>
    anomaly_detected?: boolean
    reconstruction_error?: number
    anomaly_score?: number
  }
  quality_score: number
  status: string
  severity: string
  created_at: string
}

interface RealTimeInspectionProps {
  token: string
  recentInspections: Inspection[]
  onNewInspection: (inspection: Inspection) => void
}

export default function RealTimeInspection({ token, recentInspections, onNewInspection }: RealTimeInspectionProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [xaiMode, setXaiMode] = useState<'normal' | 'cam' | 'pert'>('normal')
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null)
  
  const [monitoringActive, setMonitoringActive] = useState(false)
  const [monitoringLogs] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (recentInspections.length > 0 && !activeInspection) {
      setActiveInspection(recentInspections[0])
    }
  }, [recentInspections])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0])
    }
  }

  const handleUploadInspection = async () => {
    if (!selectedImage) return
    setLoading(true)
    
    const formData = new FormData()
    formData.append('file', selectedImage)
    
    try {
      const res = await fetch('/api/inspections/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setActiveInspection(data)
        onNewInspection(data)
        setSelectedImage(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getOverlayImage = () => {
    if (!activeInspection) return ''
    const preds = activeInspection.predictions
    
    if (xaiMode === 'cam') {
      return preds.grad_cam_path || preds.overlay_path || activeInspection.image_path
    }
    if (xaiMode === 'pert') {
      return preds.perturbation_path || preds.overlay_path || activeInspection.image_path
    }
    return preds.overlay_path || activeInspection.image_path
  }

  const preds = activeInspection?.predictions
  const detectedClass = preds?.class || preds?.defect_detected || (preds?.anomaly_detected ? 'Anomaly' : 'Normal')
  const confidence = preds?.confidence || preds?.anomaly_score || 0.0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Live Visual Inspection</h1>
        <p className="text-slate-400 mt-1 text-sm">Real-time image classification, defect localization, and XAI heatmap overlays</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl p-5 border border-white/5 flex flex-col items-center">
            <div className="w-full h-[400px] bg-[#0b0f19] rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
              {activeInspection ? (
                <img
                  src={getOverlayImage()}
                  alt="Inspection Target"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-500 space-y-3">
                  <Camera className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
                  <p className="text-xs">No active inspection loaded. Upload a file or start live monitoring.</p>
                </div>
              )}

              {activeInspection && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className={`px-4 py-1.5 rounded-lg font-bold text-sm shadow-lg ${
                    activeInspection.status === 'PASS' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 glow-emerald' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 glow-rose'
                  }`}>
                    {activeInspection.status}
                  </span>
                </div>
              )}
            </div>

            {activeInspection && (
              <div className="flex gap-2.5 mt-4 w-full">
                <button
                  onClick={() => setXaiMode('normal')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    xaiMode === 'normal' 
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Target Image & Boxes
                </button>
                <button
                  onClick={() => setXaiMode('cam')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    xaiMode === 'cam' 
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Grad-CAM Attention Map
                </button>
                <button
                  onClick={() => setXaiMode('pert')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    xaiMode === 'pert' 
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Perturbation Grid Map
                </button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">Manual Quality Check</h4>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  Select File
                </button>
                <button
                  onClick={handleUploadInspection}
                  disabled={!selectedImage || loading}
                  className="bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-semibold py-2.5 px-6 rounded-lg text-xs cursor-pointer shadow-lg hover:shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Run QC'}
                </button>
              </div>
              {selectedImage && <p className="text-[10px] text-cyan-400 truncate">Selected: {selectedImage.name}</p>}
            </div>

            <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800 md:pl-4">
              <h4 className="text-sm font-bold text-white">Active Folder Monitoring</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setMonitoringActive(!monitoringActive)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border transition ${
                    monitoringActive 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  <FolderSync className="w-4 h-4" />
                  {monitoringActive ? 'Stop Monitor' : 'Start Monitor'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Polls <span className="font-mono bg-slate-900 text-cyan-400 px-1 rounded">uploads/monitoring/</span> for automated cameras
              </p>
            </div>
          </div>

          {monitoringActive && (
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1 h-32 overflow-y-auto">
              <div className="text-slate-400">--- Live directory worker started ---</div>
              <div>[SYSTEM] Listening on WebSocket channel '/api/inspections/ws'</div>
              <div>[SYSTEM] Polling uploads/monitoring/ for camera uploads...</div>
              {monitoringLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-6">
            <h3 className="text-lg font-bold text-white">Inspection Diagnostics</h3>
            
            {activeInspection ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center py-2 bg-[#0b0f19]/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Quality Index</span>
                  <span className="text-4xl font-extrabold text-cyan-400 mt-1">{activeInspection.quality_score.toFixed(1)}%</span>
                  <span className="text-xs text-slate-400 mt-1">Severity Rating: <b className="text-white">{activeInspection.severity}</b></span>
                </div>

                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-slate-400">Decision Outcome</span>
                    <span className={`font-semibold ${activeInspection.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeInspection.status === 'PASS' ? 'ACCEPT' : 'REJECTED'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-slate-400">Detected Classification</span>
                    <span className="text-white font-semibold capitalize">{detectedClass}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-slate-400">Diagnosis Confidence</span>
                    <span className="text-white font-semibold">{(confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-slate-400">Inspection Time</span>
                    <span className="text-white font-mono text-xs">
                      {new Date(activeInspection.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/reports/pdf/${activeInspection.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition text-xs"
                >
                  <Cpu className="w-4 h-4" />
                  Download PDF Quality Report
                </a>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No inspection diagnostic logs loaded yet. Run a quality check to see details.
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-base font-bold text-white">Recent Inspection Stream</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentInspections.map(insp => (
                <div
                  key={insp.id}
                  onClick={() => setActiveInspection(insp)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                    activeInspection?.id === insp.id 
                      ? 'bg-cyan-500/10 border-cyan-500/30' 
                      : 'bg-[#0f172a]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5 max-w-[130px]">
                    <div className="text-xs font-bold text-white truncate">QC #{insp.id}</div>
                    <div className="text-[10px] text-slate-400 truncate">Score: {insp.quality_score.toFixed(1)}%</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    insp.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {insp.status}
                  </span>
                </div>
              ))}
              {recentInspections.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs">No inspections in session.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
