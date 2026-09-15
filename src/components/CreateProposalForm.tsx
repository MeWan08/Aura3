'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { VENTUREDAO_ADDRESS, VENTUREDAO_ABI } from '@/constants/abis'
import { parseEther } from 'viem'
import { Loader2, UploadCloud, Rocket } from 'lucide-react'
import { useEthPrice } from '@/hooks/useEthPrice'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Radar, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
)

export function CreateProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount()
  const ethPrice = useEthPrice()
  const [fundingAmount, setFundingAmount] = useState('')
  const [valuation, setValuation] = useState('')
  const [fundingUnit, setFundingUnit] = useState<'eth' | 'usd'>('eth')
  const [valuationUnit, setValuationUnit] = useState<'eth' | 'usd'>('eth')
  const [description, setDescription] = useState('')
  const [cin, setCin] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<any>(null)

  const { data: hash, writeContract, error: writeError, isPending: isConfirmingInWallet } = useWriteContract()
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash })

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

  const convertToEth = (raw: string, unit: 'eth' | 'usd') => {
    const numeric = Number(raw)
    if (isNaN(numeric) || numeric <= 0) return 0
    if (unit === 'eth') return numeric
    if (!ethPrice || ethPrice <= 0) return 0
    return numeric / ethPrice
  }

  const formatEthString = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return ''
    return amount.toFixed(8).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  }

  const convertDisplayUnit = (value: string, from: 'eth' | 'usd', to: 'eth' | 'usd') => {
    if (from === to) return value
    const numeric = Number(value)
    if (isNaN(numeric) || numeric <= 0) return value
    if (!ethPrice || ethPrice <= 0) return value
    const converted = from === 'eth' ? numeric * ethPrice : numeric / ethPrice
    return converted.toFixed(2)
  }

  const getConversionHint = (value: string, unit: 'eth' | 'usd') => {
    const numeric = Number(value)
    if (!value || isNaN(numeric) || numeric <= 0) return ''
    if (!ethPrice || ethPrice <= 0) return 'Live conversion unavailable'

    if (unit === 'eth') {
      const usd = numeric * ethPrice
      return `≈ $${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    }

    const eth = numeric / ethPrice
    return `≈ ${eth.toFixed(6)} ETH`
  }

  const handleAnalyzeAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fundingEth = convertToEth(fundingAmount, fundingUnit)
    const valuationEth = convertToEth(valuation, valuationUnit)

    if (!address || !fundingAmount || !valuation || !description || !file || fundingEth <= 0 || valuationEth <= 0) return

    setIsAnalyzing(true)
    try {
      // 1. Register startup on the Python backend
      const registerRes = await fetch(`${BACKEND_URL}/api/startups/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: description.slice(0, 50),
          cin,
          domain: 'Blockchain/Web3',
          description,
          team: address,
        }),
      })
      if (!registerRes.ok) throw new Error('Failed to register startup')
      const startup = await registerRes.json()
      const startupId = startup.startup_id

      // 2. Upload the pitch PDF
      const formData = new FormData()
      formData.append('documents', file)
      const uploadRes = await fetch(`${BACKEND_URL}/api/startups/${startupId}/documents/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!uploadRes.ok) throw new Error('Failed to upload pitch deck')

      // 3. Trigger analysis
      const analyzeRes = await fetch(`${BACKEND_URL}/api/startups/${startupId}/analyze`, {
        method: 'POST',
      })
      if (!analyzeRes.ok) throw new Error('Failed to start analysis')

      // 4. Poll for results (max 2 minutes)
      let report = null
      for (let i = 0; i < 24; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const statusRes = await fetch(`${BACKEND_URL}/api/startups/${startupId}/report/status`)
        const statusData = await statusRes.json()
        if (statusData.status === 'complete' || statusData.status === 'completed') {
          report = statusData.analysis || statusData
          break
        }
        if (statusData.status === 'error' || statusData.status === 'failed') {
          throw new Error(statusData.error || 'Analysis failed')
        }
      }

      if (!report) throw new Error('Analysis timed out')

      setAnalysisReport(report)
    } catch (err) {
      console.error('Pitch analysis error:', err)
      alert(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}.`) 
    } finally {
      setIsAnalyzing(false)
    }
  }

  const confirmOnChain = () => {
    const fundingEth = convertToEth(fundingAmount, fundingUnit)
    const valuationEth = convertToEth(valuation, valuationUnit)
    const fundingEthString = formatEthString(fundingEth)
    const valuationEthString = formatEthString(valuationEth)

    if (!fundingEthString || !valuationEthString) return

    writeContract({
      address: VENTUREDAO_ADDRESS,
      abi: VENTUREDAO_ABI,
      functionName: 'submitProposal',
      args: [address as `0x${string}`, parseEther(fundingEthString), parseEther(valuationEthString), description],
      chainId: 11155111,
    })
  }

  if (isSuccess) {
    onSuccess()
  }

  return (
    <div className="border border-slate-200 bg-white">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <h2 className="text-[10px] font-bold font-mono text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Rocket className="w-3.5 h-3.5 text-[#0284c7]" /> Initialize Capital Stream
        </h2>
      </div>

      <div className="p-6">
        {!analysisReport ? (
          <form onSubmit={handleAnalyzeAndSubmit} className="space-y-6">
            <div className="grid grid-cols-2 border border-slate-200">
              <div className="p-4 border-r border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Funding Goal ({fundingUnit.toUpperCase()})</label>
                  <div className="flex border border-slate-200 bg-slate-50 rounded text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setFundingAmount(convertDisplayUnit(fundingAmount, fundingUnit, 'usd'))
                        setFundingUnit('usd')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-l-sm ${fundingUnit === 'usd' ? 'text-white bg-[#0284c7]' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFundingAmount(convertDisplayUnit(fundingAmount, fundingUnit, 'eth'))
                        setFundingUnit('eth')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-r-sm ${fundingUnit === 'eth' ? 'text-white bg-[#0284c7]' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                    >
                      ETH
                    </button>
                  </div>
                </div>
                <input
                  type="number" step="0.01" min="0" required
                  value={fundingAmount} onChange={e => setFundingAmount(e.target.value)}
                  className="input-field h-10"
                  placeholder={fundingUnit === 'eth' ? '0.00 ETH' : '0.00 USD'}
                />
                <p className="mt-1 text-[9px] font-mono text-slate-500 uppercase tracking-tight">{getConversionHint(fundingAmount, fundingUnit)}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Valuation ({valuationUnit.toUpperCase()})</label>
                  <div className="flex border border-slate-200 bg-slate-50 rounded text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setValuation(convertDisplayUnit(valuation, valuationUnit, 'usd'))
                        setValuationUnit('usd')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-l-sm ${valuationUnit === 'usd' ? 'text-white bg-[#0284c7]' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValuation(convertDisplayUnit(valuation, valuationUnit, 'eth'))
                        setValuationUnit('eth')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-r-sm ${valuationUnit === 'eth' ? 'text-white bg-[#0284c7]' : 'hover:bg-slate-100 hover:text-slate-700'}`}
                    >
                      ETH
                    </button>
                  </div>
                </div>
                <input
                  type="number" step="0.01" min="0" required
                  value={valuation} onChange={e => setValuation(e.target.value)}
                  className="input-field h-10"
                  placeholder={valuationUnit === 'eth' ? '0.00 ETH' : '0.00 USD'}
                />
                <p className="mt-1 text-[9px] font-mono text-slate-500 uppercase tracking-tight">{getConversionHint(valuation, valuationUnit)}</p>
              </div>
            </div>
            
            <div className="border border-slate-200 p-4 bg-white">
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-2">Venture Description</label>
              <textarea
                required rows={3}
                value={description} onChange={e => setDescription(e.target.value)}
                className="input-field min-h-[80px] py-3 resize-none mb-4"
                placeholder="High-level operational summary..."
              />
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-2 mt-4">CIN (Corporate Identification Number)</label>
              <input
                type="text" required
                value={cin} onChange={e => setCin(e.target.value)}
                className="input-field h-10 uppercase"
                placeholder="e.g. U01110TZ2024PTC035123"
              />
            </div>

            <div className="border border-slate-200 bg-white">
              <label className="block text-[9px] font-bold text-slate-500 uppercase p-4 border-b border-slate-200">Telemetry: Pitch Deck (PDF)</label>
              <div className="p-8 text-center relative group">
                <input 
                  type="file" accept=".pdf" required
                  onChange={e => setFile(e.target.files?.[0] ?? null)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-3 group-hover:text-[#0284c7] transition-colors" />
                <p className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-tighter">
                  {file ? <span className="text-emerald-600">{file.name}</span> : "Upload data package to initialize analysis"}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="btn-pro btn-pro-cyan w-full h-12"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> SYNCHRONIZING WITH AI ENGINE...</>
              ) : (
                'ANALYZE & PREPARE ON-CHAIN DATA'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="border border-emerald-200 bg-emerald-50 p-6 font-mono">
              <div className="flex justify-between items-center mb-6 border-b border-emerald-200 pb-4">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  AI Audit Synthesis
                </h3>
                <span className="text-sm text-emerald-900 font-black bg-emerald-200 px-3 py-1 rounded-full">Score: {analysisReport.score}/10</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2 border-b border-emerald-200/50 pb-1">Executive Summary</h4>
                  <p className="text-[10px] text-emerald-800 leading-relaxed mb-6">
                    {analysisReport.executiveSummary}
                  </p>
                  
                  {analysisReport.categoryScores && (
                    <div className="w-full max-w-[250px] mx-auto opacity-90">
                      <Radar
                        data={{
                          labels: ['Team', 'Market', 'Product', 'Traction', 'Risk'],
                          datasets: [
                            {
                              label: 'AI Evaluation Score',
                              data: [
                                analysisReport.categoryScores.team || 0,
                                analysisReport.categoryScores.market || 0,
                                analysisReport.categoryScores.product || 0,
                                analysisReport.categoryScores.traction || 0,
                                analysisReport.categoryScores.risk || 0,
                              ],
                              backgroundColor: 'rgba(16, 185, 129, 0.2)',
                              borderColor: 'rgba(16, 185, 129, 0.8)',
                              pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                              pointBorderColor: '#fff',
                              pointHoverBackgroundColor: '#fff',
                              pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
                            },
                          ],
                        }}
                        options={{
                          scales: {
                            r: {
                              min: 0,
                              max: 10,
                              ticks: { stepSize: 2, display: false },
                              grid: { color: 'rgba(16, 185, 129, 0.1)' },
                              pointLabels: { font: { size: 9, family: 'monospace' }, color: '#047857' }
                            },
                          },
                          plugins: { legend: { display: false } },
                          maintainAspectRatio: true,
                        }}
                      />
                    </div>
                  )}

                  {analysisReport.projectedRevenue && analysisReport.projectedRevenue.length > 0 && (
                    <div className="w-full mt-6">
                      <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2 border-b border-emerald-200/50 pb-1">Projected Revenue (in Millions)</h4>
                      <div className="w-full h-[180px]">
                        <Bar
                          data={{
                            labels: analysisReport.projectedRevenue.map((r: any) => r.year),
                            datasets: [
                              {
                                label: 'Revenue ($M)',
                                data: analysisReport.projectedRevenue.map((r: any) => r.revenue),
                                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                                borderRadius: 4,
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(16, 185, 129, 0.1)' },
                                ticks: { font: { size: 9, family: 'monospace' }, color: '#047857' }
                              },
                              x: {
                                grid: { display: false },
                                ticks: { font: { size: 9, family: 'monospace' }, color: '#047857' }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1 border-b border-emerald-200/50 pb-1">Market Analysis</h4>
                    <div className="text-[10px] text-emerald-800 leading-relaxed prose prose-sm prose-emerald max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisReport.marketAnalysis}</ReactMarkdown>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1 border-b border-emerald-200/50 pb-1">Team Assessment</h4>
                    <div className="text-[10px] text-emerald-800 leading-relaxed prose prose-sm prose-emerald max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisReport.teamAssessment}</ReactMarkdown>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1 border-b border-emerald-200/50 pb-1">Key Risks</h4>
                    <div className="text-[10px] text-emerald-800 leading-relaxed prose prose-sm prose-emerald max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisReport.riskFactors}</ReactMarkdown>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1 border-b border-emerald-200/50 pb-1">Recommendation</h4>
                    <div className="text-[10px] font-semibold text-emerald-900 leading-relaxed prose prose-sm prose-emerald max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisReport.recommendation}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={confirmOnChain}
              disabled={
                isConfirmingInWallet ||
                isMining ||
                convertToEth(fundingAmount, fundingUnit) <= 0 ||
                convertToEth(valuation, valuationUnit) <= 0
              }
              className="btn-pro btn-pro-cyan w-full h-12"
            >
              {isConfirmingInWallet ? 'INITIALIZING WALLET HANDSHAKE...' : isMining ? 'MINING DATA TO MAINNET...' : 'EXECUTE ON-CHAIN DEPLOYMENT'}
            </button>
            {writeError && <div className="text-red-500 font-mono text-[9px] uppercase mt-2">Error: {writeError.message}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
