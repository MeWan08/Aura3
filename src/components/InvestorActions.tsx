'use client'

import { useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { VENTUREDAO_ADDRESS, VENTUREDAO_ABI, GOVTOKEN_ADDRESS, GOVTOKEN_ABI } from '@/constants/abis'
import { parseEther, formatEther } from 'viem'
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'
import { useEthPrice } from '@/hooks/useEthPrice'

export function InvestorActions() {
  const { address } = useAccount()
  const ethPrice = useEthPrice()
  const [depositAmount, setDepositAmount] = useState('')
  const [depositUnit, setDepositUnit] = useState<'eth' | 'usd'>('eth')
  const [step, setStep] = useState<0 | 1 | 2>(0) // 0: input, 1: deposit mining, 2: delegate mining

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

  // Read Balances
  const { data: govBalance } = useReadContract({
    address: GOVTOKEN_ADDRESS,
    abi: GOVTOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 }
  })

  const { data: votingPower } = useReadContract({
    address: GOVTOKEN_ADDRESS,
    abi: [{ name: 'getVotes', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
    functionName: 'getVotes',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 }
  })

  // Write Hooks
  const { data: depositHash, writeContract: writeDeposit, isPending: isConfirmingDeposit } = useWriteContract()
  const { isLoading: isMiningDeposit, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash })

  const { data: delegateHash, writeContract: writeDelegate, isPending: isConfirmingDelegate } = useWriteContract()
  const { isLoading: isMiningDelegate, isSuccess: isDelegateSuccess } = useWaitForTransactionReceipt({ hash: delegateHash })

  const handleDeposit = () => {
    if (!depositAmount) return
    const depositEth = convertToEth(depositAmount, depositUnit)
    const depositEthString = formatEthString(depositEth)
    if (!depositEthString) return

    setStep(1)
    writeDeposit({
      address: VENTUREDAO_ADDRESS,
      abi: VENTUREDAO_ABI,
      functionName: 'deposit',
      value: parseEther(depositEthString),
      chainId: 11155111,
    })
  }

  if (isDepositSuccess && step === 1) {
    setStep(2)
    writeDelegate({
      address: GOVTOKEN_ADDRESS,
      abi: [{ name: 'delegate', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'delegatee', type: 'address' }], outputs: [] }],
      functionName: 'delegate',
      args: [address as `0x${string}`],
      chainId: 11155111,
    })
  }

  if (isDelegateSuccess && step === 2) {
    setStep(0)
    setDepositAmount('')
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="h-[60px] p-6 border-b border-[#111] bg-[#050505] flex items-center">
        <h2 className="text-[10px] font-bold font-mono text-white uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#03e1ff]" /> Governance Power
        </h2>
      </div>

      <div className="flex-1 p-6">
        <div className="mb-6">
          <div className="grid grid-cols-2 border border-[#111]">
            <div className="p-4 border-r border-[#111] bg-[#050505]">
              <p className="text-[9px] font-bold text-sky-300 uppercase mb-1">Treasury Credits</p>
              <p className="text-sm font-mono text-white leading-none">
                {govBalance !== undefined ? Number(formatEther(govBalance as bigint)).toFixed(4) : '0.0000'}
              </p>
            </div>
            <div className="p-4 bg-[#050505]">
              <p className="text-[9px] font-bold text-sky-300 uppercase mb-1">Active Votes</p>
              <p className="text-sm font-mono text-[#00ffbd] leading-none">
                {votingPower !== undefined ? Number(formatEther(votingPower as bigint)).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#111]">
          <h3 className="text-[9px] font-bold text-sky-300 uppercase mb-4 tracking-widest leading-tight">Increase Stake to Amplify Power</h3>
          {step > 0 ? (
            <div className="space-y-px bg-[#111] border border-[#111]">
              <div className={`p-4 flex items-center justify-between bg-black ${isDepositSuccess ? 'border-l-2 border-[#00ffbd]' : ''}`}>
                <div className="flex items-center gap-3">
                  {isDepositSuccess ? <CheckCircle2 className="w-3 h-3 text-[#00ffbd]" /> : <Loader2 className="w-3 h-3 animate-spin text-[#03e1ff]" />}
                  <span className="text-[10px] font-bold font-mono text-white uppercase tracking-tighter">I. Credit Transfer ({depositAmount} ETH)</span>
                </div>
                <span className="text-[9px] font-mono text-sky-300 uppercase">{isConfirmingDeposit ? 'Awaiting Sign' : isDepositSuccess ? 'Settled' : 'Mining'}</span>
              </div>
              
              <div className={`p-4 flex items-center justify-between bg-black ${isDelegateSuccess ? 'border-l-2 border-[#00ffbd]' : ''} ${step < 2 ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-3">
                  {isDelegateSuccess ? <CheckCircle2 className="w-3 h-3 text-[#00ffbd]" /> : step === 2 ? <Loader2 className="w-3 h-3 animate-spin text-[#03e1ff]" /> : <div className="w-1 h-1 rounded-full bg-[#333]" />}
                  <span className="text-[10px] font-bold font-mono text-white uppercase tracking-tighter">II. Power Delegation</span>
                </div>
                {step === 2 && <span className="text-[9px] font-mono text-sky-300 uppercase">{isConfirmingDelegate ? 'Awaiting Sign' : isDelegateSuccess ? 'Settled' : 'Mining'}</span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-sky-300 uppercase tracking-widest">Deposit Unit</span>
                <div className="flex border border-[#1a1a1a] bg-[#080808]">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositAmount(prev => convertDisplayUnit(prev, depositUnit, 'usd'))
                      setDepositUnit('usd')
                    }}
                    className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${depositUnit === 'usd' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDepositAmount(prev => convertDisplayUnit(prev, depositUnit, 'eth'))
                      setDepositUnit('eth')
                    }}
                    className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase ${depositUnit === 'eth' ? 'text-black bg-[#03e1ff]' : 'text-sky-300'}`}
                  >
                    ETH
                  </button>
                </div>
              </div>
              <input
                type="number" step="0.01"
                value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                className="input-field h-10"
                placeholder={depositUnit === 'eth' ? '0.0000000 ETH' : '0.00 USD'}
              />
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || convertToEth(depositAmount, depositUnit) <= 0}
                className="btn-pro btn-pro-cyan w-full h-10"
              >
                Initialize Deposit <ChevronRight className="w-3 h-3 ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrendingUp(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
  )
}
