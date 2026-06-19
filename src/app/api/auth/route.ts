import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const correctPassword = process.env.INSTRUCTOR_PASSWORD

    if (!correctPassword) {
      return NextResponse.json(
        { error: 'INSTRUCTOR_PASSWORD 환경변수가 설정되지 않았습니다.' },
        { status: 500 },
      )
    }

    if (password === correctPassword) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '비밀번호가 틀렸습니다.' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: '요청 처리 오류' }, { status: 400 })
  }
}
