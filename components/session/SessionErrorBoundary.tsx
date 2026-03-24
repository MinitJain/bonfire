'use client'

import React from 'react'
import Link from 'next/link'

interface State { hasError: boolean; message: string }

export class SessionErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SessionErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="text-5xl">⚠️</div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </h1>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            The session ran into an unexpected error. Try refreshing the page or going back home.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload() }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Refresh
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Go home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
