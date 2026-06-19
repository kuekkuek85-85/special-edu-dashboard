'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getParticipant,
  getFeedbacksByParticipant,
  getGrowthReport,
  saveGrowthReport,
} from '@/lib/database'
import type { Participant, Feedback } from '@/types'

export default function GrowthReportPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [growthAnalysis, setGrowthAnalysis] = useState('')
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const p = await getParticipant(params.id)
    if (!p) { setError('참가자를 찾을 수 없습니다.'); setLoading(false); return }
    setParticipant(p)
    const fbs = await getFeedbacksByParticipant(params.id)
    setFeedbacks(fbs.filter((f) => f.reviewed && f.instructorFinal))
    const report = await getGrowthReport(params.id)
    if (report) { setGrowthAnalysis(report.analysis); setGeneratedAt(report.generatedAt) }
    setLoading(false)
  }, [params.id])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    if (!participant) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/growth/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: participant.name,
          school: participant.school,
          prdV1: participant.prdTextV1,
          prdV2: participant.prdTextV2,
          artifactUrlV1: participant.artifactUrlV1,
          artifactUrlV2: participant.artifactUrlV2,
          feedbacks: feedbacks.map((f) => ({ instructorFinal: f.instructorFinal })),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `오류 (${res.status})`)
      }
      const { analysis } = await res.json()
      await saveGrowthReport(params.id, analysis)
      setGrowthAnalysis(analysis)
      setGeneratedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setGenerating(false)
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

  const canGenerate = !!(participant.prdTextV1 && participant.prdTextV2)

  return (
    <main className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
        >
          ← 뒤로
        </button>
        <span className="text-slate-300">|</span>
        <h1 className="text-xl font-bold text-slate-800">📈 개인 성장 보고서</h1>
        <span className="text-sm text-slate-500">{participant.school} · {participant.name}</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-4 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* PRD 비교 */}
        <section className="card">
          <h2 className="section-title">📝 PRD 성장 비교</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">1차 PRD (연수 초반)</p>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto border border-slate-100">
                {participant.prdTextV1 ?? '(미제출)'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 mb-2">2차 PRD (피드백 반영 후)</p>
              <div className="bg-green-50 rounded-xl p-4 text-sm text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto border border-green-100">
                {participant.prdTextV2 ?? '(미제출)'}
              </div>
            </div>
          </div>
        </section>

        {/* 산출물 링크 비교 */}
        <section className="card">
          <h2 className="section-title">🔗 산출물 링크</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">1차 산출물</p>
              {participant.artifactUrlV1 ? (
                <a href={participant.artifactUrlV1} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 underline text-sm break-all">
                  {participant.artifactUrlV1}
                </a>
              ) : <p className="text-sm text-slate-400">미제출</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 mb-2">2차 산출물</p>
              {participant.artifactUrlV2 ? (
                <a href={participant.artifactUrlV2} target="_blank" rel="noopener noreferrer"
                  className="text-green-700 hover:text-green-900 underline text-sm break-all">
                  {participant.artifactUrlV2}
                </a>
              ) : <p className="text-sm text-slate-400">미제출</p>}
            </div>
          </div>
        </section>

        {/* 받은 피드백 */}
        {feedbacks.length > 0 && (
          <section className="card">
            <h2 className="section-title">💬 받은 강사 피드백</h2>
            <div className="space-y-3">
              {feedbacks.map((f, i) => (
                <div key={f.id} className="bg-indigo-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto border border-indigo-100">
                  {feedbacks.length > 1 && (
                    <p className="text-xs font-semibold text-indigo-400 mb-2">{i + 1}번째 피드백</p>
                  )}
                  {f.instructorFinal}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI 성장 분석 */}
        <section className="card border-2 border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">🤖 AI 성장 분석</h2>
            <button
              onClick={handleGenerate}
              disabled={generating || !canGenerate}
              className="text-sm bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors font-semibold disabled:opacity-40"
            >
              {generating ? '분석 중...' : growthAnalysis ? '🔄 재생성' : '✨ 성장 분석 생성'}
            </button>
          </div>
          {!canGenerate && (
            <p className="text-xs text-slate-400">1차·2차 PRD가 모두 있어야 분석이 가능합니다.</p>
          )}
          {growthAnalysis ? (
            <>
              <div className="bg-amber-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto border border-amber-100">
                {growthAnalysis}
              </div>
              {generatedAt && (
                <p className="text-xs text-slate-400 mt-2 text-right">
                  생성: {new Date(generatedAt).toLocaleString('ko-KR')}
                </p>
              )}
            </>
          ) : (
            !generating && (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4 border border-slate-100">
                버튼을 눌러 AI 성장 분석을 생성해보세요.
              </p>
            )
          )}
          {generating && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-sm text-amber-600 animate-pulse">
              AI가 성장 과정을 분석하고 있습니다...
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
