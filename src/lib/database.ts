import {
  ref,
  get,
  set,
  push,
  update,
  onValue,
  type Unsubscribe,
} from 'firebase/database'
import { db } from './firebase'
import { calculateStatus } from './status'
import type { Participant, Feedback } from '@/types'

// RTDB 키: ASCII-safe (한글 등 비ASCII → xNNNN 16진수 변환)
// 이유: URL 경로 파라미터로 쓸 때 Next.js SSR이 한글 인코딩을 다르게 처리하는 문제 방지
const makeParticipantKey = (school: string, name: string): string =>
  `${school}__${name}`.replace(/[^a-zA-Z0-9_-]/g, (c) =>
    'x' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  )

// ── 수강생 식별/생성 ──────────────────────────────────────────────
export async function findOrCreateParticipant(
  school: string,
  name: string,
): Promise<Participant> {
  const key = makeParticipantKey(school, name)
  const pRef = ref(db, `participants/${key}`)
  const snap = await get(pRef)

  if (snap.exists()) {
    return { id: key, ...snap.val() } as Participant
  }

  const status = calculateStatus({
    prdTextV1: null,
    prdTextV2: null,
    artifactUrlV1: null,
    artifactUrlV2: null,
    feedbackSent: false,
  })

  const newData = {
    school,
    name,
    prdTextV1: null,
    prdTextV2: null,
    artifactUrlV1: null,
    artifactUrlV2: null,
    status,
    feedbackSent: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await set(pRef, newData)
  return { id: key, ...newData }
}

// ── PRD 제출 ─────────────────────────────────────────────────────
export async function submitPrd(
  participantId: string,
  prdText: string,
  version: 1 | 2,
): Promise<void> {
  const pRef = ref(db, `participants/${participantId}`)
  const snap = await get(pRef)
  if (!snap.exists()) throw new Error('참가자를 찾을 수 없습니다.')

  const data = snap.val()
  const field = version === 1 ? 'prdTextV1' : 'prdTextV2'
  const updated = { [field]: prdText, updatedAt: Date.now() }

  const newStatus = calculateStatus({
    prdTextV1: data.prdTextV1,
    prdTextV2: data.prdTextV2,
    artifactUrlV1: data.artifactUrlV1,
    artifactUrlV2: data.artifactUrlV2,
    feedbackSent: data.feedbackSent ?? false,
    ...updated,
  })

  await update(pRef, { ...updated, status: newStatus })
}

// ── 산출물 링크 제출 ──────────────────────────────────────────────
export async function submitArtifactUrl(
  participantId: string,
  url: string,
  version: 1 | 2,
): Promise<void> {
  const pRef = ref(db, `participants/${participantId}`)
  const snap = await get(pRef)
  if (!snap.exists()) throw new Error('참가자를 찾을 수 없습니다.')

  const data = snap.val()
  const field = version === 1 ? 'artifactUrlV1' : 'artifactUrlV2'
  const updated = { [field]: url, updatedAt: Date.now() }

  const newStatus = calculateStatus({
    prdTextV1: data.prdTextV1,
    prdTextV2: data.prdTextV2,
    artifactUrlV1: data.artifactUrlV1,
    artifactUrlV2: data.artifactUrlV2,
    feedbackSent: data.feedbackSent ?? false,
    ...updated,
  })

  await update(pRef, { ...updated, status: newStatus })
}

// ── 수강생 단건 조회 ──────────────────────────────────────────────
export async function getParticipant(id: string): Promise<Participant | null> {
  const snap = await get(ref(db, `participants/${id}`))
  if (!snap.exists()) return null
  return { id, ...snap.val() } as Participant
}

// ── 전체 수강생 실시간 구독 ───────────────────────────────────────
export function subscribeParticipants(
  callback: (participants: Participant[]) => void,
): Unsubscribe {
  return onValue(ref(db, 'participants'), (snap) => {
    if (!snap.exists()) {
      callback([])
      return
    }
    const val = snap.val() as Record<string, Omit<Participant, 'id'>>
    const list = Object.entries(val).map(([id, data]) => ({
      id,
      ...data,
    })) as Participant[]
    // createdAt 기준 오름차순
    list.sort((a, b) => (a.createdAt as number) - (b.createdAt as number))
    callback(list)
  })
}

// ── 수강생 단건 실시간 구독 ───────────────────────────────────────
export function subscribeParticipant(
  id: string,
  callback: (participant: Participant | null) => void,
): Unsubscribe {
  return onValue(ref(db, `participants/${id}`), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback({ id, ...snap.val() } as Participant)
  })
}

