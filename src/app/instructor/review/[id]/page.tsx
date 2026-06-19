'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getFeedback,
  getParticipant,
  updateFeedbackDraft,
  sendFeedback,
} from '@/lib/database'
import type { Participant, Feedback } from '@/types'
import StatusBadge from '@/components/StatusBadge'

export default function ReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [instructorText, setInstructorText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const f = await getFeedback(params.id)
    if (!f) {
      setError('피드백을 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    setFeedback(f)
    setInstructorText(f.instructorFinal ?? f.aiDraft)

    const p = await getParticipant(f.participantId)
    setParticipant(p)
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const handleSaveDraft = async () => {
    if (!feedback) return
    setSaving(true)
    try {
      await updateFeedbackDraft(feedback.id, instructorText)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!feedback || !participant) return
    if (!confirm(`${participant.name}님에게 최종 피드백을 발송하시겠습니까?\n발송 후에는 수강생에게 즉시 노출됩니다.`))
      return

    setSending(true)
    try {
      await sendFeedback(feedback.id, participant.id, instructorText)
      setSent(true)
    } catch {
      setError('발송에 실패했습니다.')
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">불러오는 중...</div>
      </main>
    )
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            피드백 발송 완료!
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {participant?.name}님께 강사 피드백이 전달되었습니다.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() =>
                router.push(`/instructor/participant/${participant?.id}`)
              }
              className="btn-primary"
            >
              수강생 상세 보기
            </button>
            <button
              onClick={() => router.push('/instructor')}
              className="btn-secondary"
            >
              대시보드로
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!feedback || !participant) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error || '피드백을 찾을 수 없습니다.'}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/instructor/participant/${participant.id}`)}
          className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
        >
          ← 참가자 상세
        </button>
        <span className="text-slate-300">|</span>
        <h1 className="text-xl font-bold text-slate-800">
          {feedback.round}차 피드백 검토
        </h1>
        <span className="text-sm text-slate-500">
          {participant.school} · {participant.name}
        </span>
        <StatusBadge status={participant.status} size="sm" />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-4 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* AI 초안 (읽기 전용) */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">
              🤖 AI 초안
            </h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-semibold">
              수강생에게 비공개
            </span>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap h-[480px] overflow-y-auto border border-amber-100">
            {feedback.aiDraft}
          </div>
          {feedback.linkTestLog && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">
                🔍 링크 테스트 결과
              </p>
              <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-500 whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-100">
                {feedback.linkTestLog}
              </div>
            </div>
          )}
        </div>

        {/* 강사 최종본 (편집) */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">
              ✏️ 강사 최종본
            </h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold">
              수강생에게 발송됨
            </span>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-100">
            <p className="text-xs text-blue-700">
              💡 AI 초안을 참고해 내용을 수정·보완해주세요.
              [최종 발송] 버튼을 눌러야 수강생에게 표시됩니다.
            </p>
          </div>

          <textarea
            className="textarea-field flex-1 min-h-[380px]"
            value={instructorText}
            onChange={(e) => setInstructorText(e.target.value)}
            placeholder="AI 초안을 검토하고 수정해주세요..."
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="btn-secondary flex-1"
            >
              {saving ? '저장 중...' : saved ? '✅ 저장됨' : '임시 저장'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !instructorText.trim()}
              className="btn-success flex-1"
            >
              {sending ? '발송 중...' : '📤 최종 발송'}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-2">
            ⚠️ 발송 후에는 수강생에게 즉시 노출됩니다
          </p>
        </div>
      </div>

      {/* PRD 원문 참고 */}
      <div className="card mt-5">
        <h2 className="section-title">
          📄 수강생 PRD 원문 ({feedback.round === 1 ? '1차' : '2차 개선'})
        </h2>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-56 overflow-y-auto border border-slate-100">
          {feedback.round === 1
            ? participant.prdTextV1 ?? '(없음)'
            : participant.prdTextV2 ?? '(없음)'}
        </div>
      </div>
    </main>
  )
}
