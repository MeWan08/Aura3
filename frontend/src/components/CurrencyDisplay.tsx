'use client'

import { useEthPrice } from '@/hooks/useEthPrice'

interface CurrencyDisplayProps {
  value: number;
  decimals?: number;
  featured?: boolean;
}

export function CurrencyDisplay({ value, decimals = 4, featured = false }: CurrencyDisplayProps) {
  const price = useEthPrice()
  
  // PRIMARY: USD (Bigger, whiter/brighter)
  const usdClass = featured
    ? "text-4xl font-light text-white font-mono tracking-tighter"
    : "text-base font-mono text-white leading-none"
    
  const usdLabelClass = featured
    ? "text-sm text-[#00ffbd] ml-2 font-bold tracking-widest uppercase"
    : "text-[11px] text-[#00ffbd] ml-1 font-bold tracking-widest uppercase"

  // SECONDARY: ETH (Smaller, secondary "Ice Blue" color)
  const ethClass = featured 
    ? "text-sm font-mono text-[#81d4fa] mt-2 tracking-widest"
    : "text-[11px] font-mono text-[#81d4fa] mt-1 block tracking-wide"

  return (
    <div className={`flex flex-col ${featured ? 'items-start' : 'items-end'}`}>
      {price ? (
        <p className={usdClass}>
          ${(value * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className={usdLabelClass}>USD</span>
        </p>
      ) : (
        <p className={usdClass}>
          $---
          <span className={usdLabelClass}>USD</span>
        </p>
      )}
      <p className={ethClass}>
        {value.toFixed(decimals)} ETH
      </p>
    </div>
  )
}
