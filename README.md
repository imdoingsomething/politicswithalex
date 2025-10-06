# Politics With Alex

A one-page website for Politics With Alex, featuring video content, articles, newsletter signup, and story submission form.

## Architecture

### Frontend
- **Hosting**: GitHub Pages
- **Domain**: politicswithalex.com (via Cloudflare)
- **Stack**: Vanilla HTML/CSS/JavaScript

### Backend
- **Cloudflare Worker**: `politics-with-alex-api`
- **Email Service**: Resend API
- **Content APIs**: YouTube Data API v3, Medium RSS

## Project Structure

```
politicswithalex/
├── index.html              # Main website
├── styles.css              # All styles
├── script.js               # Frontend JavaScript
├── assets/
│   └── hero.jpg           # Hero background image (add this)
├── workers/
│   ├── api-worker.js      # Cloudflare Worker for all API endpoints
│   └── wrangler.toml      # Worker configuration
├── .gitignore
└── README.md
```

## API Endpoints

### GET /api/videos
Returns latest YouTube videos from @politicswithalex channel.

### GET /api/posts
Returns latest Medium posts (RSS feed).

### POST /api/subscribe
Newsletter signup - sends email via Resend to contact@politicswithalex.com.

### POST /api/submit
Story submission form - sends email via Resend with rate limiting and honeypot protection.

## Setup Instructions

### 1. Create GitHub Repository

```bash
cd politicswithalex
git add .
git commit -m "Initial commit: Politics With Alex website"
gh repo create politicswithalex --public --source=. --remote=origin --push
```

### 2. Enable GitHub Pages

```bash
gh repo edit --enable-pages --pages-branch=main
```

Or manually:
1. Go to repository Settings → Pages
2. Source: Deploy from branch → main → / (root)
3. Save

### 3. Add Hero Image

Place your hero background image at `assets/hero.jpg` (recommended size: 1920x1080px).

### 4. Create Cloudflare KV Namespace

```bash
cd workers
wrangler kv:namespace create "CONTENT_KV"
```

Copy the returned namespace ID and update `workers/wrangler.toml`:
```toml
kv_namespaces = [
    { binding = "CONTENT_KV", id = "PASTE_YOUR_ID_HERE" }
]
```

### 5. Set Cloudflare Secrets

```bash
cd workers

# Resend API key
wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted

# YouTube Data API key
wrangler secret put YOUTUBE_API_KEY
# Paste your YouTube API key when prompted
```

### 6. Deploy Cloudflare Worker

```bash
cd workers
wrangler deploy
```

### 7. Configure Cloudflare DNS

In your Cloudflare dashboard for politicswithalex.com:

1. **Add GitHub Pages CNAME**:
   - Type: CNAME
   - Name: @ (or www)
   - Target: imdoingsomething.github.io
   - Proxy: ON (orange cloud)

2. **Add custom domain to GitHub Pages**:
   ```bash
   echo "politicswithalex.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

3. **Verify Worker Routes**:
   - In Cloudflare dashboard → Workers & Pages → politics-with-alex-api
   - Ensure route is set to: `politicswithalex.com/api/*`

### 8. Configure Resend

1. Log in to Resend dashboard
2. Add domain: politicswithalex.com
3. Add DNS records to Cloudflare (Resend will provide):
   - SPF record
   - DKIM record
   - DMARC record (optional)
4. Verify domain in Resend

### 9. Set up YouTube Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create API key (Credentials → Create Credentials → API Key)
5. Restrict key to YouTube Data API v3
6. Add key to Cloudflare Worker secrets (done in step 5)

## Deployment

### Frontend Updates
```bash
git add .
git commit -m "Update site"
git push
```
GitHub Pages automatically deploys from main branch.

### Worker Updates
```bash
cd workers
wrangler deploy
```

## Testing

### Health Check
```bash
curl https://politicswithalex.com/api/health
```
Expected: `{"ok":true,"service":"politics-with-alex","timestamp":...}`

### Videos Endpoint
```bash
curl https://politicswithalex.com/api/videos
```

### Posts Endpoint
```bash
curl https://politicswithalex.com/api/posts
```

### Newsletter Signup
```bash
curl -X POST https://politicswithalex.com/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Story Submission
```bash
curl -X POST https://politicswithalex.com/api/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test message"}'
```

## Features

- **Orbit Animation**: Videos and posts orbit around center logo
- **Video Modal**: Click to watch YouTube videos in embedded player
- **Newsletter Signup**: Email collection via Resend
- **Story Submission**: Contact form with honeypot protection and rate limiting
- **Responsive Design**: Mobile-friendly layout
- **Accessibility**: ARIA labels, skip links, keyboard navigation
- **Performance**: Cached API responses, preloaded hero image

## Security

- Rate limiting: 5 requests/hour per IP for forms
- Honeypot fields for spam protection
- HTML escaping on all user input
- CORS restricted to politicswithalex.com
- Email validation on both frontend and backend

## Monitoring

View Cloudflare Worker logs:
```bash
wrangler tail politics-with-alex-api --format pretty
```

## Environment Variables & Secrets

### Cloudflare Worker Secrets (set via wrangler secret put)
- `RESEND_API_KEY`: Resend API key
- `YOUTUBE_API_KEY`: YouTube Data API v3 key

### wrangler.toml Variables
- `MEDIUM_USERNAME`: Medium username (default: politicswithalex)

## Troubleshooting

### Videos not loading
1. Check YouTube API quota (10,000 units/day)
2. Verify channel handle `@politicswithalex` exists
3. Check worker logs: `wrangler tail politics-with-alex-api`

### Forms not working
1. Verify Resend domain is verified
2. Check worker secrets are set: `wrangler secret list`
3. Verify CORS headers allow your domain
4. Check rate limits in KV namespace

### Custom domain not working
1. Verify CNAME record points to imdoingsomething.github.io
2. Ensure DNS is proxied (orange cloud)
3. Check GitHub Pages custom domain setting
4. Wait for DNS propagation (up to 24 hours)

## License

Copyright © 2025 Politics With Alex. All rights reserved.

## Contact

- Website: https://politicswithalex.com
- Email: contact@politicswithalex.com
