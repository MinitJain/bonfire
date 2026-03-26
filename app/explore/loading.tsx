export default function ExploreLoading() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto w-full px-5 sm:px-8 py-12">
        <div className="h-10 w-48 rounded-xl animate-pulse mb-10" style={{ background: 'var(--bg-secondary)' }} />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
