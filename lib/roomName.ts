// Gentle, fireside words: small creatures you might find near a campfire.
const ADJECTIVES = [
  'sleepy', 'quiet', 'gentle', 'mossy', 'cozy', 'drowsy', 'patient', 'humble',
  'fuzzy', 'snug', 'woolly', 'dreamy', 'misty', 'mellow', 'tidy', 'curious',
  'little', 'wandering', 'thoughtful', 'bashful', 'steady', 'warm', 'dusky',
  'velvet', 'scruffy', 'sloppy', 'rosy', 'soft', 'amber', 'hushed',
]

const NOUNS = [
  'otter', 'fox', 'owl', 'wren', 'hedgehog', 'badger', 'snail', 'moth',
  'heron', 'hare', 'mole', 'finch', 'toad', 'beaver', 'marten', 'raccoon',
  'robin', 'sparrow', 'deer', 'bear', 'newt', 'vole', 'lark', 'crane',
  'tortoise', 'dormouse', 'squirrel', 'puffin', 'lynx', 'moose',
]

type Random = () => number

const pick = <T,>(list: readonly T[], random: Random) =>
  list[Math.floor(random() * list.length) % list.length]

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "Sleepy Otter". Pass `random` for a reproducible name. */
export function generateAnonName(random: Random = Math.random): string {
  return `${capitalise(pick(ADJECTIVES, random))} ${capitalise(pick(NOUNS, random))}`
}

/** v1 alias. */
export const generateUsername = generateAnonName

/** v1 room names: "sleepy otter 482". */
export function generateRoomName(random: Random = Math.random): string {
  const num = Math.floor(random() * 900) + 100
  return `${pick(ADJECTIVES, random)} ${pick(NOUNS, random)} ${num}`
}

/**
 * What an unnamed Bonfire is called: "Quiet Fox's fire".
 * Derived from the initiator's name, never stored, so it cannot drift
 * from the Bonfire's real settings and a chosen Bonfire name replaces it.
 */
export function fireName(initiatorName: string | null | undefined): string {
  const who = (initiatorName ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
  return who ? `${who}'s fire` : 'A bonfire'
}

/** The Bonfire name if it has one, otherwise the derived fire name. */
export function bonfireTitle(state: { name: string | null; initiator_name: string | null }): string {
  const name = state.name?.trim()
  return name ? name : fireName(state.initiator_name)
}
