import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '바이브코딩 연수 대시보드 | 2026 성동광진 특수교사',
  description: '강사용 PRD·산출물 수합 & 피드백 대시보드',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
        {children}
      </body>
    </html>
  )
}
