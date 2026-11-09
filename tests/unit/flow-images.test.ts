import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FLOW_ERAS } from '@/data/flow/eras'
import { FACE_IMAGES, OPPORTUNITY_FACES, faceImage } from '@/data/flow/images'
import { FLOW_POSTS, VIEWER } from '@/data/flow/posts'

const PUBLIC = join(__dirname, '../../public')
const posts = Object.values(FLOW_POSTS).flat()

/**
 * Every avatar key the feed can ask for: post and comment authors, the
 * viewer, and the people in each era's pinned pieces (notifications, friend
 * lists, suggestions, chat heads). A row's `face` wins over its name, as in
 * `Avatar`.
 */
function avatarKeys(): Set<string> {
  const keys = new Set<string>()
  for (const v of Object.values(VIEWER)) keys.add(v.face ?? v.name)
  for (const p of posts) {
    if (p.chat) keys.add(OPPORTUNITY_FACES[p.chat.name] ?? p.chat.name)
    for (const a of [p.author, ...(p.comments ?? []).map((c) => c.author)]) keys.add(a.face ?? a.name)
  }
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    const face = typeof o.face === 'string' ? o.face : undefined
    const name = typeof o.name === 'string' ? o.name : typeof o.from === 'string' ? o.from : undefined
    if (face ?? name) keys.add((face ?? name)!)
    if (Array.isArray(o.names)) for (const n of o.names) if (typeof n === 'string') keys.add(n)
    Object.values(o).forEach(walk)
  }
  walk(FLOW_ERAS)
  return keys
}

/** Every non-avatar image the feed shows, as [where, src]. */
function feedImageSrcs(): (readonly [string, string])[] {
  const out: (readonly [string, string])[] = []
  for (const p of posts) {
    for (const photo of p.media?.photos ?? []) out.push([`${p.id}:album ${photo.alt}`, photo.src])
    if (p.media?.src) out.push([`${p.id}:media`, p.media.src])
    if (p.media?.animatedSrc) out.push([`${p.id}:animation`, p.media.animatedSrc])
    if (p.link?.src) out.push([`${p.id}:link`, p.link.src])
    for (const r of p.reels?.items ?? []) if (r.src) out.push([`${p.id}:reel ${r.author}`, r.src])
  }
  for (const era of FLOW_ERAS) {
    if (era.platform.kind === 'ad' && era.platform.src) out.push([`${era.id}:ad`, era.platform.src])
  }
  return out
}

describe('feed images', () => {
  it('every face image file exists under /public', () => {
    for (const [key, { src }] of Object.entries(FACE_IMAGES)) {
      expect(existsSync(join(PUBLIC, src)), `${key} → ${src}`).toBe(true)
    }
  })

  it('every feed image src exists under /public', () => {
    const srcs = feedImageSrcs()
    expect(srcs.length).toBeGreaterThan(0)
    for (const [where, src] of srcs) expect(existsSync(join(PUBLIC, src)), `${where} → ${src}`).toBe(true)
  })

  it('every file in /assets/posts is used somewhere in the feed', () => {
    const used = new Set(feedImageSrcs().map(([, src]) => src))
    for (const file of readdirSync(join(PUBLIC, 'assets/posts'))) {
      if (file.startsWith('.')) continue
      expect(used.has(`/assets/posts/${file}`), file).toBe(true)
    }
  })

  it('every post with media in a styled era has a real image', () => {
    // The machine era draws its posts as wireframes, so its media stays empty.
    const missing = posts.filter((p) => p.media && !p.media.src && p.era !== 'machine').map((p) => p.id)
    expect(missing).toEqual([])
  })

  it('every face image key is one the feed actually asks for', () => {
    const used = avatarKeys()
    for (const key of Object.keys(FACE_IMAGES)) expect(used.has(key), key).toBe(true)
  })

  it('every file in /assets/avatars is used by some face', () => {
    const srcs = new Set(Object.values(FACE_IMAGES).map((f) => f.src))
    for (const file of readdirSync(join(PUBLIC, 'assets/avatars'))) {
      if (file.startsWith('.')) continue
      expect(srcs.has(`/assets/avatars/${file}`), file).toBe(true)
    }
  })

  it('gives Ashley a real photo in every era', () => {
    for (const viewer of Object.values(VIEWER)) expect(faceImage(viewer), viewer.face).toBeDefined()
  })
})
