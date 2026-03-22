export default function SessionLoading() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  )
}
