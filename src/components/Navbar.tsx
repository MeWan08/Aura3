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
      className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50 h-14 shadow-lg"
    >
      <div className="max-w-full mx-auto h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center h-full">
            <Link href="/" className="flex items-center gap-2 px-6 border-r border-[#111] h-full hover:bg-white/[0.02] transition-colors group">
              <Diamond className="w-4 h-4 text-[#03e1ff] group-hover:drop-shadow-[0_0_8px_rgba(3,225,255,0.5)] transition-all" />
              <span className="text-xs font-bold font-mono tracking-tighter text-white uppercase">
                AURA3
              </span>
            </Link>
            <div className="hidden md:flex items-center h-full">
              {currentUser && userRole === 'investor' && (
                <Link href="/investor" className="flex items-center px-6 h-full border-r border-[#111] text-[10px] font-bold font-mono text-sky-200 hover:text-[#03e1ff] uppercase tracking-wider transition-colors">
                  Investor Dash
                </Link>
              )}
              {currentUser && userRole === 'startup' && (
                <Link href="/startup" className="flex items-center px-6 h-full border-r border-[#111] text-[10px] font-bold font-mono text-sky-200 hover:text-[#03e1ff] uppercase tracking-wider transition-colors">
                  Startup Portal
                </Link>
              )}
              <Link href="/portfolio" className="flex items-center px-6 h-full border-r border-[#111] text-[10px] font-bold font-mono text-sky-200 hover:text-[#00ffbd] uppercase tracking-wider transition-colors">
                Portfolio
              </Link>
              {currentUser && userRole === 'investor' && (
                <Link href="/finscope" className="flex items-center px-6 h-full border-r border-[#111] text-[10px] font-bold font-mono text-sky-200 hover:text-[#a855f7] uppercase tracking-wider transition-colors">
                  FinScope AI
                </Link>
              )}
              <Link href="/exit-window" className="flex items-center px-6 h-full border-r border-[#111] text-[10px] font-bold font-mono text-sky-200 hover:text-[#00ffbd] uppercase tracking-wider transition-colors">
                Exit Window
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 px-6">
            <div className="hidden lg:flex items-center gap-3 mr-4">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#080808] border border-[#111]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ffbd] animate-pulse" />
                <span className="text-[9px] font-mono text-sky-300 font-bold uppercase">Sepolia Live</span>
              </div>
            </div>
            
            {currentUser && (
              <div className="flex items-center gap-3 border-r border-[#111] pr-4 mr-1">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#111] rounded border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#03e1ff] to-[#a855f7] flex items-center justify-center shadow-[0_0_8px_rgba(3,225,255,0.2)]" title={currentUser.email || 'User'}>
                    <span className="text-[10px] font-bold text-white uppercase leading-none mt-0.5">
                      {currentUser.email ? currentUser.email.charAt(0) : 'U'}
                    </span>
                  </div>
                  <div className="h-4 border-r border-[#333] mx-1 hidden sm:block"></div>
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
