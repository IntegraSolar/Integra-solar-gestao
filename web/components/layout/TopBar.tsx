interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header
      className="fixed left-0 md:left-56 right-0 top-0 h-14 flex items-center px-4 md:px-6 z-40"
      style={{
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--theme-border)',
      }}
    >
      <h1 className="text-[15px] font-bold text-white/90">{title}</h1>
    </header>
  )
}
