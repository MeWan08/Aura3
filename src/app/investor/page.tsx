'use client'

import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { InvestorActions } from '@/components/InvestorActions'
import { ProposalList } from '@/components/ProposalList'
import { useProposals } from '@/hooks/useProposals'
import { Landmark } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function InvestorDashboard() {
  const { address, isConnected } = useAccount()
  const { proposals } = useProposals()
  const { currentUser, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/auth/investor')
        return
      }

      if (userRole === 'startup') {
        router.push('/startup')
      }
    }
  }, [loading, currentUser, userRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-[#03e1ff] border-t-transparent animate-spin"></div>
      </div>
    )
  }

  if (!currentUser || userRole !== 'investor') return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-12 border-b border-[#111] pb-8 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-white uppercase tracking-widest mb-2 font-mono">Operations: Investor Dashboard</h1>
          <p className="text-[10px] font-bold font-mono text-sky-300 uppercase tracking-[0.2em]">Acquire voting power, analyze data streams, and manage venture equity.</p>
        </div>
        <div className="hidden lg:block text-right">
          <p className="text-[9px] font-bold text-sky-300 uppercase mb-1">Session ID</p>
          <p className="text-[10px] font-mono text-white">{address?.slice(0, 16).toUpperCase()}...</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="border border-[#111] border-dashed p-20 text-center bg-white/[0.01]">
          <h2 className="text-[10px] font-bold font-mono text-sky-400 uppercase tracking-[0.3em] mb-4">Signal Lost: Wallet Disconnected</h2>
          <p className="text-[9px] font-bold font-mono text-sky-200 uppercase tracking-widest">Connect MetaMask to initialize data synchronization</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Active Data Streams */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-[#111] border border-[#111]">
            {/* Left Block: Treasury */}
            <div className="lg:col-span-4">
              <InvestorActions />
            </div>

            {/* Right Block: Proposals */}
            <div className="lg:col-span-8 bg-black">
              <div className="h-[60px] p-6 border-b border-[#111] bg-[#050505] flex justify-between items-center">
                <h2 className="text-[10px] font-bold font-mono text-white uppercase tracking-widest flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-[#03e1ff]" /> Governance Stream
                </h2>
                <span className="text-[9px] font-bold font-mono text-sky-300 uppercase">{proposals.length} Sessions Active</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <ProposalList />
              </div>
            </div>
          </div>

        </div>

      )}
    </div>
  )
}
