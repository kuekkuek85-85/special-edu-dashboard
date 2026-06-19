const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

interface GeminiPart {
  text: string
}

interface GeminiContent {
  role?: string
  parts: GeminiPart[]
}

interface GeminiRequest {
  system_instruction?: { parts: GeminiPart[] }
  contents: GeminiContent[]
  generationConfig?: {
    maxOutputTokens?: number
    temperature?: number
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: GeminiPart[]
    }
  }>
}

export async function callGemini(
  userPrompt: string,
  systemPrompt?: string,
  maxTokens = 2000,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.')

  const body: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  }

  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] }
  }

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류 (${res.status}): ${err}`)
  }

  const data: GeminiResponse = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 응답에서 텍스트를 찾을 수 없습니다.')
  return text
}
