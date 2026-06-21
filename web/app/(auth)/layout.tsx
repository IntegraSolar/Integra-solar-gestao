export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(145deg, #0E2236, #1A3A5C 55%, #1e4a73)',
      }}
    >
      {children}
    </main>
  )
}
