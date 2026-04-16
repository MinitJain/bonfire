// Ambient sound generator using Web Audio API — zero files, zero external deps

export type AmbientType = 'brown' | 'white' | 'pink' | 'rain'

export const AMBIENT_SOUNDS: { type: AmbientType; label: string; emoji: string; description: string }[] = [
  { type: 'brown', label: 'Brown', emoji: '🌊', description: 'Deep, warm rumble — like a distant waterfall' },
  { type: 'pink',  label: 'Pink',  emoji: '🌸', description: 'Balanced noise — the most natural-sounding' },
  { type: 'white', label: 'White',     emoji: '📻', description: 'Classic white noise — blocks all distractions' },
  { type: 'rain',  label: 'Rain',      emoji: '🌧️', description: 'Rain-like texture — cozy and grounding' },
]

export class AmbientPlayer {
  private ctx: AudioContext | null = null
  private source: AudioBufferSourceNode | null = null
  private gainNode: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private _playing = false
  private _currentType: AmbientType | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    return this.ctx
  }

  private generateBuffer(type: AmbientType): AudioBuffer {
    const ctx = this.getCtx()
    const bufferSize = ctx.sampleRate * 8 // 8 second loop
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate) // stereo

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)

      if (type === 'white') {
        // Attenuated — harshness handled by lowpass filter downstream
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.6
        }
      } else if (type === 'brown') {
        let lastOut = 0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          data[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = data[i]
          data[i] *= 2.5 // reduced from 3.5 to avoid clipping
        }
      } else if (type === 'pink') {
        // Paul Kellett's pink noise algorithm
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < bufferSize; i++) {
          const w = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + w * 0.0555179
          b1 = 0.99332 * b1 + w * 0.0750759
          b2 = 0.96900 * b2 + w * 0.1538520
          b3 = 0.86650 * b3 + w * 0.3104856
          b4 = 0.55000 * b4 + w * 0.5329522
          b5 = -0.7616 * b5 - w * 0.0168980
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09
          b6 = w * 0.115926
        }
      } else if (type === 'rain') {
        // Brown base only — no raw high-freq texture (that was the sharp part)
        let lastOut = 0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          const brown = (lastOut + 0.02 * white) / 1.02
          lastOut = brown
          data[i] = brown * 2.2
        }
      }
    }

    return buffer
  }

  play(type: AmbientType, volume: number = 0.25): void {
    const ctx = this.getCtx()

    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    // Same type already playing — just adjust volume
    if (this._playing && this._currentType === type) {
      this.gainNode?.gain.setTargetAtTime(volume, ctx.currentTime, 0.1)
      return
    }

    this.stop()

    const buffer = this.generateBuffer(type)
    this.source = ctx.createBufferSource()
    this.gainNode = ctx.createGain()

    // Lowpass filter cuts harsh high frequencies — cutoff tuned per type
    this.filterNode = ctx.createBiquadFilter()
    this.filterNode.type = 'lowpass'
    this.filterNode.frequency.value = type === 'brown' ? 500 : type === 'pink' ? 1800 : type === 'rain' ? 2500 : 2800
    this.filterNode.Q.value = 0.4 // gentle rolloff

    this.source.buffer = buffer
    this.source.loop = true

    // Fade in
    this.gainNode.gain.setValueAtTime(0, ctx.currentTime)
    this.gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5)

    this.source.connect(this.filterNode)
    this.filterNode.connect(this.gainNode)
    this.gainNode.connect(ctx.destination)
    this.source.start()

    this._playing = true
    this._currentType = type
  }

  setVolume(volume: number): void {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05)
    }
  }

  stop(): void {
    if (this.gainNode && this.ctx) {
      const ctx = this.ctx
      const gain = this.gainNode
      const src = this.source
      const filter = this.filterNode
      // Fade out then disconnect
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
      setTimeout(() => {
        try { src?.stop() } catch { /* already stopped */ }
        src?.disconnect()
        filter?.disconnect()
        gain.disconnect()
      }, 600)
    }
    this.source = null
    this.gainNode = null
    this.filterNode = null
    this._playing = false
    this._currentType = null
  }

  get playing(): boolean { return this._playing }
  get currentType(): AmbientType | null { return this._currentType }

  destroy(): void {
    this.stop()
    setTimeout(() => {
      void this.ctx?.close()
      this.ctx = null
    }, 700)
  }
}
