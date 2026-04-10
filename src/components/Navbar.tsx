'use client'

import Link from 'next/link'
import { ConnectButton } from './ConnectButton'
import { Diamond, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const { currentUser, userRole, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }
  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 h-14 shadow-sm"
    >
      <div className="max-w-full mx-auto h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center h-full">
            <Link href="/" className="flex items-center gap-2 px-6 border-r border-slate-200 h-full hover:bg-slate-50 transition-colors group">
              <Diamond className="w-4 h-4 text-[#0284c7] group-hover:drop-shadow-[0_0_8px_rgba(2,132,199,0.5)] transition-all" />
              <span className="text-xs font-bold font-mono tracking-tighter text-slate-900 uppercase">
                AURA3
              </span>
            </Link>
            <div className="flex items-center h-full">
              {currentUser && userRole === 'investor' && (
                <Link href="/investor" className="flex items-center px-6 h-full border-r border-slate-200 text-[10px] font-bold font-mono text-slate-600 hover:text-[#0284c7] uppercase tracking-wider transition-colors">
                  Investor Dash
                </Link>
              )}
              {currentUser && userRole === 'startup' && (
                <Link href="/founder" className="flex items-center px-6 h-full border-r border-slate-200 text-[10px] font-bold font-mono text-slate-600 hover:text-[#0284c7] uppercase tracking-wider transition-colors">
                  Founder Portal
                </Link>
              )}
              <Link href="/portfolio" className="flex items-center px-6 h-full border-r border-slate-200 text-[10px] font-bold font-mono text-slate-600 hover:text-[#059669] uppercase tracking-wider transition-colors">
                Portfolio
              </Link>
              {currentUser && userRole === 'investor' && (
                <Link href="/finscope" className="flex items-center px-6 h-full border-r border-slate-200 text-[10px] font-bold font-mono text-slate-600 hover:text-[#7c3aed] uppercase tracking-wider transition-colors">
                  FinScope AI
                </Link>
              )}
              <Link href="/exit-window" className="flex items-center px-6 h-full border-r border-slate-200 text-[10px] font-bold font-mono text-slate-600 hover:text-[#059669] uppercase tracking-wider transition-colors">
                Exit Window
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="hidden lg:flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono text-slate-700 font-bold uppercase">Sepolia Live</span>
              </div>
            </div>
            
            {currentUser && (
              <div className="flex items-center gap-3 border-r border-slate-200 pr-4 mr-1">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#7c3aed] flex items-center justify-center shadow-[0_0_8px_rgba(2,132,199,0.2)]" title={currentUser.email || 'User'}>
                    <span className="text-[10px] font-bold text-white uppercase leading-none mt-0.5">
                      {currentUser.email ? currentUser.email.charAt(0) : 'U'}
                    </span>
                  </div>
                  <div className="h-4 border-r border-slate-300 mx-1 hidden sm:block"></div>
                  <button onClick={handleLogout} className="flex items-center justify-center text-red-500 hover:text-red-400 transition-colors group cursor-pointer" title="Sign Out">
                    <LogOut className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            )}
            
            <ConnectButton />
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
