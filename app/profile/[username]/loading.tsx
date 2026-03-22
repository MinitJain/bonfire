export default function ProfileLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        <div className="grid grid-cols-2 gap-4 mt-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}
