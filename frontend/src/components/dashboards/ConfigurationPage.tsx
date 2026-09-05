import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

interface QualityRule {
  id: number
  name: string
  task_type: string
  class_name: string
  operator: string
  threshold: number
  severity: string
  is_active: boolean
}

interface SystemSetting {
  id: number
  key: string
  value: string
  group: string
}

interface InspectionParameter {
  id: number
  name: string
  value: string
  data_type: string
  description?: string
}

interface ConfigurationPageProps {
  token: string
  role: string
}

export default function ConfigurationPage({ token, role }: ConfigurationPageProps) {
  const [rules, setRules] = useState<QualityRule[]>([])
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [params, setParams] = useState<InspectionParameter[]>([])

  const [ruleName, setRuleName] = useState('')
  const [taskType, setTaskType] = useState('classification')
  const [className, setClassName] = useState('')
  const [operator, setOperator] = useState('>')
  const [threshold, setThreshold] = useState(0.75)
  const [severity, setSeverity] = useState('High')
  
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const r_res = await fetch('/api/rules/quality', { headers })
      const s_res = await fetch('/api/rules/settings', { headers })
      const p_res = await fetch('/api/rules/parameters', { headers })
      
      if (r_res.ok) setRules(await r_res.json())
      if (s_res.ok) setSettings(await s_res.json())
      if (p_res.ok) setParams(await p_res.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMsg('')
    try {
      const res = await fetch('/api/rules/quality', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: ruleName,
          task_type: taskType,
          class_name: className.toLowerCase() || 'all',
          operator,
          threshold,
          severity,
          is_active: true
        })
      })

      if (res.ok) {
        setMsg('Quality rule added successfully!')
        setRuleName('')
        setClassName('')
        fetchData()
      } else {
        const d = await res.json()
        throw new Error(d.detail || 'Failed to create rule')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteRule = async (id: number) => {
    if (!window.confirm('Delete this rule?')) return
    try {
      const res = await fetch(`/api/rules/quality/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateSetting = async (id: number, key: string, value: string, group: string) => {
    try {
      const res = await fetch(`/api/rules/settings/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key, value, group })
      })
      if (res.ok) {
        fetchData()
        alert('Setting updated successfully!')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateParam = async (id: number, name: string, value: string, data_type: string) => {
    try {
      const res = await fetch(`/api/rules/parameters/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, value, data_type })
      })
      if (res.ok) {
        fetchData()
        alert('Parameter updated successfully!')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const canModify = role === 'Admin' || role === 'Engineer'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Dynamic Configurations</h1>
        <p className="text-slate-400 mt-1 text-sm">Configure threshold rules, camera settings, and line alerts dynamically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl p-5 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4">Inspection quality criteria rules</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#0f172a]/60 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-3">Rule Name</th>
                    <th className="p-3">Task</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                    {canModify && <th className="p-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-slate-900/40">
                      <td className="p-3 font-semibold text-white">{rule.name}</td>
                      <td className="p-3 capitalize">{rule.task_type.replace('_', ' ')}</td>
                      <td className="p-3 text-cyan-400 font-mono">{rule.class_name}</td>
                      <td className="p-3 font-mono">{rule.operator} {rule.threshold}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          rule.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                          rule.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="p-3">
                        {rule.is_active ? (
                          <span className="text-emerald-400 text-xs">Active</span>
                        ) : (
                          <span className="text-slate-500 text-xs">Inactive</span>
                        )}
                      </td>
                      {canModify && (
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">No active rules defined.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {canModify && (
            <div className="glass-card rounded-xl p-5 border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4">Add Quality Control Rule</h3>
              
              {msg && <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm rounded-lg">{msg}</div>}
              {error && <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm rounded-lg">{error}</div>}

              <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rule Description</label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    placeholder="e.g. Fail if scratch detected"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Task Type</label>
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value="classification">Classification</option>
                    <option value="object_detection">Object Detection</option>
                    <option value="segmentation">Segmentation</option>
                    <option value="anomaly_detection">Anomaly Detection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Class</label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    placeholder="e.g. scratch, dent, anomaly"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Operator</label>
                  <select
                    value={operator}
                    onChange={e => setOperator(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value=">">&gt; (Greater Than)</option>
                    <option value="<">&lt; (Less Than)</option>
                    <option value=">=">&gt;= (Greater or Equal)</option>
                    <option value="<=">&lt;= (Less or Equal)</option>
                    <option value="==">== (Equal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Confidence Threshold (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value))}
                    className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Trigger Severity</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700/60 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="col-span-full bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-cyan-500/20 transition text-xs mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Quality Rule
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Inspection Parameters</h3>
            {params.map(p => (
              <div key={p.id} className="space-y-1.5 p-3 bg-[#0f172a]/60 rounded-lg border border-slate-800">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-300">{p.name.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">{p.data_type}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{p.description}</p>
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="text"
                    defaultValue={p.value}
                    disabled={!canModify}
                    onBlur={e => handleUpdateParam(p.id, p.name, e.target.value, p.data_type)}
                    className="bg-[#0b0f19] border border-slate-800 text-white text-xs px-2 py-1 rounded w-full focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white mb-2">Camera & Storage Settings</h3>
            {settings.map(s => (
              <div key={s.id} className="space-y-1 p-3 bg-[#0f172a]/60 rounded-lg border border-slate-800">
                <span className="text-xs font-bold text-slate-300 capitalize">{s.key.replace(/_/g, ' ')}</span>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    defaultValue={s.value}
                    disabled={role !== 'Admin'}
                    onBlur={e => handleUpdateSetting(s.id, s.key, e.target.value, s.group)}
                    className="bg-[#0b0f19] border border-slate-800 text-white text-xs px-2 py-1 rounded w-full focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
