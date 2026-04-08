'use client'

import { useParams } from 'next/navigation'
import { useReadContract, useWriteContract, useAccount } from 'wagmi'
import { VENTUREDAO_ADDRESS, VENTUREDAO_ABI, STARTUPCONTRACT_ABI } from '@/constants/abis'
import { formatEther, parseEther } from 'viem'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, ThumbsUp, ThumbsDown, Bot, Play, LogOut, ArrowLeft, Info, Download, MessageSquare, Send, X } from 'lucide-react'
import Link from 'next/link'
import { FounderStartupActions } from '@/components/FounderStartupActions'
import { InvestorStartupActions } from '@/components/InvestorStartupActions'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'

export default function ProposalDetail() {
  const params = useParams()
  const proposalId = typeof params.id === 'string' ? params.id : params.id?.[0]
  const { address } = useAccount()

  const [aiReport, setAiReport] = useState<any>(null)
  const [isReportLoading, setIsReportLoading] = useState(true)

  // Fetch Proposal Details
  const { data: rawProposal, refetch: refetchProposal } = useReadContract({
    address: VENTUREDAO_ADDRESS,
    abi: VENTUREDAO_ABI,
    functionName: 'proposals',
    args: proposalId ? [BigInt(proposalId)] : undefined,
    query: { enabled: !!proposalId }
  })

  // Has Voted
  const { data: hasVoted } = useReadContract({
    address: VENTUREDAO_ADDRESS,
    abi: VENTUREDAO_ABI,
    functionName: 'hasVoted',
    args: proposalId && address ? [BigInt(proposalId), address] : undefined,
    query: { enabled: !!proposalId && !!address }
  })

  const { writeContract: writeVote, isPending: isVoting } = useWriteContract()
  const { writeContract: writeExecute, isPending: isExecuting } = useWriteContract()

  const BACKEND_URL = 'http://localhost:3001'
  const [isDownloading, setIsDownloading] = useState(false)
  const [backendStartupId, setBackendStartupId] = useState<string | null>(null)

  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !backendStartupId) return
    
    const userMsg = chatInput.trim()
    setMessages(prev => [...prev, {role: 'user', content: userMsg}])
    setChatInput('')
    setIsChatLoading(true)
    
    try {
      const res = await fetch(`${BACKEND_URL}/chat/${backendStartupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      })
      if (!res.ok) throw new Error('Chat API failed')
      const data = await res.json()
      setMessages(prev => [...prev, {role: 'ai', content: data.answer}])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {role: 'ai', content: 'Connection error while communicating with AI agent.'}])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!backendStartupId) return
    try {
      setIsDownloading(true)
      const res = await fetch(`${BACKEND_URL}/reports/${backendStartupId}`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to generate or fetch PDF')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `AURA3_Report_Prop${proposalId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err) {
      console.error(err)
      alert("Failed to download report.")
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    if (rawProposal) {
      const p = rawProposal as unknown as [string, bigint, bigint, string, bigint, bigint, bigint, bigint, bigint, boolean, string, string]
      const founder = p[0]
      const description = p[3]

      fetch(`${BACKEND_URL}/startups`)
        .then(res => res.json())
        .then((startups: any[]) => {
          const matched = startups.find(s => 
            s.description === description && 
            s.team.toLowerCase() === founder.toLowerCase()
          )
          
          if (matched) {
            setBackendStartupId(matched.startup_id)
            return fetch(`${BACKEND_URL}/api/startups/${matched.startup_id}/report/status`)
          } else {
            throw new Error('Startup record not found on backend')
          }
        })
        .then(res => res ? res.json() : null)
        .then(data => {
          if (data && (data.status === 'complete' || data.status === 'completed')) {
            setAiReport(data.analysis || data)
          }
        })
        .catch(err => console.error('Failed to fetch AI report:', err))
        .finally(() => setIsReportLoading(false))
    }
  }, [rawProposal])

  if (!rawProposal) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  const p = rawProposal as unknown as [string, bigint, bigint, string, bigint, bigint, bigint, bigint, bigint, boolean, string, string]
  const proposal = {
    founder: p[0],
    fundingAmount: p[1],
    valuation: p[2],
    description: p[3],
    snapshotBlock: p[4],
    voteStart: p[5],
    voteEnd: p[6],
    forVotes: p[7],
    againstVotes: p[8],
    executed: p[9],
    startupContract: p[10],
    startupToken: p[11],
  }

  const now = Math.floor(Date.now() / 1000)
  // Fix voteEnd index reading based on ABI (voteEnd is typicaly block or timestamp, let's assume timestamp = voteEnd)
  const isEnded = Number(proposal.voteEnd) <= now
  const isPassed = proposal.forVotes > proposal.againstVotes

  const handleVote = (support: boolean) => {
    writeVote({
      address: VENTUREDAO_ADDRESS,
      abi: VENTUREDAO_ABI,
      functionName: 'vote',
      args: [BigInt(proposalId!), support],
      chainId: 11155111,
    })
  }

  const handleExecute = () => {
    writeExecute({
      address: VENTUREDAO_ADDRESS,
      abi: VENTUREDAO_ABI,
      functionName: 'executeProposal',
      args: [BigInt(proposalId!)],
      chainId: 11155111,
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/investor" className="inline-flex items-center text-[10px] font-bold font-mono text-[#444] hover:text-[#03e1ff] mb-8 uppercase tracking-widest transition-colors group">
        <ArrowLeft className="w-3 h-3 mr-2 group-hover:-translate-x-1 transition-transform" /> 
        Return to Stream
      </Link>
      
      <div className="border border-[#111] bg-black mb-10">
        <div className="p-8 border-b border-[#111] flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold font-mono text-[#03e1ff] uppercase tracking-tighter bg-[#03e1ff]/5 px-2 py-0.5 border border-[#03e1ff]/20">
                PROPOSAL-{proposalId}
              </span>
              <span className="text-[#333] text-[10px] font-bold font-mono uppercase tracking-tighter">
                Ref: {proposal.snapshotBlock.toString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4 tracking-tight">{proposal.description}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono text-[#444] uppercase">Originator:</span>
              <code className="text-[10px] font-mono text-[#03e1ff]">{proposal.founder}</code>
            </div>
          </div>
          
          <div className="text-right">
            <div className="inline-block p-4 border border-[#111] bg-[#050505] min-w-[140px]">
              <p className="text-[9px] font-bold text-[#444] uppercase mb-1">State</p>
              <p className={`text-xs font-bold font-mono uppercase tracking-widest ${proposal.executed ? 'text-[#00ffbd]' : isEnded ? (isPassed ? 'text-[#03e1ff]' : 'text-red-500') : 'text-yellow-500'}`}>
                {proposal.executed ? 'Executed' : isEnded ? (isPassed ? 'Passed' : 'Rejected') : 'Active'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#111]">
          <div className="p-6 border-r border-[#111]">
            <p className="text-[9px] font-bold text-[#444] uppercase mb-4">Funding Requirement</p>
            <CurrencyDisplay value={Number(formatEther(proposal.fundingAmount))} featured={true} />
          </div>
          <div className="p-6 border-r border-[#111]">
            <p className="text-[9px] font-bold text-[#444] uppercase mb-4">Contract Valuation</p>
            <CurrencyDisplay value={Number(formatEther(proposal.valuation))} featured={true} />
          </div>
          <div className="p-6 border-r border-[#111]">
            <p className="text-[9px] font-bold text-[#444] uppercase mb-2">Consensus "For"</p>
            <p className="text-xl font-mono text-[#00ffbd] leading-none">
              {Number(formatEther(proposal.forVotes)).toFixed(2)}
            </p>
          </div>
          <div className="p-6">
            <p className="text-[9px] font-bold text-[#444] uppercase mb-2">Consensus "Against"</p>
            <p className="text-xl font-mono text-red-500 leading-none">
              {Number(formatEther(proposal.againstVotes)).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 bg-[#030303]">
          {!isEnded ? (
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => handleVote(true)}
                disabled={hasVoted || isVoting}
                className="flex-1 md:flex-none btn-pro btn-pro-cyan h-12 px-10"
              >
                {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                Vote Affirmative
              </button>
              <button 
                onClick={() => handleVote(false)}
                disabled={hasVoted || isVoting}
                className="flex-1 md:flex-none btn-pro btn-pro-outline h-12 px-10 border-red-900/30 text-red-500 hover:bg-red-500/5 hover:border-red-500/50"
              >
                {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                Vote Negative
              </button>
            </div>
          ) : isPassed && !proposal.executed ? (
            <button 
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full md:w-auto btn-pro btn-pro-cyan h-12 px-12"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Execute Transaction
            </button>
          ) : (
            <div className="text-[10px] font-bold font-mono text-[#333] uppercase spacing-widest">
              Governance window closed for this session.
            </div>
          )}
          
          {!isEnded && hasVoted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#00ffbd]/5 border border-[#00ffbd]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ffbd]" />
              <p className="text-[10px] font-bold font-mono text-[#00ffbd] uppercase">Vote Registered</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="mt-10 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">AI Venture Analysis</h2>
            <p className="text-[10px] font-bold font-mono text-[#00ffbd] uppercase tracking-widest">Generative Intelligence Report</p>
          </div>
          {aiReport && (
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="btn-pro btn-pro-cyan h-10 px-6 shrink-0 flex items-center justify-center gap-2"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isDownloading ? 'Generating PDF...' : 'Download Full PDF Report'}
            </button>
          )}
        </div>

        <div className="bg-[#111] p-1 border border-[#111]">
          {isReportLoading ? (
            <div className="p-12 text-center bg-black">
              <Loader2 className="w-6 h-6 text-[#03e1ff] animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-bold font-mono text-sky-400 uppercase tracking-widest">Synthesizing Market Data...</p>
            </div>
          ) : !aiReport ? (
            <div className="p-12 text-center bg-black border border-dashed border-[#333]">
              <Bot className="w-8 h-8 text-[#444] mx-auto mb-4" />
              <p className="text-[10px] font-bold font-mono text-[#444] uppercase tracking-widest">Analysis not yet available</p>
            </div>
          ) : (
            <div className="bg-[#050505] p-8 space-y-8">
              <div>
                <div className="flex items-center gap-4 mb-3 border-b border-[#111] pb-2">
                  <p className="text-[10px] font-bold font-mono text-[#03e1ff] uppercase tracking-widest">Executive Summary</p>
                  {aiReport.score && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[8px] font-bold text-[#444] uppercase tracking-widest">AI Score</span>
                      <span className="text-sm font-mono font-bold text-[#00ffbd]">{aiReport.score}/10</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-300 leading-relaxed markdown-content"><ReactMarkdown>{aiReport.executiveSummary}</ReactMarkdown></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold font-mono text-[#03e1ff] uppercase tracking-widest mb-3 border-b border-[#111] pb-2">Market Analysis</p>
                  <div className="text-sm text-gray-300 leading-relaxed markdown-content"><ReactMarkdown>{aiReport.marketAnalysis}</ReactMarkdown></div>
                </div>
                <div>
                  <p className="text-[10px] font-bold font-mono text-[#03e1ff] uppercase tracking-widest mb-3 border-b border-[#111] pb-2">Team Assessment</p>
                  <div className="text-sm text-gray-300 leading-relaxed markdown-content"><ReactMarkdown>{aiReport.teamAssessment}</ReactMarkdown></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#111] pt-6">
                <div>
                  <p className="text-[10px] font-bold font-mono text-amber-500 uppercase tracking-widest mb-3 pb-2">Risk Factors</p>
                  <div className="text-sm text-amber-500/70 leading-relaxed markdown-content"><ReactMarkdown>{aiReport.riskFactors}</ReactMarkdown></div>
                </div>
                <div className="bg-[#00ffbd]/5 p-6 border border-[#00ffbd]/20 rounded-sm">
                  <p className="text-[10px] font-bold font-mono text-[#00ffbd] uppercase tracking-widest mb-3 pb-2 border-b border-[#00ffbd]/20">Recommendation</p>
                  <div className="text-sm text-[#00ffbd] leading-relaxed font-bold markdown-content"><ReactMarkdown>{aiReport.recommendation}</ReactMarkdown></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Chatbot Section - Floating Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-[350px] sm:w-[400px] border border-[#222] bg-[#050505] shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden rounded-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="p-4 border-b border-[#111] bg-black flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-[#03e1ff]" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-none">Venture Analyst</h3>
                  <p className="text-[8px] font-bold font-mono text-[#00ffbd] uppercase tracking-widest mt-1">Live AI Data Stream</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-[#444] hover:text-[#03e1ff] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 h-[350px] overflow-y-auto flex flex-col gap-4 custom-scrollbar bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111]/30 via-black to-black">
              {!backendStartupId ? (
                <div className="m-auto text-center opacity-50">
                   <Bot className="w-8 h-8 text-[#03e1ff] mx-auto mb-3 opacity-50" />
                   <p className="text-[10px] font-bold font-mono text-white uppercase tracking-widest">Analyst Offline</p>
                   <p className="text-[9px] font-mono text-gray-500 uppercase mt-2">Backend connection not established.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="m-auto text-center opacity-50">
                  <Bot className="w-8 h-8 text-[#03e1ff] mx-auto mb-3 opacity-50" />
                  <p className="text-[10px] font-bold font-mono text-white uppercase tracking-widest">Secure Line Opened</p>
                  <p className="text-[9px] font-mono text-gray-500 uppercase mt-2 max-w-[200px] mx-auto">Ask questions about market size, competitors, or specific risks discovered in the pitch deck.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-7 h-7 rounded-sm bg-[#080808] border border-[#222] flex flex-shrink-0 items-center justify-center mt-1">
                        <Bot className="w-4 h-4 text-[#00ffbd]" />
                      </div>
                    )}
                    <div className={`max-w-[82%] px-4 py-3 border ${
                      msg.role === 'user' 
                        ? 'bg-[#03e1ff]/10 border-[#03e1ff]/30 text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-[0_0_10px_rgba(3,225,255,0.05)]' 
                        : 'bg-[#080808] border-[#222] text-gray-300 rounded-tr-xl rounded-br-xl rounded-bl-xl'
                    }`}>
                      {msg.role === 'ai' ? (
                         <div className="text-[13px] leading-relaxed markdown-content overflow-hidden break-words">
                           <ReactMarkdown>{msg.content}</ReactMarkdown>
                         </div>
                      ) : (
                         <p className="text-[13px] font-medium break-words">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#080808] border border-[#222] text-gray-300 p-3.5 rounded-tr-md rounded-br-md rounded-bl-md flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-[#00ffbd] animate-spin" />
                    <span className="text-[10px] font-mono uppercase text-[#00ffbd]/70 tracking-widest">Analysing...</span>
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#111] bg-black flex gap-2">
              <input 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)}
                placeholder="Query the startup's data..."
                className="flex-1 bg-[#111] border border-[#222] text-sm text-white px-4 py-2.5 rounded-sm focus:outline-none focus:border-[#03e1ff]/50 transition-colors font-mono placeholder:text-gray-600"
                disabled={isChatLoading || !backendStartupId}
              />
              <button 
                type="submit" 
                disabled={isChatLoading || !chatInput.trim() || !backendStartupId}
                className="btn-pro btn-pro-cyan px-5 flex items-center justify-center disabled:opacity-50 disabled:hover:transform-none rounded-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Action Button */}
        {aiReport && backendStartupId && (
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(3,225,255,0.2)] ${
              isChatOpen 
                ? 'bg-[#111] border border-[#333] text-gray-400 rotate-90 scale-90' 
                : 'bg-[#03e1ff] text-black hover:scale-105 hover:shadow-[0_0_30px_rgba(3,225,255,0.4)]'
            }`}
          >
            {isChatOpen ? <X className="w-6 h-6 -rotate-90" /> : <MessageSquare className="w-6 h-6" />}
          </button>
        )}
      </div>

      {/* Startup Management Section */}
      {proposal.executed && proposal.startupContract !== '0x0000000000000000000000000000000000000000' && (
        <div className="mt-20 pt-20 border-t border-[#111]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Technical Operations</h2>
              <p className="text-[10px] font-bold font-mono text-[#444] uppercase tracking-widest">Execute equity claims and manage venture exit windows.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#111] border border-[#111]">
            <FounderStartupActions 
              address={proposal.startupContract as `0x${string}`} 
              valuation={proposal.valuation}
            />
            <InvestorStartupActions 
              address={proposal.startupContract as `0x${string}`} 
              initialValuation={proposal.valuation}
            />
          </div>
        </div>
      )}

      {/* Pre-Execution Placeholder */}
      {!proposal.executed && (
        <div className="mt-10 border border-[#111] border-dashed p-12 text-center bg-white/[0.01]">
           <p className="text-[10px] font-bold font-mono text-[#333] uppercase tracking-[0.2em] max-w-sm mx-auto">
             Data Stream Locked: Awaiting execution confirm to initialize operations.
           </p>
        </div>
      )}
    </div>
  )
}
