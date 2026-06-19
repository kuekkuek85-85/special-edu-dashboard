'use client'

import { useRouter } from 'next/navigation'
import type { Participant } from '@/types'
import { STATUS_CONFIG } from '@/types'

interface Props {
  participants: Participant[]
  filterStatus?: string | null
}

export default function RadialDashboard({ participants, filterStatus }: Props) {
  const router = useRouter()

  const filtered = filterStatus
    ? participants.filter((p) => p.status === filterStatus)
    : participants

  const cx = 400
  const cy = 340
  const orbitR = 260
  const nodeR = 38
  const centerR = 54

  const getNodePosition = (index: number, total: number) => {
    if (total === 0) return { x: cx, y: cy }
    const angle = (2 * Math.PI * index) / total - Math.PI / 2
    return {
      x: cx + orbitR * Math.cos(angle),
      y: cy + orbitR * Math.sin(angle),
    }
  }

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '…' : text

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 800 680"
        className="w-full max-w-3xl mx-auto select-none"
        style={{ minHeight: '420px' }}
      >
        {/* 배경 원 (궤도) */}
        <circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />

        {/* 중앙 → 노드 연결선 */}
        {filtered.map((p, i) => {
          const pos = getNodePosition(i, filtered.length)
          return (
            <line
              key={`line-${p.id}`}
              x1={cx}
              y1={cy}
              x2={pos.x}
              y2={pos.y}
              stroke="#CBD5E1"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          )
        })}

        {/* 수강생 노드 */}
        {filtered.map((p, i) => {
          const pos = getNodePosition(i, filtered.length)
          const cfg = STATUS_CONFIG[p.status]
          return (
            <g
              key={p.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onClick={() => router.push(`/instructor/participant/${p.id}`)}
              role="button"
              aria-label={`${p.school} ${p.name} - ${cfg.label}`}
            >
              {/* 외곽 링 (상태 색) */}
              <circle
                r={nodeR + 5}
                fill={cfg.bgColor}
                stroke={cfg.borderColor}
                strokeWidth="2.5"
              />
              {/* 내부 원 */}
              <circle r={nodeR} fill={cfg.color} fillOpacity="0.9" />
              {/* 이모지 */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="20"
                y="-7"
              >
                {cfg.emoji}
              </text>
              {/* 이름 */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fontWeight="700"
                fill="white"
                y="10"
              >
                {truncate(p.name, 4)}
              </text>
              {/* 학교 (아래) */}
              <text
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize="10"
                fill={cfg.textColor}
                y={nodeR + 9}
              >
                {truncate(p.school.replace(/중학교|초등학교|고등학교|학교/g, ''), 5)}
              </text>
            </g>
          )
        })}

        {/* 중앙 강사 노드 */}
        <g transform={`translate(${cx}, ${cy})`}>
          <circle r={centerR + 6} fill="#EEF2FF" stroke="#A5B4FC" strokeWidth="2.5" />
          <circle r={centerR} fill="#6366F1" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="22"
            y="-9"
          >
            👨‍🏫
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="12"
            fontWeight="700"
            fill="white"
            y="10"
          >
            이승엽
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="hanging"
            fontSize="10"
            fill="#6366F1"
            y={centerR + 9}
          >
            강사
          </text>
        </g>

        {/* 참가자 없을 때 안내 */}
        {filtered.length === 0 && (
          <text
            x={cx}
            y={cy + orbitR + 50}
            textAnchor="middle"
            fontSize="14"
            fill="#94A3B8"
          >
            해당 상태의 수강생이 없습니다
          </text>
        )}
      </svg>
    </div>
  )
}
