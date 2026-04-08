'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ExternalLink, TrendingUp, Clock } from 'lucide-react'

const API_BASE = 'https://aravsaxena884-dao.hf.space/'

// Crypto-themed Unsplash images for fallback
const CRYPTO_IMAGES = [
  "https://images.unsplash.com/photo-1518544887871-8bcb1c9f1b67?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80"
];

interface NewsArticle {
  article_title?: string
  article_url?: string
  article_photo_url?: string
  source?: string
  post_time_utc?: string
  snippet?: string
  related_symbol?: string
}

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
          }
        }
      } catch {
        // Silently fail
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
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
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

      {/* News Grid - Bigger cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {news.map((item, i) => {
          const fallbackImage = CRYPTO_IMAGES[i % CRYPTO_IMAGES.length]
          const imageUrl = item.article_photo_url || fallbackImage

          return (
            <motion.a
              key={i}
              href={item.article_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="group relative bg-white/[0.03] border border-white/[0.07] hover:border-[#03e1ff]/40 rounded-xl overflow-hidden transition-all duration-400 hover:shadow-[0_0_40px_rgba(3,225,255,0.08)] hover:bg-white/[0.05]"
            >
              {/* Photo - Always shown with fallback */}
              <div className="h-48 w-full overflow-hidden bg-black/60 relative">
                <img
                  src={imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget
                    const fallback = CRYPTO_IMAGES[(i + 1) % CRYPTO_IMAGES.length]

                    if (img.dataset.fallbackApplied !== 'true') {
                      img.dataset.fallbackApplied = 'true'
                      img.src = fallback
                      return
                    }

                    // Last-resort safe image host if Unsplash URL also fails.
                    if (img.dataset.backupApplied !== 'true') {
                      img.dataset.backupApplied = 'true'
                      img.src = `https://picsum.photos/seed/market-${i}/1200/700`
                      return
                    }

                    img.style.display = 'none'
                  }}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-75 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Symbol badge overlay */}
                {item.related_symbol && (
                  <div className="absolute top-4 left-4">
                    <span className="text-[11px] font-bold font-mono text-[#a855f7] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#a855f7]/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      ${item.related_symbol}
                    </span>
                  </div>
                )}

                {/* Source badge overlay */}
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-mono text-gray-300 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 uppercase tracking-wider">
                    {item.source || 'Market'}
                  </span>
                </div>
              </div>

              <div className="p-5 relative">
                {/* Title */}
                <h3 className="text-base font-bold text-gray-200 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-3">
                  {item.article_title || 'Breaking news...'}
                </h3>

                {/* Snippet */}
                {item.snippet && (
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">
                    {item.snippet}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <Clock className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-[11px] font-mono text-gray-600">
                    {item.post_time_utc ? new Date(item.post_time_utc).toLocaleString() : 'Just now'}
                  </span>
                  <div className="flex-1" />
                  <TrendingUp className="w-4 h-4 text-emerald-500/70 group-hover:text-emerald-400 transition-colors" />
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-[#03e1ff] transition-colors" />
                </div>
              </div>
            </motion.a>
          )
        })}
      </div>
    </motion.section>
  )
}
