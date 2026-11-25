import { clips, type Angle, type ClipId, type Figure, type Side } from './clips'
const names: [ClipId, RegExp][] = [
  ['push-up', /\b(?:push|press)[ -]?ups?\b/],
  ['supine-hamstring', /\bhamstrings?\b/],
  ['sciatic-slider-seated', /\bsciatic\b/],
  ['squat', /\bsquats?\b/],
  ['curl', /\bcurls?\b/],
  ['wheel', /\b(?:backbend|wheel pose|bridge hold)\b/],
  ['moonwalk', /\bmoonwalk\b/],
  ['cartwheel', /\bcartwheels?\b/],
]
const words = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const phrases = Object.entries(clips)
  .flatMap(([key, clip]) =>
    [...new Set([words(key), words(clip.name)])].map((name) => ({ id: key as ClipId, name })),
  )
  .sort((a, b) => b.name.length - a.name.length)
function matchClips(text: string) {
  const selected = new Set<ClipId>()
  let remaining = ' ' + words(text) + ' '
  for (const { id, name } of phrases) {
    const match = ' ' + name + ' '
    if (remaining.includes(match)) {
      selected.add(id)
      remaining = remaining.replace(match, '  ')
    }
  }
  for (const [id, pattern] of names) if (pattern.test(remaining)) selected.add(id)
  return [...selected]
}
export function interpretRequest(input: string, current: ClipId) {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[‐‑–—]/g, '-')
  const matches = matchClips(s)
  if (matches.length > 1) throw Error('Choose one movement per take.')
  const skin = /\b(?:human|clothed|person)\b/.test(s),
    bones = /\b(?:skeleton|bones|anatomy)\b/.test(s),
    highlight = /glow|highlight|activat|working muscle/.test(s)
  const figure: Figure | undefined =
    (skin && bones) || /side[ -]by[ -]side|both (?:figures|views)/.test(s)
      ? 'pair'
      : skin
        ? 'human'
        : highlight || /\banatomy\b/.test(s)
          ? 'anatomy'
          : bones
            ? 'bones'
            : undefined
  const side: Side | undefined = /\b(?:right|left)\b/.exec(s)?.[0] as Side | undefined
  const angle: Angle | undefined = /from overhead|overhead view|overhead camera|from above/.test(s)
    ? 'Overhead'
    : /from (?:the )?side|side view/.test(s)
      ? 'Side'
      : /front view|from (?:the )?front/.test(s)
        ? 'Front'
        : /back view|from behind/.test(s)
          ? 'Back'
          : undefined
  if (!matches.length && !/\bsame\b|\bcurrent\b/.test(s))
    throw Error(
      'Try a listed movement, or choose Custom movement to build a new one with joint cues.',
    )
  return { clip: matches[0] ?? current, figure, side, angle }
}
