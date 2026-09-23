type RootLayoutProps = Readonly<{ children: React.ReactNode }>

function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

export default RootLayout
