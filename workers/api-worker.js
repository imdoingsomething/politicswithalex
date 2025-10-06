// Politics With Alex - API Worker
// Handles: /api/videos, /api/posts, /api/subscribe, /api/submit

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers for all responses
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // Route handling
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, service: 'politics-with-alex', timestamp: Date.now() });
    }

    if (url.pathname === '/api/videos' && request.method === 'GET') {
      return handleVideos(env, ctx);
    }

    if (url.pathname === '/api/posts' && request.method === 'GET') {
      return handlePosts(env, ctx);
    }

    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }

    if (url.pathname === '/api/submit' && request.method === 'POST') {
      return handleSubmit(request, env);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  }
};

// ============ YouTube Videos ============
async function handleVideos(env, ctx) {
  try {
    // Check cache first
    const cacheKey = 'youtube_videos';
    const cached = await env.CONTENT_KV?.get(cacheKey, 'json');
    if (cached) {
      return json({ items: cached });
    }

    // Fetch from YouTube Data API
    const YOUTUBE_API_KEY = env.YOUTUBE_API_KEY;
    const CHANNEL_HANDLE = '@politicswithalex';

    // First, resolve the channel handle to channel ID
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${CHANNEL_HANDLE}&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      return json({ items: [] });
    }

    const channelId = searchData.items[0].id.channelId;

    // Get latest videos from the channel
    const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=6&order=date&type=video&key=${YOUTUBE_API_KEY}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();

    const items = (videosData.items || []).map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumb: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      published: item.snippet.publishedAt
    }));

    // Cache for 1 hour
    ctx.waitUntil(env.CONTENT_KV?.put(cacheKey, JSON.stringify(items), { expirationTtl: 3600 }));

    return json({ items });
  } catch (err) {
    console.error('YouTube API error:', err);
    return json({ items: [] });
  }
}

// ============ Medium Posts ============
async function handlePosts(env, ctx) {
  try {
    // Check cache first
    const cacheKey = 'medium_posts';
    const cached = await env.CONTENT_KV?.get(cacheKey, 'json');
    if (cached) {
      return json({ items: cached });
    }

    // Fetch Medium RSS feed
    // Replace with actual Medium username
    const MEDIUM_USERNAME = env.MEDIUM_USERNAME || 'politicswithalex';
    const rssUrl = `https://medium.com/feed/@${MEDIUM_USERNAME}`;

    const rssRes = await fetch(rssUrl);
    const rssText = await rssRes.text();

    // Parse RSS (simple regex-based parser for Worker environment)
    const items = parseRSS(rssText);

    // Cache for 1 hour
    ctx.waitUntil(env.CONTENT_KV?.put(cacheKey, JSON.stringify(items), { expirationTtl: 3600 }));

    return json({ items });
  } catch (err) {
    console.error('Medium RSS error:', err);
    return json({ items: [] });
  }
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
    const itemXml = match[1];

    const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(itemXml);
    const linkMatch = /<link>(.*?)<\/link>/.exec(itemXml);
    const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemXml);
    const guidMatch = /<guid.*?>(.*?)<\/guid>/.exec(itemXml);

    // Try to extract image from content:encoded
    const contentMatch = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/.exec(itemXml);
    let image = '';
    if (contentMatch) {
      const imgMatch = /<img[^>]+src="([^">]+)"/.exec(contentMatch[1]);
      if (imgMatch) image = imgMatch[1];
    }

    if (titleMatch && linkMatch) {
      items.push({
        id: guidMatch ? guidMatch[1].split('/').pop() : `post-${items.length}`,
        title: titleMatch[1],
        url: linkMatch[1],
        image: image,
        published: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : '',
        excerpt: '' // Could extract from description if needed
      });
    }
  }

  return items;
}

// ============ Newsletter Subscribe ============
async function handleSubscribe(request, env) {
  try {
    const body = await request.json();
    const email = (body.email || '').toString().trim();
    const hp = (body.hp || '').toString();

    // Honeypot check
    if (hp) {
      return json({ ok: false, error: 'Invalid submission' }, 400);
    }

    // Email validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: 'Invalid email' }, 400);
    }

    // Rate limiting (5 requests per hour per IP)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rl:subscribe:${ip}`;
    const rateLimitCount = parseInt(await env.CONTENT_KV?.get(rateLimitKey) || '0');

    if (rateLimitCount >= 5) {
      return json({ ok: false, error: 'Too many requests. Try again later.' }, 429);
    }

    // Send email via Resend
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Politics With Alex <no-reply@politicswithalex.com>',
        to: ['contact@politicswithalex.com'],
        subject: 'New Newsletter Signup',
        html: `<p><strong>New newsletter signup:</strong></p><p>${escapeHtml(email)}</p>`
      })
    });

    if (!resendRes.ok) {
      const error = await resendRes.text();
      console.error('Resend error:', error);
      return json({ ok: false, error: 'Failed to subscribe' }, 500);
    }

    // Update rate limit
    await env.CONTENT_KV?.put(rateLimitKey, (rateLimitCount + 1).toString(), { expirationTtl: 3600 });

    return json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return json({ ok: false, error: 'Invalid request' }, 400);
  }
}

// ============ Submit Story ============
async function handleSubmit(request, env) {
  try {
    const body = await request.json();
    const name = (body.name || '').toString().slice(0, 120);
    const email = (body.email || '').toString().slice(0, 200);
    const subject = (body.subject || '').toString().slice(0, 200);
    const message = (body.message || '').toString().slice(0, 8000);
    const hp = (body.hp || '').toString();

    // Honeypot check
    if (hp) {
      return json({ ok: false, error: 'Invalid submission' }, 400);
    }

    // Validation
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: 'Invalid email' }, 400);
    }
    if (!subject || !message) {
      return json({ ok: false, error: 'Missing required fields' }, 400);
    }

    // Rate limiting (5 requests per hour per IP)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rl:submit:${ip}`;
    const rateLimitCount = parseInt(await env.CONTENT_KV?.get(rateLimitKey) || '0');

    if (rateLimitCount >= 5) {
      return json({ ok: false, error: 'Too many requests. Try again later.' }, 429);
    }

    // Send via Resend
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Politics With Alex <no-reply@politicswithalex.com>',
        to: ['contact@politicswithalex.com'],
        replyTo: email,
        subject: `Story Submission: ${subject}`,
        html: `
          <h2>New Story Submission</h2>
          <p><strong>From:</strong> ${escapeHtml(name || 'Anonymous')} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr>
          <p><strong>Message:</strong></p>
          <pre style="white-space: pre-wrap;">${escapeHtml(message)}</pre>
          <hr>
          <p><small>Submitted via politicswithalex.com</small></p>
        `
      })
    });

    if (!resendRes.ok) {
      const error = await resendRes.text();
      console.error('Resend error:', error);
      return json({ ok: false, error: 'Failed to send message' }, 500);
    }

    // Update rate limit
    await env.CONTENT_KV?.put(rateLimitKey, (rateLimitCount + 1).toString(), { expirationTtl: 3600 });

    return json({ ok: true });
  } catch (err) {
    console.error('Submit error:', err);
    return json({ ok: false, error: 'Invalid request' }, 400);
  }
}

// ============ Helpers ============
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://politicswithalex.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
