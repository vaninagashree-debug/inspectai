import { HardDrive, Server, FileSpreadsheet, Download } from 'lucide-react'

interface SummaryData {
  total_inspected: number
  active_models: number
  active_datasets: number
}

interface OperationsDashboardProps {
  summary: SummaryData
}

export default function OperationsDashboard({ summary }: OperationsDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-wide">Operations Control</h1>
        <p className="text-slate-400 mt-1 text-sm">System storage management, data retention configurations, and bulk log export tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            Storage Utilization
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Disk space (Datasets & Models)</span>
                <span className="text-white font-semibold">12.4 GB / 100 GB</span>
              </div>
              <div className="w-full bg-[#0b0f19] h-2 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-cyan-500 h-full w-[12.4%]" />
              </div>
            </div>

            <div className="pt-2 flex justify-between">
              <span className="text-slate-400">Total Quality Logs Size:</span>
              <span className="text-white font-semibold">1.8 MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Image Buffer Retention:</span>
              <span className="text-cyan-400 font-semibold">30 Days</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Database Metrics
          </h3>
          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Inspections Table:</span>
              <span className="text-white font-semibold">{summary.total_inspected} rows</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Models Table:</span>
              <span className="text-white font-semibold">{summary.active_models} rows</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Datasets Table:</span>
              <span className="text-white font-semibold">{summary.active_datasets} rows</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-white/5 space-y-4 flex flex-col justify-between glow-cyan">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              Quality Records Export
            </h3>
            <p className="text-xs text-slate-400 mt-1">Download bulk platform reports including decision status and severities</p>
          </div>

          <div className="space-y-2">
            <a
              href="/api/reports/excel"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition text-xs border border-slate-800"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Download Bulk Excel Report
            </a>
            <a
              href="/api/reports/csv"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition text-xs border border-slate-800"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download Bulk CSV Log
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
