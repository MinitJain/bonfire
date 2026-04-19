const ADJECTIVES = [
  'focused', 'quiet', 'deep', 'swift', 'calm', 'bold', 'bright', 'silent',
  'sharp', 'steady', 'fierce', 'golden', 'cosmic', 'electric', 'ancient',
  'frozen', 'hidden', 'mighty', 'neon', 'wild', 'lazy', 'sleepy', 'happy',
  'lucky', 'clever', 'brave', 'funky', 'epic', 'chill', 'turbo',
]

const NOUNS = [
  'panda', 'tiger', 'falcon', 'wolf', 'phoenix', 'dolphin', 'fox', 'owl',
  'coder', 'robot', 'wizard', 'ninja', 'pirate', 'astronaut', 'explorer',
  'viking', 'samurai', 'knight', 'ranger', 'mage', 'raven', 'lynx',
  'badger', 'otter', 'gecko', 'lemur', 'koala', 'sloth', 'capybara',
]

export function generateRoomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 900) + 100 // 100–999
  return `${adj} ${noun} ${num}`
}

// Capitalises first letter of each word
function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function generateAnonName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${capitalise(adj)} ${capitalise(noun)}`
}

export function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${capitalise(adj)} ${capitalise(noun)}`
}
