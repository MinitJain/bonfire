export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
        }}
      />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Gathering around...
      </p>
    </div>
  )
}
