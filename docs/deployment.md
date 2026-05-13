# Deployment Guide - Pereira's Barber Shop

## 📋 Overview

This document provides step-by-step instructions for deploying the Pereira's Barber Shop landing page to Vercel (formerly known as Marcelo) via GitHub.

## 🎯 Prerequisites

- GitHub account
- Vercel account (free tier available)
- Git installed on your local machine
- Basic knowledge of Git commands

## 🚀 Deployment Steps

### Phase 1: Prepare GitHub Repository

#### 1.1 Initialize Git Repository

```bash
cd /home/pantojinho/pereira-barbershop

# Initialize Git repository
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Pereira's Barber Shop landing page with vintage design"

# Set main branch
git branch -M main
```

#### 1.2 Create GitHub Repository

**Option A: Via GitHub Website**
1. Go to https://github.com/new
2. Repository name: `pereira-barbershop`
3. Description: "Pereira's Barber Shop landing page - Good Times, Great People, Quality Cut"
4. Make it **Public** (recommended for Vercel free tier)
5. Click "Create repository"
6. Copy the repository URL: `https://github.com/USERNAME/pereira-barbershop.git`

**Option B: Via GitHub CLI**
```bash
gh repo create pereira-barbershop --public --description "Pereira's Barber Shop landing page - Good Times, Great People, Quality Cut"
```

#### 1.3 Push to GitHub

```bash
# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/pantojinho/pereira-barbershop.git

# Push to GitHub
git push -u origin main
```

### Phase 2: Deploy to Vercel

#### 2.1 Sign Up/Login to Vercel

1. Go to https://vercel.com
2. Sign up or login with your GitHub account
3. Authorize Vercel to access your GitHub repositories

#### 2.2 Import Project

1. Click "Add New..." → "Project"
2. Vercel will scan your GitHub repositories
3. Find and click `pereira-barbershop`
4. Configure the project:

**Framework Preset:** Python (automatically detected)
**Root Directory:** `./` (default)
**Build Command:** (leave empty)
**Output Directory:** `.`

5. Click **"Deploy"**

#### 2.3 Wait for Deployment

- Vercel will automatically build and deploy your site
- This typically takes 1-3 minutes
- You'll see the live URL when deployment is complete
- Example: `https://pereira-barbershop.vercel.app`

### Phase 3: Configure Custom Domain (Optional)

#### 3.1 Add Custom Domain

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Enter your custom domain: `pereirabarbershop.com.br`
4. Follow Vercel's DNS configuration instructions

#### 3.2 Update DNS Records

If you own the domain, add these DNS records:

**A Record:**
- Name: `@`
- Value: `76.76.21.21` (Vercel's IP)

**CNAME Record:**
- Name: `www`
- Value: `cname.vercel-dns.com`

## 🛠️ Alternative Deployment Methods

### Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts (all defaults work)
```

### Deploy via GitHub Actions

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 📊 Environment Variables

For this landing page, no environment variables are required. If you add backend features later, you can configure them in Vercel:

1. Go to Project → Settings → Environment Variables
2. Add variables as needed

## 🔧 Troubleshooting

### Common Issues

**Issue: Build fails**
- Check `vercel.json` configuration
- Verify `requirements.txt` includes all dependencies
- Check Vercel build logs for errors

**Issue: Static files not loading**
- Verify paths in `index.html` are correct (`/static/...`)
- Check `vercel.json` routes configuration

**Issue: Port 8000 not accessible**
- Vercel handles routing automatically
- No need to specify ports in production

**Issue: Custom domain not working**
- DNS propagation takes 24-48 hours
- Verify DNS records match Vercel instructions
- Check domain registrar settings

### Useful Commands

```bash
# Test local server
python server.py
# Visit: http://localhost:8000

# Check deployment logs
vercel logs

# Re-deploy latest commit
vercel --prod

# Preview deployment
vercel
```

## 📝 Post-Deployment Checklist

- [ ] Test the live site on desktop browsers
- [ ] Test on mobile devices
- [ ] Verify all links work
- [ ] Check contact information is correct
- [ ] Test QR code (if implemented)
- [ ] Set up Google Analytics (optional)
- [ ] Submit to Google Search Console (optional)
- [ ] Configure custom domain (optional)

## 🔄 Updating the Site

### Make Changes

```bash
# Make changes to files
nano static/index.html
# or
nano static/style.css

# Stage changes
git add .

# Commit changes
git commit -m "Update: Added new feature"

# Push to GitHub
git push
```

### Vercel Auto-Deployment

- Vercel will automatically detect the push
- New deployment will be created
- Site updates live automatically (1-2 minutes)

## 📈 Performance Optimization

The site is already optimized:
- Minimal JavaScript (none currently)
- Optimized CSS (single file)
- Responsive design
- Fast loading times

For further optimization:
- Compress images (use WebP format)
- Enable Vercel Analytics
- Implement CDN caching (Vercel does this automatically)

## 🔒 Security Best Practices

- Keep API keys in environment variables (not in code)
- Use HTTPS (Vercel provides this automatically)
- Regularly update dependencies
- Monitor Vercel build logs for warnings

## 📞 Support

If you encounter issues:
1. Check Vercel documentation: https://vercel.com/docs
2. Review build logs in Vercel dashboard
3. Test locally first: `python server.py`
4. Contact Gabriel/Pantojo for assistance

## ✅ Success Criteria

Your deployment is successful when:
- [ ] Site loads without errors
- [ ] All content displays correctly
- [ ] Responsive design works on mobile
- [ ] Contact information is accurate
- [ ] Performance is good (< 3s load time)
- [ ] HTTPS is enabled
- [ ] Custom domain (if configured) works

---

**Next Steps:**
1. Follow Phase 1 to push to GitHub
2. Follow Phase 2 to deploy to Vercel
3. Test thoroughly on live site
4. Share the URL with stakeholders

**Good luck!** 🚀
