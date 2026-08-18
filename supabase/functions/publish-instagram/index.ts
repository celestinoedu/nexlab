import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

type InstagramPost = {
  id: string
  slug: string
  caption: string
  alt_text: string | null
  media_type: 'image' | 'carousel'
  media_urls: string[]
  attempt_count: number
  meta_container_id: string | null
}

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`)
  return value
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const cronSecret = requiredEnv('INSTAGRAM_CRON_SECRET')
    if (request.headers.get('x-cron-secret') !== cronSecret) return json({ error: 'Unauthorized' }, 401)

    const body = await request.json().catch(() => ({})) as { action?: string }
    if (body.action === 'validate') {
      const expectedId = requiredEnv('INSTAGRAM_USER_ID')
      const profile = await graphGet(expectedId, 'id,username')
      return json({
        ok: true,
        userId: String(profile.id),
        username: profile.username,
        configuredIdMatches: String(profile.id) === expectedId,
      })
    }

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    if (body.action === 'sync_manifest') {
      const manifestUrl = 'https://lotusnegocios.com/nexlab/social/generated/manifest.json'
      const response = await fetch(manifestUrl)
      if (!response.ok) throw new Error(`Manifesto de conteúdo indisponível: HTTP ${response.status}`)

      const manifest = await response.json() as Array<{
        slug: string
        scheduledAt: string
        format: 'image' | 'carousel'
        caption: string
        files: string[]
      }>
      if (!Array.isArray(manifest) || manifest.length === 0 || manifest.length > 30) {
        throw new Error('Manifesto de conteúdo inválido.')
      }

      const mediaBaseUrl = new URL('./', manifestUrl)
      const posts = manifest.map((item) => {
        if (!/^[a-z0-9-]+$/.test(item.slug) || !item.caption || !['image', 'carousel'].includes(item.format)) {
          throw new Error(`Item inválido no manifesto: ${item.slug ?? 'sem slug'}`)
        }
        const mediaUrls = item.files.map((file) => new URL(file, mediaBaseUrl).toString())
        return {
          slug: item.slug,
          caption: item.caption,
          alt_text: null,
          media_type: item.format,
          media_urls: mediaUrls,
          scheduled_at: item.scheduledAt,
          status: 'draft',
        }
      })

      const { error } = await supabase
        .from('instagram_publicacoes')
        .upsert(posts, { onConflict: 'slug', ignoreDuplicates: true })
      if (error) throw error
      return json({ ok: true, imported: posts.length, status: 'draft' })
    }

    if (body.action === 'activate_campaign') {
      const startAt = new Date('2026-08-18T19:30:00.000Z')
      const { data: campaign, error: campaignError } = await supabase
        .from('instagram_publicacoes')
        .select('id,slug,status')
        .order('slug')
      if (campaignError) throw campaignError

      const eligible = (campaign ?? []).filter((post) => post.status === 'draft' || post.status === 'scheduled')
      for (const [index, post] of eligible.entries()) {
        const scheduledAt = new Date(startAt.getTime() + index * 24 * 60 * 60_000).toISOString()
        const { error } = await supabase
          .from('instagram_publicacoes')
          .update({ status: 'scheduled', scheduled_at: scheduledAt, last_error: null })
          .eq('id', post.id)
        if (error) throw error
      }
      return json({ ok: true, scheduled: eligible.length, startsAt: startAt.toISOString(), cadence: 'daily' })
    }

    const { data, error } = await supabase.rpc('claim_due_instagram_posts', { batch_size: 3 })
    if (error) throw error

    const results = []
    for (const post of (data ?? []) as InstagramPost[]) {
      try {
        const published = await publishPost(post, supabase)
        results.push({ slug: post.slug, status: 'published', ...published })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const retry = post.attempt_count < 3
        await supabase
          .from('instagram_publicacoes')
          .update({
            status: retry ? 'scheduled' : 'failed',
            scheduled_at: retry ? new Date(Date.now() + 15 * 60_000).toISOString() : undefined,
            last_error: message.slice(0, 4000),
          })
          .eq('id', post.id)
        results.push({ slug: post.slug, status: retry ? 'retry_scheduled' : 'failed', error: message })
      }
    }

    return json({ processed: results.length, results })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json({ error: message }, 500)
  }
})

async function publishPost(post: InstagramPost, supabase: ReturnType<typeof createClient>) {
  const instagramUserId = requiredEnv('INSTAGRAM_USER_ID')
  let containerId = post.meta_container_id

  if (!containerId) {
    if (post.media_type === 'image') {
      const container = await graphPost(`${instagramUserId}/media`, {
        image_url: post.media_urls[0],
        caption: post.caption,
        ...(post.alt_text ? { alt_text: post.alt_text } : {}),
      })
      containerId = container.id
    } else {
      const children = []
      for (const mediaUrl of post.media_urls) {
        const item = await graphPost(`${instagramUserId}/media`, {
          image_url: mediaUrl,
          is_carousel_item: 'true',
        })
        await waitUntilReady(item.id)
        children.push(item.id)
      }
      const container = await graphPost(`${instagramUserId}/media`, {
        media_type: 'CAROUSEL',
        caption: post.caption,
        children: children.join(','),
      })
      containerId = container.id
    }

    const { error } = await supabase
      .from('instagram_publicacoes')
      .update({ meta_container_id: containerId })
      .eq('id', post.id)
    if (error) throw error
  }

  const status = await waitUntilReady(containerId)
  if (status === 'PUBLISHED') {
    await markPublished(supabase, post.id, null, null)
    return { containerId, resumed: true }
  }

  const publication = await graphPost(`${instagramUserId}/media_publish`, { creation_id: containerId })
  let permalink: string | null = null
  try {
    const media = await graphGet(publication.id, 'permalink')
    permalink = media.permalink ?? null
  } catch {
    // O post já foi publicado; uma falha secundária ao buscar o permalink não
    // deve transformar a publicação em erro nem provocar duplicidade.
  }
  await markPublished(supabase, post.id, publication.id, permalink)
  return { containerId, mediaId: publication.id, permalink }
}

async function markPublished(
  supabase: ReturnType<typeof createClient>,
  id: string,
  mediaId: string | null,
  permalink: string | null,
) {
  const { error } = await supabase
    .from('instagram_publicacoes')
    .update({
      status: 'published',
      meta_media_id: mediaId,
      meta_permalink: permalink,
      published_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', id)
  if (error) throw error
}

async function waitUntilReady(containerId: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await graphGet(containerId, 'status_code,status')
    if (result.status_code === 'FINISHED' || result.status_code === 'PUBLISHED') return result.status_code as string
    if (result.status_code === 'ERROR' || result.status_code === 'EXPIRED') {
      throw new Error(`Container ${containerId}: ${result.status ?? result.status_code}`)
    }
    await sleep(2_500)
  }
  throw new Error(`Container ${containerId} não ficou pronto dentro do limite da execução.`)
}

async function graphPost(path: string, fields: Record<string, string>) {
  const response = await fetch(graphUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, access_token: requiredEnv('INSTAGRAM_ACCESS_TOKEN') }),
  })
  return graphResponse(response)
}

async function graphGet(path: string, fields: string) {
  const url = new URL(graphUrl(path))
  url.searchParams.set('fields', fields)
  url.searchParams.set('access_token', requiredEnv('INSTAGRAM_ACCESS_TOKEN'))
  return graphResponse(await fetch(url))
}

function graphUrl(path: string) {
  const base = Deno.env.get('META_GRAPH_BASE_URL') ?? 'https://graph.instagram.com'
  const version = requiredEnv('META_GRAPH_API_VERSION')
  return `${base.replace(/\/$/, '')}/${version}/${path}`
}

async function graphResponse(response: Response) {
  const payload = await response.json()
  if (!response.ok || payload.error) {
    const detail = payload.error?.error_user_msg ?? payload.error?.message ?? JSON.stringify(payload)
    throw new Error(`Meta API ${response.status}: ${detail}`)
  }
  return payload
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
