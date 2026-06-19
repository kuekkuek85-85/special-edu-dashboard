'use client'

import { STATUS_CONFIG } from '@/types'
import type { Status } from '@/types'

interface Props {
  status: Status
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function StatusBadge({ status, size = 'md', showLabel = true }: Props) {
  const cfg = STATUS_CONFIG[status]

  const dotSize = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' }[size]
  const textSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size]
  const padding = { sm: 'px-2 py-0.5', md: 'px-3 py-1', lg: 'px-4 py-2' }[size]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${textSize}`}
      style={{
        backgroundColor: cfg.bgColor,
        color: cfg.textColor,
        border: `1.5px solid ${cfg.borderColor}`,
      }}
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0`}
        style={{ backgroundColor: cfg.dotColor }}
        aria-hidden="true"
      />
      {showLabel && (
        <span>
          {cfg.emoji} {cfg.label}
        </span>
      )}
    </span>
  )
}
