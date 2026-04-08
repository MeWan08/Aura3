'use client'

import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { STARTUPCONTRACT_ABI } from '@/constants/abis'
import { formatEther } from 'viem'
import { Loader2, TrendingUp, CheckCircle, LogOut, Copy, ExternalLink, ShieldCheck, Zap } from 'lucide-react'
import { useState } from 'react'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'

export function InvestorStartupActions({ address, initialValuation }: { address: `0x${string}`, initialValuation: bigint }) {
  const { address: userAddress } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  const [copied, setCopied] = useState<'contract' | 'token' | null>(null)

  const handleCopy = (text: string, type: 'contract' | 'token') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // Read state
  const { data: exitOpen } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'exitOpen',
  })
  const { data: exitValuation } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'exitValuation',
  })
  const { data: exitPool } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'exitPool',
  })
  const { data: exitAmount } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'getExitAmount',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!exitOpen }
  })
  const { data: hasExited } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'hasExited',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  })
  const { data: hasClaimed } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'hasClaimed',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  })
  
  // Get token info
  const { data: startupTokenAddress } = useReadContract({
    address, abi: STARTUPCONTRACT_ABI, functionName: 'getStartupToken',
  })
  
  // Optional: Read token balance
  const { data: tokenBalance } = useReadContract({
    address: startupTokenAddress as `0x${string}`,
    abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!startupTokenAddress }
  })

  const handleClaim = () => {
    writeContract({
      address,
      abi: STARTUPCONTRACT_ABI,
      functionName: 'claimTokens',
      chainId: 11155111,
    })
  }

  const handleExit = () => {
    writeContract({
      address,
      abi: STARTUPCONTRACT_ABI,
      functionName: 'exit',
      chainId: 11155111,
    })
  }

  return (
    <div className="bg-[#050505] flex flex-col h-full">
      <div className="h-[60px] p-6 border-b border-[#111] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#03e1ff]" />
          <h3 className="text-[10px] font-bold font-mono text-white uppercase tracking-widest">Investor Operations</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-bold font-mono text-sky-300 uppercase">Balance:</span>
           <span className="text-[10px] font-mono text-[#00ffbd]">{tokenBalance !== undefined ? Number(formatEther(tokenBalance as bigint)).toFixed(4) : '0.0000'} SET</span>
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
            <p className="text-[9px] font-bold text-sky-300 uppercase mb-2 tracking-wide">Exit Yield</p>
            <p className="text-sm font-mono text-white leading-none">
              {Number(exitAmount ? formatEther(exitAmount as bigint) : '0').toFixed(4)}
              <span className="text-[9px] text-[#444] ml-1">ETH</span>
            </p>
          </div>
          <div className="p-4 border-r border-[#111] bg-black">
            <p className="text-[9px] font-bold text-[#00ffbd] uppercase mb-2 tracking-wide">Remaining Liquidity</p>
            <p className="text-sm font-mono text-[#00ffbd] leading-none">
              {Number(exitPool ? formatEther(exitPool as bigint) : '0').toFixed(4)}
              <span className="text-[9px] text-[#00ffbd]/60 ml-1">ETH</span>
            </p>
          </div>
          <div className="p-4 bg-black">
            <p className="text-[9px] font-bold text-sky-300 uppercase mb-2 tracking-wide">Exit Status</p>
            <p className={`font-bold font-mono text-sm leading-none uppercase tracking-tighter ${exitOpen ? 'text-[#03e1ff]' : 'text-sky-400'}`}>
              {exitOpen ? 'Open' : 'Locked'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-[#030303] mt-auto border-t border-[#111]">
        <div className="space-y-6">
          {!hasClaimed ? (
            <div className="space-y-3">
              <p className="text-[9px] font-bold text-sky-300 uppercase tracking-widest">Equity Claim</p>
              <button 
                onClick={handleClaim} 
                disabled={isPending} 
                className="btn-pro btn-pro-cyan w-full h-10"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Initial Distribution'}
              </button>
            </div>
          ) : (
            <div className="p-4 border border-[#111] bg-[#00ffbd]/5">
              <p className="text-[9px] font-bold text-[#00ffbd] uppercase mb-1 flex items-center gap-2">
                <CheckCircle className="w-3 h-3" /> Position Secured
              </p>
              <p className="text-[9px] text-[#00ffbd]/60 font-mono tracking-tighter uppercase">Equity tokens present in wallet</p>
            </div>
          )}

          <div className="pt-6 border-t border-[#111] space-y-3">
            <p className="text-[9px] font-bold text-sky-300 uppercase tracking-widest">Liquidate Position</p>
            {hasExited ? (
              <div className="p-4 border border-[#111] bg-white/[0.02]">
                <p className="text-[9px] font-bold text-white uppercase mb-1 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-[#03e1ff]" /> Terminated
                </p>
                <p className="text-[9px] text-sky-300 font-mono tracking-tighter uppercase">Contract position successfully settled</p>
              </div>
            ) : (
              <button 
                onClick={handleExit} 
                disabled={isPending || !exitOpen || !exitAmount || (exitAmount as bigint) === BigInt(0)} 
                className={`btn-pro w-full h-10 ${exitOpen ? 'btn-pro-cyan shadow-[0_0_15px_rgba(3,225,255,0.05)]' : 'btn-pro-outline opacity-20'}`}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="flex items-center gap-2 justify-center">
                    <LogOut className="w-3.5 h-3.5" /> Final Settlement
                  </span>
                )}
              </button>
            )}
            
            {!exitOpen && (
              <p className="text-[9px] font-bold font-mono text-sky-400 uppercase text-center tracking-tight">
                [ Waiting for founder liquidity injection ]
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
