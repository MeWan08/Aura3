'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ExternalLink, TrendingUp, Clock } from 'lucide-react'

const API_BASE = 'https://aravsaxena884-dao.hf.space'

// Crypto-themed Unsplash images for fallback
const CRYPTO_IMAGES = [
  "https://images.unsplash.com/photo-1518544887871-8bcb1c9f1b67?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80"
];

const CARD_GRADIENTS = [
  'from-[#03e1ff]/35 via-[#0b1220] to-[#00ffbd]/20',
  'from-[#00ffbd]/28 via-[#0b1020] to-[#03e1ff]/28',
  'from-[#a855f7]/25 via-[#0a0f1d] to-[#03e1ff]/28',
  'from-[#03e1ff]/30 via-[#0c111e] to-[#14b8a6]/26',
  'from-[#0891b2]/30 via-[#0a1019] to-[#6366f1]/24',
  'from-[#06b6d4]/30 via-[#0b1120] to-[#22d3ee]/26',
]

interface NewsArticle {
  article_title?: string
  article_url?: string
  article_photo_url?: string
  source?: string
  post_time_utc?: string
  snippet?: string
  related_symbol?: string
}

const FALLBACK_NEWS: NewsArticle[] = [
  {
    article_title: 'Global equities pause as inflation outlook remains uncertain',
    article_url: 'https://finance.yahoo.com/',
    source: 'AURA3 Fallback Feed',
    snippet: 'Macro uncertainty is keeping risk appetite selective across sectors.',
    related_symbol: 'SPY',
  },
  {
    article_title: 'Crypto liquidity improves after renewed institutional interest',
    article_url: 'https://www.coindesk.com/',
    source: 'AURA3 Fallback Feed',
    snippet: 'BTC and ETH flows have picked up alongside derivatives activity.',
    related_symbol: 'BTC',
  },
  {
    article_title: 'Semiconductor leaders stay in focus ahead of earnings cycle',
    article_url: 'https://www.reuters.com/markets/',
    source: 'AURA3 Fallback Feed',
    snippet: 'Investors are watching AI-related capex trends and forward guidance.',
    related_symbol: 'NVDA',
  },
]

export function NewsCards() {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/finance-news/headlines`)
        if (res.ok) {
          const data = await res.json()
          if (data.headlines && data.headlines.length > 0) {
            setNews(data.headlines.slice(0, 6))
          } else {
            setNews(FALLBACK_NEWS)
          }
        } else {
          setNews(FALLBACK_NEWS)
        }
      } catch {
        setNews(FALLBACK_NEWS)
      } finally {
        setIsLoading(false)
      }
    }
    fetchNews()
  }, [])

  if (isLoading) {
    return (
      <div className="w-full py-12">
        <div className="flex items-center justify-center gap-3">
          <div className="w-3 h-3 bg-[#03e1ff] rounded-full animate-pulse" />
          <span className="text-sm font-mono text-gray-500 uppercase tracking-wider">
            Loading live market news...
          </span>
        </div>
      </div>
    )
  }

  if (news.length === 0) return null

  return (
    <section
      className="w-full mt-16 pb-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#03e1ff]/20 to-[#a855f7]/20 border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(3,225,255,0.1)]">
            <Newspaper className="w-6 h-6 text-[#03e1ff]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-3">
              Live Market Intel
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            </h2>
            <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest mt-1">
              Real-time financial headlines • RapidAPI
            </p>
          </div>
        </div>
      </div>

      {/* News Grid - Optimized for visibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((item, i) => {
          const fallbackImage = CRYPTO_IMAGES[i % CRYPTO_IMAGES.length]
          const imageUrl = item.article_photo_url || fallbackImage

          return (
            <motion.a
              key={i}
              href={item.article_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="group relative bg-gradient-to-br from-[#0a1520] to-[#050c1a] border border-[#03e1ff]/20 hover:border-[#03e1ff]/60 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(3,225,255,0.15)] h-full flex flex-col"
            >
              {/* Photo Container */}
              <div className="h-40 w-full overflow-hidden bg-black/80 relative flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={item.article_title || 'News article'}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.currentTarget
                    const fallback = CRYPTO_IMAGES[(i + 1) % CRYPTO_IMAGES.length]

                    if (img.dataset.fallbackApplied !== 'true') {
                      img.dataset.fallbackApplied = 'true'
                      img.src = fallback
                      return
                    }

                    if (img.dataset.backupApplied !== 'true') {
                      img.dataset.backupApplied = 'true'
                      img.src = `https://picsum.photos/seed/market-${i}/800/600`
                      return
                    }

                    img.style.display = 'none'
                  }}
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
                
                {/* Symbol badge */}
                {item.related_symbol && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[10px] font-bold font-mono text-[#a855f7] bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#a855f7]/40 shadow-lg">
                      ${item.related_symbol}
                    </span>
                  </div>
                )}

                {/* Source badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="text-[9px] font-mono text-[#03e1ff] bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#03e1ff]/30 uppercase tracking-wide">
                    {item.source || 'News'}
                  </span>
                </div>
              </div>

              {/* Content Container */}
              <div className="p-4 relative flex-1 flex flex-col">
                {/* Title */}
                <h3 className="text-sm font-bold text-gray-100 group-hover:text-[#03e1ff] transition-colors leading-tight line-clamp-2 mb-2">
                  {item.article_title || 'Breaking news...'}
                </h3>

                {/* Snippet */}
                {item.snippet && (
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3 flex-1">
                    {item.snippet}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08] text-[10px] text-gray-500">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="font-mono truncate">
                    {item.post_time_utc ? new Date(item.post_time_utc).toLocaleDateString() : 'Today'}
                  </span>
                  <div className="flex-1" />
                  <TrendingUp className="w-3 h-3 text-emerald-500/60 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                  <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#03e1ff] transition-colors flex-shrink-0" />
                </div>
              </div>
            </motion.a>
          )
        })}
      </div>
    </section>
  )
}
