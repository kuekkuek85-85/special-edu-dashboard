export type Status = 'RED' | 'ORANGE' | 'YELLOW' | 'LIGHT_GREEN' | 'GREEN'

export interface Participant {
  id: string
  school: string
  name: string
  prdTextV1: string | null
  prdTextV2: string | null
  artifactUrlV1: string | null
  artifactUrlV2: string | null
  status: Status
  feedbackSent: boolean
  createdAt: number | null
  updatedAt: number | null
}

export interface Feedback {
  id: string
  participantId: string
  round: 1 | 3
  aiDraft: string
  instructorFinal: string | null
  reviewed: boolean
  linkTestLog: string | null
  createdAt: number | null
  sentAt: number | null
}

export const STATUS_CONFIG: Record<
  Status,
  {
    color: string
    borderColor: string
    bgColor: string
    textColor: string
    dotColor: string
    emoji: string
    label: string
    description: string
  }
> = {
  RED: {
    color: '#EF4444',
    borderColor: '#FCA5A5',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
    dotColor: '#EF4444',
    emoji: '🔴',
    label: '미제출',
    description: 'PRD·링크 둘 다 미제출',
  },
  ORANGE: {
    color: '#F97316',
    borderColor: '#FDB97B',
    bgColor: '#FFEDD5',
    textColor: '#9A3412',
    dotColor: '#F97316',
    emoji: '🟠',
    label: 'PRD만',
    description: 'PRD만 제출 (링크 없음)',
  },
  YELLOW: {
    color: '#EAB308',
    borderColor: '#FDE047',
    bgColor: '#FEF9C3',
    textColor: '#713F12',
    dotColor: '#EAB308',
    emoji: '🟡',
    label: '1차 완료',
    description: 'PRD+링크 1차 제출 완료',
  },
  LIGHT_GREEN: {
    color: '#22C55E',
    borderColor: '#86EFAC',
    bgColor: '#DCFCE7',
    textColor: '#14532D',
    dotColor: '#22C55E',
    emoji: '🟢',
    label: 'PRD 개선',
    description: '피드백 후 PRD 개선 재제출',
  },
  GREEN: {
    color: '#16A34A',
    borderColor: '#4ADE80',
    bgColor: '#BBF7D0',
    textColor: '#14532D',
    dotColor: '#16A34A',
    emoji: '🟢',
    label: '전체 완료',
    description: '피드백 후 PRD+링크 개선 완료',
  },
}
