# Deployment Checklist

## Pre-Deployment

- [ ] Add hero image to `assets/hero.jpg`
- [ ] Update social media links in `index.html` footer
- [ ] Set Medium username in `workers/wrangler.toml`
- [ ] Verify YouTube channel handle is correct

## Cloudflare Setup

### KV Namespace
- [ ] Create KV namespace: `wrangler kv:namespace create "CONTENT_KV"`
- [ ] Update namespace ID in `workers/wrangler.toml`

### Secrets
- [ ] Set Resend API key: `wrangler secret put RESEND_API_KEY`
- [ ] Set YouTube API key: `wrangler secret put YOUTUBE_API_KEY`

### Worker Deployment
- [ ] Deploy worker: `cd workers && wrangler deploy`
- [ ] Verify deployment: `curl https://politicswithalex.com/api/health`
- [ ] Test videos endpoint
- [ ] Test posts endpoint

## Resend Configuration

- [ ] Add domain: politicswithalex.com
- [ ] Copy DNS records to Cloudflare
- [ ] Wait for verification (check Resend dashboard)
- [ ] Test email sending

Required DNS Records in Cloudflare:
- [ ] SPF: TXT record with Resend's SPF value
- [ ] DKIM: TXT record with Resend's DKIM value
- [ ] DMARC: TXT record (optional but recommended)

## GitHub Pages Setup

### Repository
- [ ] Create repo: `gh repo create politicswithalex --public`
- [ ] Push code: `git push origin main`

### Pages Configuration
- [ ] Enable GitHub Pages (Settings → Pages)
- [ ] Set source to main branch, / (root)
- [ ] Add custom domain: politicswithalex.com
- [ ] Add CNAME file to repository

### CNAME File
Create file at root:
```
politicswithalex.com
```

Commit and push:
```bash
echo "politicswithalex.com" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

## Cloudflare DNS

Add these records in Cloudflare dashboard:

### GitHub Pages
- [ ] Type: CNAME
- [ ] Name: @ (or www if using www.politicswithalex.com)
- [ ] Target: imdoingsomething.github.io
- [ ] Proxy: ON (orange cloud)

### Worker Route
- [ ] Verify route in Workers & Pages section
- [ ] Pattern: `politicswithalex.com/api/*`
- [ ] Worker: politics-with-alex-api

## YouTube API Setup

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create project or select existing
- [ ] Enable YouTube Data API v3
- [ ] Create API key
- [ ] Restrict key to YouTube Data API v3
- [ ] Add to Cloudflare Worker secrets

## Testing

### Frontend
- [ ] Visit https://politicswithalex.com
- [ ] Verify hero loads with background image
- [ ] Check orbit animation works
- [ ] Test modal opens on click
- [ ] Test responsive layout on mobile

### API Endpoints
- [ ] Health: `curl https://politicswithalex.com/api/health`
- [ ] Videos: `curl https://politicswithalex.com/api/videos`
- [ ] Posts: `curl https://politicswithalex.com/api/posts`

### Forms
- [ ] Test newsletter signup with real email
- [ ] Verify email received at contact@politicswithalex.com
- [ ] Test story submission form
- [ ] Verify submission email received
- [ ] Test rate limiting (try 6 submissions in a row)
- [ ] Test honeypot (fill hidden field, should reject)

### Cross-Browser
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari
- [ ] Mobile Chrome

## Post-Deployment

### Monitoring
- [ ] Set up email forwarding for contact@politicswithalex.com
- [ ] Bookmark Cloudflare dashboard
- [ ] Bookmark Resend dashboard
- [ ] Test worker logs: `wrangler tail politics-with-alex-api`

### Content Updates
- [ ] Add first batch of social media links
- [ ] Verify Medium username is correct
- [ ] Check YouTube videos appear in orbit
- [ ] Verify Medium posts appear (if feed exists)

### Performance
- [ ] Test page load speed (Lighthouse, PageSpeed Insights)
- [ ] Verify caching works (check API response times)
- [ ] Check mobile performance

### Security
- [ ] Verify HTTPS works
- [ ] Test CORS (should only allow politicswithalex.com)
- [ ] Verify honeypot catches bots
- [ ] Test rate limiting

## Launch Checklist

- [ ] All tests passing
- [ ] Forms working
- [ ] Emails delivering
- [ ] Videos loading
- [ ] Mobile responsive
- [ ] Cloudflare WAF configured (if needed)
- [ ] Analytics set up (optional: Cloudflare Analytics, Google Analytics)

## Maintenance

### Regular Tasks
- [ ] Monitor Resend email deliverability
- [ ] Check YouTube API quota usage
- [ ] Review worker logs for errors
- [ ] Update content as needed

### Monthly
- [ ] Review rate limiting thresholds
- [ ] Check for spam submissions
- [ ] Verify API caches are working

## Troubleshooting Commands

```bash
# Check worker logs
wrangler tail politics-with-alex-api --format pretty

# List secrets
wrangler secret list

# View KV keys
wrangler kv:key list --binding=CONTENT_KV

# Clear cache
wrangler kv:key delete youtube_videos --binding=CONTENT_KV
wrangler kv:key delete medium_posts --binding=CONTENT_KV

# Test deployment
curl -v https://politicswithalex.com/api/health
```

## Notes

- DNS propagation can take up to 24 hours
- GitHub Pages deploy can take 1-5 minutes
- Cloudflare Worker deploys are instant
- Resend domain verification can take 5-10 minutes
- YouTube API has quota limits (10,000 units/day)
- Medium RSS updates every 1-2 hours typically

## Success Criteria

✅ Site loads at https://politicswithalex.com
✅ No console errors
✅ Videos appear in orbit
✅ Newsletter signup sends email
✅ Story submission sends email
✅ Mobile layout works correctly
✅ All forms have spam protection
✅ Rate limiting enforced

---

**Deployment Date**: __________
**Deployed By**: __________
**Status**: [ ] Ready [ ] In Progress [ ] Complete
