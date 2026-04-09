'use client'

import { useState } from 'react'
import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { STARTUPCONTRACT_ABI } from '@/constants/abis'
import { formatEther, parseEther } from 'viem'
import { Loader2, Settings, Lock, Unlock, Copy, ExternalLink, ShieldCheck, Zap } from 'lucide-react'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { useEthPrice } from '@/hooks/useEthPrice'

export function FounderStartupActions({ address, valuation: initialValuation }: { address: `0x${string}`, valuation: bigint }) {
  const { writeContract, isPending } = useWriteContract()
  const ethPrice = useEthPrice()

  // Read state
  const { data: currentValuation } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'valuation',
  })
  const { data: exitOpen } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'exitOpen',
  })
  const { data: exitValuation } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'exitValuation',
  })
  const { data: exitPool } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'exitPool',
  })
  const { data: startupTokenAddress } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'getStartupToken',
  })

  const [copied, setCopied] = useState<'contract' | 'token' | null>(null)

  const handleCopy = (text: string, type: 'contract' | 'token') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const [inputValuation, setInputValuation] = useState('')
  const [inputPool, setInputPool] = useState('')
  const [valuationUnit, setValuationUnit] = useState<'eth' | 'usd'>('eth')
  const [poolUnit, setPoolUnit] = useState<'eth' | 'usd'>('eth')

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

  const handleOpenExit = () => {
    if (!inputValuation || !inputPool) return
    const valEth = convertToEth(inputValuation, valuationUnit)
    const poolEth = convertToEth(inputPool, poolUnit)
    const valuationEthString = formatEthString(valEth)
    const poolEthString = formatEthString(poolEth)
    if (!valuationEthString || !poolEthString) return

    writeContract({
      address,
      abi: STARTUPCONTRACT_ABI,
      functionName: 'openExit',
      args: [parseEther(valuationEthString)],
      value: parseEther(poolEthString),
      chainId: 11155111,
    })
  }

  const handleCloseExit = () => {
    writeContract({
      address,
      abi: STARTUPCONTRACT_ABI,
      functionName: 'closeExit',
      chainId: 11155111,
    })
  }

  return (
    <div className="bg-[#050505] flex flex-col h-full border-r border-[#111]">
      <div className="h-[60px] p-6 border-b border-[#111] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-[#03e1ff]" />
          <h3 className="text-[10px] font-bold font-mono text-white uppercase tracking-widest">Founder Controls</h3>
        </div>
        <div className={`px-2 py-0.5 border text-[8px] font-bold font-mono uppercase tracking-tighter ${exitOpen ? 'bg-[#00ffbd]/5 text-[#00ffbd] border-[#00ffbd]/20' : 'bg-[#333]/5 text-sky-400 border-[#111]'}`}>
          {exitOpen ? 'Stream: Open' : 'Stream: Locked'}
        </div>
      </div>

      <div className="p-6 overflow-y-auto">
        <div className="space-y-px bg-[#111] border border-[#111] mb-6">
          <div className="bg-black p-3 flex items-center justify-between group">
            <div className="flex items-center gap-3 overflow-hidden">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
              <div className="overflow-hidden">
                <p className="text-[9px] text-sky-300 font-bold uppercase tracking-tight">Contract ID</p>
                <p className="font-mono text-[10px] text-white truncate">{address}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCopy(address, 'contract')} className="p-1 hover:text-[#03e1ff] transition-colors text-sky-400">
                {copied === 'contract' ? <span className="text-[8px] text-[#00ffbd]">COPIED</span> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noreferrer" className="p-1 hover:text-[#03e1ff] transition-colors text-sky-400">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {startupTokenAddress && (
            <div className="bg-black p-3 flex items-center justify-between group">
              <div className="flex items-center gap-3 overflow-hidden">
                <Zap className="w-3.5 h-3.5 text-sky-300" />
                <div className="overflow-hidden">
                  <p className="text-[9px] text-sky-300 font-bold uppercase tracking-tight">Token ID</p>
                  <p className="font-mono text-[10px] text-white truncate">{startupTokenAddress as string}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleCopy(startupTokenAddress as string, 'token')} className="p-1 hover:text-[#03e1ff] transition-colors text-sky-400">
                  {copied === 'token' ? <span className="text-[8px] text-[#00ffbd]">COPIED</span> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a href={`https://sepolia.etherscan.io/address/${startupTokenAddress}`} target="_blank" rel="noreferrer" className="p-1 hover:text-[#03e1ff] transition-colors text-sky-400">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 border border-[#111]">
          <div className="p-4 border-r border-[#111] bg-black">
            <p className="text-[9px] font-bold text-sky-300 uppercase mb-2 tracking-wide">Target Valuation</p>
            <p className="text-sm font-mono text-white leading-none">
              {Number(formatEther(currentValuation ? (currentValuation as bigint) : initialValuation)).toFixed(4)}
              <span className="text-[9px] text-[#444] ml-1">ETH</span>
            </p>
          </div>
          <div className="p-4 border-r border-[#111] bg-black">
            <p className="text-[9px] font-bold text-sky-300 uppercase mb-2 tracking-wide">Exit Liquidity</p>
            <p className="text-sm font-mono text-white leading-none">
              {Number(exitValuation ? formatEther(exitValuation as bigint) : '0').toFixed(4)}
              <span className="text-[9px] text-[#444] ml-1">ETH</span>
            </p>
          </div>
          <div className="p-4 bg-black">
            <p className="text-[9px] font-bold text-[#00ffbd] uppercase mb-2 tracking-wide">Remaining Liquidity</p>
            <p className="text-sm font-mono text-[#00ffbd] leading-none">
              {Number(exitPool ? formatEther(exitPool as bigint) : '0').toFixed(4)}
              <span className="text-[9px] text-[#00ffbd]/60 ml-1">ETH</span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-[#030303] mt-auto border-t border-[#111]">
        {!exitOpen ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-bold text-sky-300 uppercase tracking-widest">New Exit Valuation ({valuationUnit.toUpperCase()})</label>
                  <div className="flex border border-[#1a1a1a] bg-[#080808]">
                    <button
                      type="button"
                      onClick={() => {
                        setInputValuation(prev => convertDisplayUnit(prev, valuationUnit, 'usd'))
                        setValuationUnit('usd')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${valuationUnit === 'usd' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputValuation(prev => convertDisplayUnit(prev, valuationUnit, 'eth'))
                        setValuationUnit('eth')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${valuationUnit === 'eth' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                    >
                      ETH
                    </button>
                  </div>
                </div>
                <input 
                  type="number" step="0.0000001" min="0"
                  value={inputValuation} onChange={e => setInputValuation(e.target.value)} 
                  className="input-field h-10 px-4" placeholder={valuationUnit === 'eth' ? '0.0000000 ETH' : '0.00 USD'} 
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-bold text-sky-300 uppercase tracking-widest">Deposit Liquidity ({poolUnit.toUpperCase()})</label>
                  <div className="flex border border-[#1a1a1a] bg-[#080808]">
                    <button
                      type="button"
                      onClick={() => {
                        setInputPool(prev => convertDisplayUnit(prev, poolUnit, 'usd'))
                        setPoolUnit('usd')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${poolUnit === 'usd' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                    >
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputPool(prev => convertDisplayUnit(prev, poolUnit, 'eth'))
                        setPoolUnit('eth')
                      }}
                      className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${poolUnit === 'eth' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                    >
                      ETH
                    </button>
                  </div>
                </div>
                <input 
                  type="number" step="0.0000001" min="0"
                  value={inputPool} onChange={e => setInputPool(e.target.value)} 
                  className="input-field h-10 px-4" placeholder={poolUnit === 'eth' ? '0.0000000 ETH' : '0.00 USD'} 
                />
              </div>
            </div>
            <button 
              onClick={handleOpenExit} 
              disabled={
                isPending ||
                !inputValuation ||
                !inputPool ||
                convertToEth(inputValuation, valuationUnit) <= 0 ||
                convertToEth(inputPool, poolUnit) <= 0
              } 
              className="btn-pro btn-pro-cyan w-full h-10"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initialize Exit Window'}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[10px] font-bold font-mono text-sky-400 uppercase mb-6 tracking-wide">Stream active. Subsidizing investor exits from the pool.</p>
            <button 
              onClick={handleCloseExit} 
              disabled={isPending} 
              className="btn-pro btn-pro-outline w-full h-10 border-red-900/20 text-red-500 hover:bg-red-500/5 hover:border-red-500/50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Terminate Exit Window'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
