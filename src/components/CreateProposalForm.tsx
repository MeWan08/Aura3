'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { VENTUREDAO_ADDRESS, VENTUREDAO_ABI } from '@/constants/abis'
import { parseEther } from 'viem'
import { Loader2, UploadCloud, Rocket } from 'lucide-react'
import { useEthPrice } from '@/hooks/useEthPrice'

export function CreateProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount()
  const ethPrice = useEthPrice()
  const [fundingAmount, setFundingAmount] = useState('')
  const [valuation, setValuation] = useState('')
  const [fundingUnit, setFundingUnit] = useState<'eth' | 'usd'>('eth')
  const [valuationUnit, setValuationUnit] = useState<'eth' | 'usd'>('eth')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<any>(null)

  const { data: hash, writeContract, error: writeError, isPending: isConfirmingInWallet } = useWriteContract()
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash })

  const BACKEND_URL = 'https://aravsaxena884-dao.hf.space'

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
    <div className="border border-[#111] bg-black">
      <div className="p-6 border-b border-[#111] bg-[#050505]">
        <h2 className="text-[10px] font-bold font-mono text-white uppercase tracking-widest flex items-center gap-2">
          <Rocket className="w-3.5 h-3.5 text-[#03e1ff]" /> Initialize Capital Stream
        </h2>
      </div>

      <div className="p-6">
        {!analysisReport ? (
          <form onSubmit={handleAnalyzeAndSubmit} className="space-y-6">
            <div className="grid grid-cols-2 border border-[#111]">
              <div className="p-4 border-r border-[#111]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-bold text-sky-300 uppercase">Funding Goal ({fundingUnit.toUpperCase()})</label>
                  <div className="flex border border-[#1a1a1a] bg-[#080808]">
                    <button
                      type="button"
                      onClick={() => {
                        setFundingAmount(convertDisplayUnit(fundingAmount, fundingUnit, 'usd'))
                        setFundingUnit('usd')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${fundingUnit === 'usd' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFundingAmount(convertDisplayUnit(fundingAmount, fundingUnit, 'eth'))
                        setFundingUnit('eth')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${fundingUnit === 'eth' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
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
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-bold text-sky-300 uppercase">Valuation ({valuationUnit.toUpperCase()})</label>
                  <div className="flex border border-[#1a1a1a] bg-[#080808]">
                    <button
                      type="button"
                      onClick={() => {
                        setValuation(convertDisplayUnit(valuation, valuationUnit, 'usd'))
                        setValuationUnit('usd')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${valuationUnit === 'usd' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValuation(convertDisplayUnit(valuation, valuationUnit, 'eth'))
                        setValuationUnit('eth')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${valuationUnit === 'eth' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
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
              </div>
            </div>
            
            <div className="border border-[#111] p-4">
              <label className="block text-[9px] font-bold text-sky-300 uppercase mb-2">Venture Description</label>
              <textarea
                required rows={3}
                value={description} onChange={e => setDescription(e.target.value)}
                className="input-field min-h-[80px] py-3 resize-none"
                placeholder="High-level operational summary..."
              />
            </div>

            <div className="border border-[#111] bg-black">
              <label className="block text-[9px] font-bold text-sky-300 uppercase p-4 border-b border-[#111]">Telemetry: Pitch Deck (PDF)</label>
              <div className="p-8 text-center relative group">
                <input 
                  type="file" accept=".pdf" required
                  onChange={e => setFile(e.target.files?.[0] ?? null)} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <UploadCloud className="w-6 h-6 text-sky-200 mx-auto mb-3 group-hover:text-[#03e1ff] transition-colors" />
                <p className="text-[9px] font-bold font-mono text-sky-300 uppercase tracking-tighter">
                  {file ? <span className="text-[#00ffbd]">{file.name}</span> : "Upload data package to initialize analysis"}
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
            <div className="border border-[#00ffbd]/20 bg-[#00ffbd]/5 p-6 font-mono">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-bold text-[#00ffbd] uppercase tracking-widest">AI Audit: SYNTHESIS_COMPLETE</h3>
                <span className="text-xs text-white font-bold">{analysisReport.score}/10</span>
              </div>
              <p className="text-[10px] text-[#00ffbd]/70 uppercase leading-relaxed">
                {analysisReport.executiveSummary}
              </p>
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