// ── 피드백 저장 (AI 초안) ─────────────────────────────────────────
export async function saveFeedbackDraft(
  participantId: string,
  aiDraft: string,
  round: 1 | 3,
): Promise<string> {
  const newRef = push(ref(db, 'feedbacks'))
  await set(newRef, {
    participantId,
    round,
    aiDraft,
    instructorFinal: null,
    reviewed: false,
    linkTestLog: null,
    createdAt: Date.now(),
    sentAt: null,
  })
  return newRef.key!
}

// ── 강사 최종 피드백 저장 & 발송 ─────────────────────────────────
export async function sendFeedback(
  feedbackId: string,
  participantId: string,
  instructorFinal: string,
): Promise<void> {
  await update(ref(db, `feedbacks/${feedbackId}`), {
    instructorFinal,
    reviewed: true,
    sentAt: Date.now(),
  })

  // 수강생 feedbackSent 갱신
  const pRef = ref(db, `participants/${participantId}`)
  const pSnap = await get(pRef)
  if (!pSnap.exists()) return

  const data = pSnap.val()
  const newStatus = calculateStatus({
    prdTextV1: data.prdTextV1,
    prdTextV2: data.prdTextV2,
    artifactUrlV1: data.artifactUrlV1,
    artifactUrlV2: data.artifactUrlV2,
    feedbackSent: true,
  })

  await update(pRef, {
    feedbackSent: true,
    status: newStatus,
    updatedAt: Date.now(),
  })
}

// ── 피드백 초안 업데이트 ──────────────────────────────────────────
export async function updateFeedbackDraft(
  feedbackId: string,
  instructorFinal: string,
): Promise<void> {
  await update(ref(db, `feedbacks/${feedbackId}`), { instructorFinal })
}

// ── 참가자의 피드백 목록 조회 ─────────────────────────────────────
export async function getFeedbacksByParticipant(
  participantId: string,
): Promise<Feedback[]> {
  const snap = await get(ref(db, 'feedbacks'))
  if (!snap.exists()) return []

  const val = snap.val() as Record<string, Omit<Feedback, 'id'>>
  return Object.entries(val)
    .map(([id, data]) => ({ id, ...data }) as Feedback)
    .filter((f) => f.participantId === participantId)
    .sort((a, b) => (a.createdAt as number) - (b.createdAt as number))
}

// ── 단건 피드백 조회 ──────────────────────────────────────────────
export async function getFeedback(id: string): Promise<Feedback | null> {
  const snap = await get(ref(db, `feedbacks/${id}`))
  if (!snap.exists()) return null
  return { id, ...snap.val() } as Feedback
}

// ── 검토 대기 피드백 목록 ─────────────────────────────────────────
export async function getPendingFeedbacks(): Promise<
  (Feedback & { participant?: Participant })[]
> {
  const snap = await get(ref(db, 'feedbacks'))
  if (!snap.exists()) return []

  const val = snap.val() as Record<string, Omit<Feedback, 'id'>>
  const pending = Object.entries(val)
    .map(([id, data]) => ({ id, ...data }) as Feedback)
    .filter((f) => !f.reviewed)
    .sort((a, b) => (a.createdAt as number) - (b.createdAt as number))

  return Promise.all(
    pending.map(async (f) => {
      const p = await getParticipant(f.participantId)
      return { ...f, participant: p ?? undefined }
    }),
  )
}

// ── 링크 테스트 로그 저장 ─────────────────────────────────────────
export async function saveLinkTestLog(
  feedbackId: string,
  log: string,
): Promise<void> {
  await update(ref(db, `feedbacks/${feedbackId}`), { linkTestLog: log })
}

// ── 성장 보고서 저장 ──────────────────────────────────────────────
export async function saveGrowthReport(
  participantId: string,
  analysis: string,
): Promise<void> {
  await set(ref(db, `growthReports/${participantId}`), {
    analysis,
    generatedAt: Date.now(),
  })
}

// ── 성장 보고서 조회 ──────────────────────────────────────────────
export async function getGrowthReport(
  participantId: string,
): Promise<{ analysis: string; generatedAt: number } | null> {
  const snap = await get(ref(db, `growthReports/${participantId}`))
  if (!snap.exists()) return null
  return snap.val()
}
