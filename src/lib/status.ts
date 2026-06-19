import type { Status } from '@/types'

interface StatusInput {
  prdTextV1: string | null
  prdTextV2: string | null
  artifactUrlV1: string | null
  artifactUrlV2: string | null
  feedbackSent: boolean
}

export function calculateStatus(data: StatusInput): Status {
  const { prdTextV1, prdTextV2, artifactUrlV1, artifactUrlV2, feedbackSent } = data

  // 피드백을 받은 이후 재제출 상태
  if (feedbackSent) {
    if (prdTextV2 && artifactUrlV2) return 'GREEN'
    if (prdTextV2) return 'LIGHT_GREEN'
  }

  // 1차 제출 상태
  if (prdTextV1 && artifactUrlV1) return 'YELLOW'
  if (prdTextV1) return 'ORANGE'
  return 'RED'
}
