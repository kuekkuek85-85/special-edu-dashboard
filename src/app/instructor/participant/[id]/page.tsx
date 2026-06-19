'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getParticipant,
  getFeedbacksByParticipant,
  saveFeedbackDraft,
  saveLinkTestLog,
} from '@/lib/database'
import type { Participant, Feedback } from '@/types'
import { STATUS_CONFIG } from '@/types'
import StatusBadge from '@/components/StatusBadge'

export default function ParticipantDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<'prd' | 'link' | null>(null)
  const [verifyingLink, setVerifyingLink] = useState(false)
  const [linkLog, setLinkLog] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const p = await getParticipant(params.id)
    if (!p) {
      setError('참가자를 찾을 수 없습니다.')
      setLoading(false)
      return
    }
    setParticipant(p)
    const fbs = await getFeedbacksByParticipant(params.id)
    setFeedbacks(fbs)
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleGeneratePrdFeedback = async (round: 1 | 3) => {
    if (!participant) return
    const prdText = round === 1 ? participant.prdTextV1 : participant.prdTextV2
    if (!prdText) return

    setGenerating('prd')
    setError('')
    try {
      const res = await fetch('/api/feedback/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          prdText,
          round,
          participantName: participant.name,
          school: participant.school,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `피드백 생성 실패 (${res.status})`)
      }
      const data = await res.json()

      await saveFeedbackDraft(participant.id, data.feedback, round)
      showMessage('✅ AI 피드백 초안이 생성되었습니다! 검토 화면으로 이동하세요.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setGenerating(null)
    }
  }

  const handleVerifyLink = async (url: string) => {
    if (!participant) return
    setVerifyingLink(true)
    setLinkLog('')
    setError('')
    try {
      const res = await fetch('/api/link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, participantId: participant.id }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `링크 검증 실패 (${res.status})`)
      }
      const data = await res.json()
      if (data.log) setLinkLog(data.log)

      if (data.aiAnalysis) {
        const draft = `🔗 산출물 링크 분석 피드백\n\n${data.aiAnalysis}`
        const newFeedbackId = await saveFeedbackDraft(participant.id, draft, 1)
        if (data.log) await saveLinkTestLog(newFeedbackId, data.log)
        await load()
        showMessage('✅ 링크 분석 완료! 아래 피드백 히스토리에서 검토 후 발송하세요.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setVerifyingLink(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">불러오는 중...</div>
      </main>
    )
  }

  if (!participant) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </main>
    )
  }

  const statusCfg = STATUS_CONFIG[participant.status]
  const sentFeedback = feedbacks.find((f) => f.reviewed && f.instructorFinal)
  const pendingFeedback = feedbacks.find((f) => !f.reviewed)

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/instructor')}
          className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
        >
          ← 대시보드
        </button>
        <span className="text-slate-300">|</span>
        <h1 className="text-xl font-bold text-slate-800">
          {participant.school} · {participant.name}
        </h1>
        <StatusBadge status={participant.status} />
      </div>

      {/* 알림 */}
      {message && (
        <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 mb-4 border border-green-200 font-semibold text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-4 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* 진행 상태 */}
        <div
          className="rounded-2xl p-5 border-2"
          style={{ backgroundColor: statusCfg.bgColor, borderColor: statusCfg.borderColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: statusCfg.textColor }}>
                현재 상태
              </p>
              <StatusBadge status={participant.status} size="lg" />
              <p className="text-xs mt-1.5" style={{ color: statusCfg.textColor }}>
                {statusCfg.description}
              </p>
            </div>
            <span className="text-5xl">{statusCfg.emoji}</span>
          </div>
        </div>

        {/* PRD 1차 */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">
              📝 PRD (1차)
              {participant.prdTextV1 ? (
                <span className="text-green-600 text-sm font-normal">✅ 제출됨</span>
              ) : (
                <span className="text-red-400 text-sm font-normal">미제출</span>
              )}
            </h2>
            {participant.prdTextV1 &&
              !participant.feedbackSent &&
              !pendingFeedback && (
                <button
                  onClick={() => handleGeneratePrdFeedback(1)}
                  disabled={generating === 'prd'}
                  className="text-sm bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-200 transition-colors font-semibold"
                >
                  {generating === 'prd' ? '🤖 생성 중...' : '🤖 AI 피드백 생성'}
                </button>
              )}
          </div>
          {participant.prdTextV1 ? (
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto border border-slate-100">
              {participant.prdTextV1}
            </div>
          ) : (
            <p className="text-sm text-slate-400">아직 제출하지 않았습니다.</p>
          )}
        </section>

        {/* 산출물 링크 1차 */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">
              🔗 산출물 링크 (1차)
              {participant.artifactUrlV1 ? (
                <span className="text-green-600 text-sm font-normal">✅ 제출됨</span>
              ) : (
                <span className="text-red-400 text-sm font-normal">미제출</span>
              )}
            </h2>
            {participant.artifactUrlV1 && (
              <button
                onClick={() => handleVerifyLink(participant.artifactUrlV1!)}
                disabled={verifyingLink}
                className="text-sm bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors font-semibold"
              >
                {verifyingLink ? '🔍 분석 중...' : '🔍 링크 분석'}
              </button>
            )}
          </div>
          {participant.artifactUrlV1 ? (
            <a
              href={participant.artifactUrlV1}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline text-sm break-all"
            >
              {participant.artifactUrlV1}
            </a>
          ) : (
            <p className="text-sm text-slate-400">아직 제출하지 않았습니다.</p>
          )}
          {linkLog && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">🔍 링크 분석 결과</p>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                {linkLog}
              </pre>
            </div>
          )}
        </section>

        {/* PRD 2차 (피드백 발송 후) */}
        {participant.feedbackSent && (
          <>
            <section className="card border-2 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title mb-0 text-green-700">
                  📝 PRD (2차 개선)
                  {participant.prdTextV2 ? (
                    <span className="text-green-600 text-sm font-normal">✅ 제출됨</span>
                  ) : (
                    <span className="text-amber-500 text-sm font-normal">대기중</span>
                  )}
                </h2>
                {participant.prdTextV2 && participant.status === 'GREEN' && (
                  <button
                    onClick={() => handleGeneratePrdFeedback(3)}
                    disabled={generating === 'prd'}
                    className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-xl hover:bg-green-200 transition-colors font-semibold"
                  >
                    {generating === 'prd' ? '🤖 생성 중...' : '🤖 3차 심화 피드백'}
                  </button>
                )}
              </div>
              {participant.prdTextV2 ? (
                <div className="bg-green-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto border border-green-100">
                  {participant.prdTextV2}
                </div>
              ) : (
                <p className="text-sm text-slate-400">아직 개선 PRD를 제출하지 않았습니다.</p>
              )}
            </section>

            <section className="card border-2 border-green-200">
              <h2 className="section-title text-green-700">
                🔗 산출물 링크 (2차 개선)
                {participant.artifactUrlV2 ? (
                  <span className="text-green-600 text-sm font-normal ml-auto">✅ 제출됨</span>
                ) : (
                  <span className="text-amber-500 text-sm font-normal ml-auto">대기중</span>
                )}
              </h2>
              {participant.artifactUrlV2 ? (
                <a
                  href={participant.artifactUrlV2}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-900 underline text-sm break-all"
                >
                  {participant.artifactUrlV2}
                </a>
              ) : (
                <p className="text-sm text-slate-400">아직 개선 링크를 제출하지 않았습니다.</p>
              )}
            </section>
          </>
        )}

        {/* 피드백 히스토리 */}
        <section className="card">
          <h2 className="section-title">💬 피드백 히스토리</h2>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-slate-400">아직 생성된 피드백이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-xl p-4 border ${
                    f.reviewed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        f.reviewed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {f.round}차 피드백 · {f.reviewed ? '✅ 발송됨' : '⏳ 검토 대기'}
                    </span>
                    {!f.reviewed && (
                      <button
                        onClick={() => router.push(`/instructor/review/${f.id}`)}
                        className="text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition-colors"
                      >
                        검토하기 →
                      </button>
                    )}
                  </div>

                  {f.linkTestLog && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        🔍 링크 테스트 로그
                      </p>
                      <div className="bg-white rounded-lg p-3 text-xs text-slate-500 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-100">
                        {f.linkTestLog}
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-500 mb-1">
                    {f.reviewed ? '강사 최종본' : 'AI 초안 (미발송)'}
                  </p>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {f.reviewed ? f.instructorFinal : f.aiDraft}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
