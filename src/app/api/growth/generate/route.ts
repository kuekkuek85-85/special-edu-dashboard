import { NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { participantName, school, prdV1, prdV2, artifactUrlV1, artifactUrlV2, feedbacks } =
      await req.json()

    if (!prdV1 || !prdV2) {
      return NextResponse.json({ error: '1차·2차 PRD가 모두 필요합니다.' }, { status: 400 })
    }

    const feedbackSummary = (feedbacks as { instructorFinal: string }[])
      .map((f, i) => `[피드백 ${i + 1}]\n${f.instructorFinal}`)
      .join('\n\n')

    const prompt = `당신은 특수교육 전문가이자 에듀테크 코치입니다.
아래는 ${school} ${participantName} 선생님의 바이브코딩 연수 전·후 기록입니다.
반드시 800자 이내로, 완성된 문장으로 성장 분석을 작성해주세요.

===== 1차 PRD (연수 초반) =====
${prdV1}

===== 2차 PRD (피드백 반영 후) =====
${prdV2}

===== 산출물 링크 =====
1차: ${artifactUrlV1 ?? '없음'}
2차: ${artifactUrlV2 ?? '없음'}

===== 강사 피드백 =====
${feedbackSummary || '없음'}

위 내용을 바탕으로 아래 3가지를 분석해주세요:

### 🌱 주요 성장 포인트
1차 대비 2차에서 가장 눈에 띄게 성장한 부분 2~3가지를 구체적으로 서술하세요.

### 💬 피드백 반영도
강사 피드백이 2차 PRD에 어떻게 반영되었는지 평가하세요.

### 🏆 종합 성장 평가
이 선생님의 연수 전반에 걸친 성장을 격려하는 말로 마무리해주세요.`

    const analysis = await callGemini(prompt, undefined, 1500)
    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('성장 보고서 생성 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '성장 보고서 생성에 실패했습니다.' },
      { status: 500 },
    )
  }
}
