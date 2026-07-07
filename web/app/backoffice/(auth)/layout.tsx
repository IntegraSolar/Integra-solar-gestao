export default function BackofficeAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(145deg, #060F17, #0E2236 55%, #0A1C2E)' }}
    >
      {children}
    </main>
  )
}
