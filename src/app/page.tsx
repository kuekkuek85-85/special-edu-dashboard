'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  findOrCreateParticipant,
  submitPrd,
  submitArtifactUrl,
  subscribeParticipant,
  getFeedbacksByParticipant,
} from '@/lib/database'
import type { Participant, Feedback } from '@/types'
import { STATUS_CONFIG } from '@/types'
import StatusBadge from '@/components/StatusBadge'

type Step = 'identify' | 'main'

export default function StudentPage() {
  const [step, setStep] = useState<Step>('identify')
  const [school, setSchool] = useState('')
  const [name, setName] = useState('')
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 폼 상태
  const [prdV1, setPrdV1] = useState('')
  const [prdV2, setPrdV2] = useState('')
  const [urlV1, setUrlV1] = useState('')
  const [urlV2, setUrlV2] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  // 실시간 구독
  useEffect(() => {
    if (!participant?.id) return
    const unsub = subscribeParticipant(participant.id, (p) => {
      if (p) setParticipant(p)
    })
    return () => unsub()
  }, [participant?.id])

  // 피드백 로드
  const loadFeedbacks = useCallback(async () => {
    if (!participant?.id) return
    const fbs = await getFeedbacksByParticipant(participant.id)
    setFeedbacks(fbs)
  }, [participant?.id])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!school.trim() || !name.trim()) {
      setError('학교명과 이름을 모두 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const p = await findOrCreateParticipant(school.trim(), name.trim())
      setParticipant(p)
      setStep('main')
    } catch {
      setError('연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleSubmitPrdV1 = async () => {
    if (!participant || !prdV1.trim()) return
    setSubmitting('prdV1')
    try {
      await submitPrd(participant.id, prdV1.trim(), 1)
      showSuccess('✅ PRD(1차)가 제출되었습니다!')
    } catch {
      setError('제출에 실패했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  const handleSubmitUrlV1 = async () => {
    if (!participant || !urlV1.trim()) return
    setSubmitting('urlV1')
    try {
      await submitArtifactUrl(participant.id, urlV1.trim(), 1)
      showSuccess('✅ 산출물 링크(1차)가 제출되었습니다!')
    } catch {
      setError('제출에 실패했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  const handleSubmitPrdV2 = async () => {
    if (!participant || !prdV2.trim()) return
    setSubmitting('prdV2')
    try {
      await submitPrd(participant.id, prdV2.trim(), 2)
      showSuccess('✅ 개선 PRD(2차)가 제출되었습니다!')
    } catch {
      setError('제출에 실패했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  const handleSubmitUrlV2 = async () => {
    if (!participant || !urlV2.trim()) return
    setSubmitting('urlV2')
    try {
      await submitArtifactUrl(participant.id, urlV2.trim(), 2)
      showSuccess('✅ 개선 산출물 링크(2차)가 제출되었습니다!')
    } catch {
      setError('제출에 실패했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  const sentFeedbacks = feedbacks.filter(
    (f) => f.reviewed && f.instructorFinal,
  )

  // ── 식별 화면 ──────────────────────────────────────────────────
  if (step === 'identify') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎓</div>
            <h1 className="text-2xl font-bold text-slate-800">바이브코딩 연수</h1>
            <p className="text-slate-500 mt-1 text-sm">
              2026 성동광진 특수교사 연수 · PRD & 산출물 제출
            </p>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-700 mb-5 text-center">
              본인 확인
            </h2>
            <form onSubmit={handleIdentify} className="space-y-4">
              <div>
                <label className="label">학교명</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="예: OO중학교"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="label">이름</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full mt-2"
                disabled={loading}
              >
                {loading ? '확인 중...' : '입장하기 →'}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-4">
              같은 학교+이름으로 재입장하면 기존 제출 내용이 불러와집니다
            </p>
          </div>

          <div className="text-center mt-6">
            <a
              href="/instructor"
              className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
            >
              강사 대시보드로 이동 →
            </a>
          </div>
        </div>
      </main>
    )
  }

  // ── 메인 화면 ──────────────────────────────────────────────────
  if (!participant) return null
  const statusCfg = STATUS_CONFIG[participant.status]

  return (
    <main className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {participant.school} · {participant.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">바이브코딩 연수 제출 공간</p>
        </div>
        <button
          onClick={() => {
            setStep('identify')
            setParticipant(null)
          }}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← 나가기
        </button>
      </div>

      {/* 상태 카드 */}
      <div
        className="rounded-2xl p-5 mb-6 border-2"
        style={{
          backgroundColor: statusCfg.bgColor,
          borderColor: statusCfg.borderColor,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: statusCfg.textColor }}>
              현재 진행 상태
            </p>
            <StatusBadge status={participant.status} size="lg" />
          </div>
          <div className="text-4xl">{statusCfg.emoji}</div>
        </div>
        <p className="text-xs mt-2" style={{ color: statusCfg.textColor }}>
          {statusCfg.description}
        </p>
        {participant.status === 'GREEN' && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <a
              href={`/growth/${participant.id}`}
              className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
            >
              📈 개인 성장 보고서 보기
            </a>
          </div>
        )}
      </div>

      {/* 알림 메시지 */}
      {successMsg && (
        <div className="bg-green-50 text-green-700 rounded-xl px-4 py-3 mb-4 border border-green-200 font-semibold text-sm">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-4 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* ── 1차 PRD 제출 ── */}
        <section className="card">
          <h2 className="section-title">
            📝 PRD 제출 (1차)
            {participant.prdTextV1 && (
              <span className="text-green-600 text-sm font-normal ml-auto">✅ 제출 완료</span>
            )}
          </h2>

          {participant.prdTextV1 ? (
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-100">
              {participant.prdTextV1}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                교육 설계 + 기술 설계가 포함된 PRD를 붙여넣어 주세요.
                학생 정보는 <strong>별칭·번호</strong>만 사용해주세요(실명·사진 금지).
              </p>
              <textarea
                className="textarea-field"
                rows={8}
                placeholder="PRD 내용을 붙여넣거나 직접 작성하세요..."
                value={prdV1}
                onChange={(e) => setPrdV1(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleSubmitPrdV1}
                disabled={!prdV1.trim() || submitting === 'prdV1'}
              >
                {submitting === 'prdV1' ? '제출 중...' : 'PRD 제출하기'}
              </button>
            </div>
          )}
        </section>

        {/* ── 1차 산출물 링크 ── */}
        <section className="card">
          <h2 className="section-title">
            🔗 산출물 링크 제출 (1차)
            {participant.artifactUrlV1 && (
              <span className="text-green-600 text-sm font-normal ml-auto">✅ 제출 완료</span>
            )}
          </h2>

          {participant.artifactUrlV1 ? (
            <div className="flex items-center gap-3">
              <a
                href={participant.artifactUrlV1}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline text-sm break-all"
              >
                {participant.artifactUrlV1}
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">배포된 웹앱 URL을 입력해주세요.</p>
              <input
                type="url"
                className="input-field"
                placeholder="https://..."
                value={urlV1}
                onChange={(e) => setUrlV1(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleSubmitUrlV1}
                disabled={!urlV1.trim() || submitting === 'urlV1'}
              >
                {submitting === 'urlV1' ? '제출 중...' : '링크 제출하기'}
              </button>
            </div>
          )}
        </section>

        {/* ── 강사 피드백 ── */}
        {sentFeedbacks.length > 0 && (
          <section className="card border-2 border-indigo-200">
            <h2 className="section-title text-indigo-700">
              💬 강사 피드백
              <span className="ml-auto text-xs font-normal text-indigo-400">
                검토 완료 후 발송됨
              </span>
            </h2>
            <div className="space-y-3">
              {sentFeedbacks.map((f, i) => (
                <div key={f.id} className="bg-indigo-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-80 overflow-y-auto border border-indigo-100">
                  {sentFeedbacks.length > 1 && (
                    <p className="text-xs font-semibold text-indigo-400 mb-2">{i + 1}번째 피드백</p>
                  )}
                  {f.instructorFinal}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 개선 재제출 (피드백 이후에만 표시) ── */}
        {participant.feedbackSent && (
          <>
            <section className="card border-2 border-green-200">
              <h2 className="section-title text-green-700">
                🔄 PRD 개선 재제출 (2차)
                {participant.prdTextV2 && (
                  <span className="text-green-600 text-sm font-normal ml-auto">✅ 제출 완료</span>
                )}
              </h2>

              {participant.prdTextV2 ? (
                <div className="bg-green-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto border border-green-100">
                  {participant.prdTextV2}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    피드백을 반영해서 개선한 PRD를 제출해주세요.
                  </p>
                  <textarea
                    className="textarea-field"
                    rows={8}
                    placeholder="개선된 PRD를 붙여넣거나 작성하세요..."
                    value={prdV2}
                    onChange={(e) => setPrdV2(e.target.value)}
                  />
                  <button
                    className="btn-success"
                    onClick={handleSubmitPrdV2}
                    disabled={!prdV2.trim() || submitting === 'prdV2'}
                  >
                    {submitting === 'prdV2' ? '제출 중...' : '개선 PRD 제출하기'}
                  </button>
                </div>
              )}
            </section>

            <section className="card border-2 border-green-200">
              <h2 className="section-title text-green-700">
                🔗 산출물 링크 개선 제출 (2차)
                {participant.artifactUrlV2 && (
                  <span className="text-green-600 text-sm font-normal ml-auto">✅ 제출 완료</span>
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
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    개선된 웹앱의 배포 URL을 입력해주세요.
                  </p>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://..."
                    value={urlV2}
                    onChange={(e) => setUrlV2(e.target.value)}
                  />
                  <button
                    className="btn-success"
                    onClick={handleSubmitUrlV2}
                    disabled={!urlV2.trim() || submitting === 'urlV2'}
                  >
                    {submitting === 'urlV2' ? '제출 중...' : '개선 링크 제출하기'}
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* 안내 */}
        <div className="text-center text-xs text-slate-400 pb-8">
          <p>제출 후 강사의 피드백을 기다려주세요.</p>
          <p className="mt-1">피드백이 도착하면 이 화면에 자동으로 표시됩니다.</p>
        </div>
      </div>
    </main>
  )
}
