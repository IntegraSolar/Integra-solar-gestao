export function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div
      className={`${w} ${h} rounded-lg animate-pulse`}
      style={{ background: 'var(--theme-surface-hover)' }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 animate-pulse"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <SkeletonLine w="w-1/3" h="h-3" />
      <SkeletonLine w="w-2/3" h="h-7" />
      <SkeletonLine w="w-1/2" h="h-3" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div
      className="rounded-xl px-5 py-3.5 flex items-center gap-4 animate-pulse"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="flex-1 space-y-2">
        <SkeletonLine w="w-1/3" h="h-4" />
        <SkeletonLine w="w-1/4" h="h-3" />
      </div>
      <SkeletonLine w="w-20" h="h-5" />
    </div>
  )
}

export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <div className="space-y-2">
          <SkeletonLine w="w-28" h="h-5" />
          <SkeletonLine w="w-20" h="h-3" />
        </div>
        <SkeletonLine w="w-40" h="h-9" />
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex flex-col gap-2">
          {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  )
}

export function DetailPageSkeleton({ tabs = 8 }: { tabs?: number }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0 animate-pulse"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <SkeletonLine w="w-20" h="h-3" />
        <div className="space-y-1.5">
          <SkeletonLine w="w-40" h="h-5" />
          <SkeletonLine w="w-24" h="h-3" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        {Array.from({ length: tabs }).map((_, i) => (
          <div
            key={i}
            className="w-16 h-8 rounded-lg animate-pulse"
            style={{ background: 'var(--theme-surface-hover)' }}
          />
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
        <div
          className="rounded-2xl p-5 space-y-4 animate-pulse"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
        >
          <SkeletonLine w="w-1/4" h="h-5" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonLine w="w-1/3" h="h-3" />
                <SkeletonLine w="w-2/3" h="h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConfiguracoesSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1.5 animate-pulse">
        <SkeletonLine w="w-40" h="h-7" />
        <SkeletonLine w="w-64" h="h-4" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 w-fit animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-24 h-10 rounded-lg"
            style={{ background: 'var(--theme-surface-hover)' }}
          />
        ))}
      </div>
      {/* Content card */}
      <div
        className="rounded-2xl p-5 space-y-5 animate-pulse"
        style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
      >
        <SkeletonLine w="w-1/4" h="h-5" />
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonLine w="w-1/3" h="h-3" />
              <SkeletonLine w="full" h="h-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
