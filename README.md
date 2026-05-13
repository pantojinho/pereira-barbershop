# Pereira's Barber Shop - Landing Page

**SINCE 2016** | *Good Times, Great People, Quality Cut* | *The Only One*

## 🚀 Quick Start (Local)

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run local server
python server.py
```

Visit: `http://localhost:8000`

## 📦 Project Structure

```
pereira-barbershop/
├── server.py              # FastAPI application
├── requirements.txt       # Python dependencies
├── static/
│   ├── index.html        # Landing page (main)
│   ├── style.css         # Custom styles
│   └── favicon.ico       # Favicon
├── docs/
│   └── deployment.md     # Deployment guide
├── vercel.json           # Vercel deployment config
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🎨 Design System

### Colors
- **Primary Green:** `#2D4B40` (Dark forest green)
- **Background:** `#F8F5ED` (Cream/off-white)
- **Text:** `#1a1a1a` (Dark gray)
- **Accent:** `#4CAF50` (Bright green for CTAs)
- **Secondary:** `#FFD700` (Gold for premium badges)

### Typography
- **Headings:** Classic serif fonts (Playfair Display, Baskerville)
- **Body:** Clean sans-serif (Inter, Roboto)
- **Vintage feel:** All-caps headers with slight letter spacing

## 🌐 Deployment (GitHub → Vercel/Marcelo)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Pereira's Barber Shop landing page"
git branch -M main
git remote add origin https://github.com/pantojinho/pereira-barbershop.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Connect your Vercel account to the GitHub repository
2. Vercel will auto-detect the framework
3. Deploy with default settings
4. Your site will be live at: `https://pereira-barbershop.vercel.app`

### Alternative: Manual Deploy via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```

## 📱 Features

- **Responsive Design:** Mobile-first, works on all devices
- **Fast Loading:** Static HTML/CSS with minimal JavaScript
- **SEO Optimized:** Meta tags, semantic HTML
- **Accessibility:** ARIA labels, keyboard navigation
- **Brand Consistent:** Colors, typography, and identity from the original branding

## 🔧 Configuration

No configuration needed for local development. The app runs with default settings.

For production on Vercel, the `vercel.json` file is pre-configured with:
- Automatic routing for static files
- Proper MIME types
- Rewrite rules for API routes (when backend is added later)

## 📞 Contact Info (for reference)

- **Address:** Rua Eduardo Prado, CEP 13110-090
- **Instagram:** @pereirasbarbershop
- **Founded:** 2016
- **Slogan:** Good Times, Great People, Quality Cut

## 🛠️ Future Enhancements (Phase 2)

- [ ] Backend API (FastAPI routes)
- [ ] Online scheduling system
- [ ] WhatsApp integration
- [ ] Services/pricing page
- [ ] Gallery/portfolio page
- [ ] Contact form
- [ ] Client testimonials

## 📄 License

MIT License - Free to use and modify

---

**THE ONLY ONE** | *PREMIUM SERVICE* | **SINCE 2016**
