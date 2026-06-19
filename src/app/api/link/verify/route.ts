import { NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    const log: string[] = []
    log.push(`🔍 링크 분석 시작: ${url}`)
    log.push(`⏱️ 분석 시간: ${new Date().toLocaleString('ko-KR')}`)

    // 1단계: HTML 파싱
    let htmlContent = ''
    let fetchSuccess = false

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrainingDashboard/1.0)',
        },
      })
      clearTimeout(timeout)

      if (response.ok) {
        const rawHtml = await response.text()
        fetchSuccess = true
        log.push(`✅ HTML 가져오기 성공 (${rawHtml.length} bytes)`)

        // 기본 구조 분석
        const buttonCount = (rawHtml.match(/<button/gi) ?? []).length
        const inputCount = (rawHtml.match(/<input/gi) ?? []).length
        const imgCount = (rawHtml.match(/<img/gi) ?? []).length
        const titleMatch = rawHtml.match(/<title>(.*?)<\/title>/i)

        log.push(`\n📊 HTML 구조 분석:`)
        log.push(`  - 페이지 제목: ${titleMatch ? titleMatch[1] : '(없음)'}`)
        log.push(`  - 버튼 요소: ${buttonCount}개`)
        log.push(`  - 입력 필드: ${inputCount}개`)
        log.push(`  - 이미지: ${imgCount}개`)

        // 텍스트만 추출
        htmlContent = rawHtml
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000)
      } else {
        log.push(`⚠️ HTTP 오류: ${response.status} ${response.statusText}`)
      }
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        log.push(`⏰ 요청 시간 초과 (10초)`)
      } else {
        log.push(`❌ 가져오기 실패: ${fetchError instanceof Error ? fetchError.message : '알 수 없는 오류'}`)
      }
    }

    // 2단계: Gemini AI 분석
    let aiAnalysis = ''
    if (fetchSuccess && htmlContent) {
      try {
        aiAnalysis = await callGemini(
          `다음은 특수교사가 바이브코딩으로 만든 교육용 앱의 웹페이지 내용입니다.

URL: ${url}

페이지 내용:
${htmlContent}

특수교육 앱 관점에서 다음을 평가해주세요 (반드시 1000자 이내로 완성된 문장으로 작성):
1. 앱의 주요 기능이 무엇으로 보이는지
2. 장애학생이 사용하기에 접근성/사용편의성이 어떠한지
3. 개선이 필요해 보이는 점 한 가지`,
          undefined,
          1200,
        )
        log.push(`\n🤖 AI 분석 결과:\n${aiAnalysis}`)
      } catch {
        log.push(`⚠️ AI 분석 실패 (링크 구조 정보만 제공)`)
      }
    } else {
      log.push(`\n⚠️ HTML 내용을 가져오지 못해 AI 분석을 진행할 수 없습니다.`)
      log.push(`   URL이 공개 접근 가능한지, 로그인 없이 볼 수 있는지 확인해주세요.`)
    }

    const logText = log.join('\n')
    return NextResponse.json({ success: fetchSuccess, log: logText, aiAnalysis })
  } catch (error) {
    console.error('링크 검증 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '링크 검증에 실패했습니다.' },
      { status: 500 },
    )
  }
}
