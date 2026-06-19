'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeParticipants, getPendingFeedbacks, saveFeedbackDraft, saveLinkTestLog, sendFeedback } from '@/lib/database'
import type { Participant, Feedback, Status } from '@/types'
import { STATUS_CONFIG } from '@/types'
import RadialDashboard from '@/components/RadialDashboard'
import StatusBadge from '@/components/StatusBadge'

type FilterStatus = Status | null

export default function InstructorPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [pendingFeedbacks, setPendingFeedbacks] = useState<(Feedback & { participant?: Participant })[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(null)
  const [view, setView] = useState<'radial' | 'list'>('radial')
  const [bulkState, setBulkState] = useState<{ type: 'prd' | 'link' | 'send'; current: number; total: number } | null>(null)
  const [bulkResult, setBulkResult] = useState('')

  // 인증 확인
  useEffect(() => {
    const stored = sessionStorage.getItem('instructor_auth')
    if (stored === 'true') setAuthed(true)
  }, [])

  // 실시간 구독
  useEffect(() => {
    if (!authed) return
    const unsub = subscribeParticipants(setParticipants)
    return () => unsub()
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const load = async () => {
      const pending = await getPendingFeedbacks()
      setPendingFeedbacks(pending)
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [authed])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        sessionStorage.setItem('instructor_auth', 'true')
        setAuthed(true)
      } else {
        setAuthError('비밀번호가 틀렸습니다.')
      }
    } catch {
      setAuthError('서버 연결에 실패했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('instructor_auth')
    setAuthed(false)
    setPassword('')
  }

  // ── 로그인 화면 ────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h1 className="text-2xl font-bold text-slate-800">강사 대시보드</h1>
            <p className="text-slate-500 text-sm mt-1">2026 성동광진 특수교사 연수</p>
          </div>

          <div className="card">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">강사 비밀번호</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                />
              </div>
              {authError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={authLoading || !password}
              >
                {authLoading ? '확인 중...' : '입장하기 →'}
              </button>
            </form>
          </div>

          <div className="text-center mt-4">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              ← 수강생 제출 화면으로
            </a>
          </div>
        </div>
      </main>
    )
  }

  // ── 일괄 발송 ──────────────────────────────────────────────────
  const handleBulkSend = async () => {
    if (pendingFeedbacks.length === 0 || bulkState) return
    if (!confirm(`검토 대기 중인 피드백 ${pendingFeedbacks.length}건을 AI 초안 그대로 일괄 발송하시겠습니까?`)) return
    setBulkResult('')
    setBulkState({ type: 'send' as never, current: 0, total: pendingFeedbacks.length })
    let ok = 0
    for (let i = 0; i < pendingFeedbacks.length; i++) {
      const f = pendingFeedbacks[i]
      setBulkState({ type: 'send' as never, current: i + 1, total: pendingFeedbacks.length })
      try {
        const text = f.instructorFinal ?? f.aiDraft
        await sendFeedback(f.id, f.participantId, text)
        ok++
      } catch { /* 다음 계속 */ }
    }
    setBulkState(null)
    setBulkResult(`✅ 일괄 발송 완료 (${ok}/${pendingFeedbacks.length}건)`)
    setTimeout(() => setBulkResult(''), 5000)
  }

  // ── 일괄 피드백 ────────────────────────────────────────────────
  const pendingParticipantIds = new Set(pendingFeedbacks.map((f) => f.participantId))
  const prdEligible = participants.filter(
    (p) => p.prdTextV1 && !p.feedbackSent && !pendingParticipantIds.has(p.id),
  )
  const linkEligible = participants.filter(
    (p) => p.artifactUrlV1 && !p.feedbackSent && !pendingParticipantIds.has(p.id),
  )

  const handleBulkPrdFeedback = async () => {
    if (prdEligible.length === 0 || bulkState) return
    setBulkResult('')
    setBulkState({ type: 'prd', current: 0, total: prdEligible.length })
    let ok = 0
    for (let i = 0; i < prdEligible.length; i++) {
      const p = prdEligible[i]
      setBulkState({ type: 'prd', current: i + 1, total: prdEligible.length })
      try {
        const res = await fetch('/api/feedback/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: p.id, prdText: p.prdTextV1, round: 1, participantName: p.name, school: p.school }),
        })
        if (res.ok) {
          const data = await res.json()
          await saveFeedbackDraft(p.id, data.feedback, 1)
          ok++
        }
      } catch { /* 다음 참가자 계속 */ }
    }
    setBulkState(null)
    setBulkResult(`✅ PRD 일괄 피드백 완료 (${ok}/${prdEligible.length}명)`)
    setTimeout(() => setBulkResult(''), 5000)
  }

  const handleBulkLinkFeedback = async () => {
    if (linkEligible.length === 0 || bulkState) return
    setBulkResult('')
    setBulkState({ type: 'link', current: 0, total: linkEligible.length })
    let ok = 0
    for (let i = 0; i < linkEligible.length; i++) {
      const p = linkEligible[i]
      setBulkState({ type: 'link', current: i + 1, total: linkEligible.length })
      try {
        const res = await fetch('/api/link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: p.artifactUrlV1, participantId: p.id }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.aiAnalysis) {
            const draft = `🔗 산출물 링크 분석 피드백\n\n${data.aiAnalysis}`
            const fid = await saveFeedbackDraft(p.id, draft, 1)
            if (data.log) await saveLinkTestLog(fid, data.log)
            ok++
          }
        }
      } catch { /* 다음 참가자 계속 */ }
    }
    setBulkState(null)
    setBulkResult(`✅ 링크 일괄 피드백 완료 (${ok}/${linkEligible.length}명)`)
    setTimeout(() => setBulkResult(''), 5000)
  }

  // ── 통계 계산 ──────────────────────────────────────────────────
  const statusCounts = participants.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    },
    {} as Record<Status, number>,
  )

  const statuses: Status[] = ['RED', 'ORANGE', 'YELLOW', 'LIGHT_GREEN', 'GREEN']

  // ── 메인 대시보드 ──────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            👨‍🏫 강사 대시보드
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">실시간 · {participants.length}명 참가</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-sm">
          로그아웃
        </button>
      </div>

      {/* 일괄 피드백 버튼 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
        <p className="text-xs font-semibold text-slate-500 mb-3">⚡ 일괄 피드백 생성</p>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleBulkPrdFeedback}
            disabled={!!bulkState || prdEligible.length === 0}
            className="flex items-center gap-2 bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkState?.type === 'prd' ? (
              <>🔄 PRD 처리 중 {bulkState.current}/{bulkState.total}</>
            ) : (
              <>🤖 PRD 일괄 피드백 {prdEligible.length > 0 && <span className="bg-white text-indigo-600 rounded-lg px-1.5 py-0.5 text-xs">{prdEligible.length}명</span>}</>
            )}
          </button>
          <button
            onClick={handleBulkLinkFeedback}
            disabled={!!bulkState || linkEligible.length === 0}
            className="flex items-center gap-2 bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkState?.type === 'link' ? (
              <>🔄 링크 처리 중 {bulkState.current}/{bulkState.total}</>
            ) : (
              <>🔍 링크 일괄 피드백 {linkEligible.length > 0 && <span className="bg-white text-blue-600 rounded-lg px-1.5 py-0.5 text-xs">{linkEligible.length}명</span>}</>
            )}
          </button>
          <div className="w-px h-8 bg-slate-200" />
          <button
            onClick={handleBulkSend}
            disabled={!!bulkState || pendingFeedbacks.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkState?.type === 'send' ? (
              <>📤 발송 중 {bulkState.current}/{bulkState.total}</>
            ) : (
              <>📤 일괄 발송 {pendingFeedbacks.length > 0 && <span className="bg-white text-green-700 rounded-lg px-1.5 py-0.5 text-xs">{pendingFeedbacks.length}건</span>}</>
            )}
          </button>
          {bulkResult && (
            <span className="text-sm font-semibold text-green-600">{bulkResult}</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          생성 버튼: 미발송·초안없는 수강생 대상 &nbsp;|&nbsp; 일괄 발송: 검토 대기 초안을 수강생에게 즉시 발송
        </p>
      </div>

      {/* 검토 대기 배지 */}
      {pendingFeedbacks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-bold text-amber-800">검토 대기 피드백 {pendingFeedbacks.length}건</p>
              <p className="text-xs text-amber-600">AI 초안이 생성되었으며 강사 검토가 필요합니다</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {pendingFeedbacks.slice(0, 3).map((f) => (
              <button
                key={f.id}
                onClick={() => router.push(`/instructor/review/${f.id}`)}
                className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
              >
                {f.participant?.name ?? '?'} 검토하기 →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 신호등 요약 위젯 */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {statuses.map((s) => {
          const cfg = STATUS_CONFIG[s]
          const count = statusCounts[s] ?? 0
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? null : s)}
              className="rounded-2xl p-4 text-center transition-all hover:scale-105 active:scale-95 border-2"
              style={{
                backgroundColor: cfg.bgColor,
                borderColor: filterStatus === s ? cfg.color : cfg.borderColor,
                opacity: filterStatus && filterStatus !== s ? 0.5 : 1,
              }}
            >
              <div className="text-2xl mb-1">{cfg.emoji}</div>
              <div
                className="text-2xl font-bold"
                style={{ color: cfg.textColor }}
              >
                {count}
              </div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: cfg.textColor }}>
                {cfg.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* 필터 & 뷰 전환 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus(null)}
            className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              !filterStatus
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            전체
          </button>
          <button
            onClick={() =>
              setFilterStatus(
                filterStatus === 'RED' || filterStatus === 'ORANGE' ? null : 'RED',
              )
            }
            className="text-sm px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
          >
            🔴🟠 멘토링 우선
          </button>
          <button
            onClick={() =>
              setFilterStatus(filterStatus === 'GREEN' ? null : 'GREEN')
            }
            className="text-sm px-3 py-1.5 rounded-lg font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
          >
            🟢 3차 심화
          </button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setView('radial')}
            className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              view === 'radial' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
            }`}
          >
            방사형
          </button>
          <button
            onClick={() => setView('list')}
            className={`text-sm px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              view === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
            }`}
          >
            목록
          </button>
        </div>
      </div>

      {/* 대시보드 뷰 */}
      <div className="card">
        {view === 'radial' ? (
          <RadialDashboard
            participants={participants}
            filterStatus={
              filterStatus === 'RED'
                ? undefined  // 멘토링 모드는 별도 처리 필요 — 일단 null 전달
                : filterStatus ?? undefined
            }
          />
        ) : (
          <ParticipantList
            participants={participants}
            filterStatus={filterStatus}
            onNavigate={(id) => router.push(`/instructor/participant/${id}`)}
            onReview={(id) => router.push(`/instructor/review/${id}`)}
          />
        )}
      </div>
    </main>
  )
}

// ── 목록 뷰 컴포넌트 ────────────────────────────────────────────
function ParticipantList({
  participants,
  filterStatus,
  onNavigate,
  onReview,
}: {
  participants: Participant[]
  filterStatus: FilterStatus
  onNavigate: (id: string) => void
  onReview: (id: string) => void
}) {
  const filtered = filterStatus
    ? participants.filter((p) =>
        filterStatus === 'RED'
          ? p.status === 'RED' || p.status === 'ORANGE'
          : p.status === filterStatus,
      )
    : participants

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        해당 조건의 수강생이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <StatusBadge status={p.status} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800">
              {p.school} · {p.name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {p.prdTextV1 ? '📝 PRD 있음' : '📝 PRD 없음'} ·{' '}
              {p.artifactUrlV1 ? '🔗 링크 있음' : '🔗 링크 없음'} ·{' '}
              {p.feedbackSent ? '💬 피드백 발송됨' : '💬 피드백 대기중'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {p.status === 'YELLOW' && !p.feedbackSent && (
              <button
                onClick={() => onNavigate(p.id)}
                className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors font-semibold"
              >
                AI 피드백 생성
              </button>
            )}
            <button
              onClick={() => onNavigate(p.id)}
              className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors font-semibold"
            >
              상세보기 →
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
