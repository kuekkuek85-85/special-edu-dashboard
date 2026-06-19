import { NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { prdText, round, participantName, school } = await req.json()

    if (!prdText) {
      return NextResponse.json({ error: 'PRD 텍스트가 필요합니다.' }, { status: 400 })
    }

    const isAdvanced = round === 3

    const systemPrompt = `당신은 특수교육 전문가이자 에듀테크 코치입니다.
특수교사들이 바이브코딩으로 만든 교육용 앱의 PRD(기획서)를 검토하고
교육적·기술적 관점에서 구체적이고 실질적인 피드백을 제공합니다.

피드백 원칙:
- 전체 피드백은 반드시 500자 이내로 작성 (초과 금지)
- 구체적이고 실행 가능한 피드백 제공
- 교사의 노력을 인정하고 격려하는 톤 유지
- 특수교육 현장의 현실적 맥락 반영
- 학생(장애학생) 관점에서의 접근성과 성공 경험 강조
- 마크다운 형식으로 구조화된 피드백 작성`

    const userPrompt = isAdvanced
      ? `다음은 ${school} ${participantName} 선생님의 개선된 교육용 앱 PRD입니다.
이미 1차 피드백을 반영하여 개선하셨습니다. **3차 심화 피드백**으로 한 단계 더 발전시킬 수 있는 기능 추가 및 개선 방향을 제안해주세요.

---
${prdText}
---

### 🌟 현재 앱의 강점
잘 설계된 부분 2-3가지를 구체적으로 칭찬해주세요.

### 🚀 추가하면 좋은 기능 제안
최소 3가지 구체적인 기능 제안 (기능 설명, 학생에게 도움되는 이유, 간단한 구현 힌트 포함)

### 📱 사용성 개선 아이디어
학생들이 더 쉽게 쓸 수 있게 개선할 UI/UX 포인트

### 🎯 다음 단계 도전 과제
심화 학습 방향 제시`
      : `다음은 ${school} ${participantName} 선생님이 작성한 교육용 앱 PRD입니다.

---
${prdText}
---

아래 3가지 섹션으로 구조화된 피드백을 작성해주세요.

### ✅ 잘한 점
PRD에서 좋은 점을 구체적으로 2-3가지 칭찬해주세요. 어떤 점이 잘 되었는지, 왜 그것이 좋은지(교육적 맥락)를 설명해주세요.

### 💡 개선 사항
기능 및 구조적 관점에서 개선할 점을 구체적으로 제안해주세요:
- PRD 구성요소 충실도 (빠진 항목)
- 기능 정의의 명확성
- 데이터 설계 및 AI 활용 방안
- 각 개선 사항에 대해 **왜 개선이 필요한지**와 **어떻게 하면 좋은지** 함께 작성

### 🎓 교육적 관점 피드백 (필수)
특수교육 전문 관점에서 다음을 다루어주세요:
- **대상 학생 특성 반영도**: 이 학생들의 특성을 앱 설계에 잘 반영했는가?
- **학습 목표의 적절성**: 목표가 현실적이고 성취 가능한가?
- **개별화 및 성공 경험 설계**: 학생마다 다른 수준 지원 여부, 작은 성공 경험 빈도
- **특수교육 적합성**: 이 앱이 특수교육 환경에서 실제로 활용 가능한가?
- **접근성**: 큰 글자, 타이핑 최소화, 시각적 피드백 등 접근성 요소`

    const feedback = await callGemini(userPrompt, systemPrompt, 600)
    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('AI 피드백 생성 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 피드백 생성에 실패했습니다.' },
      { status: 500 },
    )
  }
}
