# Next.js Integration Guide: RealWebWins 2.0 Landing Page

This guide walks you through integrating the landing page into your Next.js 15 (App Router) project.

---

## 📋 Prerequisites

- Next.js 15+ with App Router
- Tailwind CSS 4+ configured
- TypeScript (recommended)

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Replace Home Page

```bash
# 1. Copy the HTML content
cp landing-page-v2.html src/app/page.tsx

# 2. Convert HTML to JSX (replace className, remove closing slashes, etc.)

# 3. Test
npm run dev
```

### Option 2: Create Dedicated Marketing Page

```bash
# Create new route
mkdir -p src/app/(marketing)
touch src/app/(marketing)/page.tsx
```

---

## 📂 Recommended File Structure

```
src/
├── app/
│   ├── (marketing)/              # Marketing site route group
│   │   ├── layout.tsx             # Marketing-specific layout
│   │   ├── page.tsx               # Landing page (home)
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── deliverables/
│   │   │   └── page.tsx
│   │   └── showcase/
│   │       └── page.tsx
│   ├── (app)/                     # App route group (dashboard, studio)
│   │   └── ...existing app routes
│   └── layout.tsx                 # Root layout
├── components/
│   ├── landing/                   # Landing page components
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── ChatTheaterPreview.tsx
│   │   ├── Deliverables.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Pricing.tsx
│   │   ├── FAQ.tsx
│   │   └── FinalCTA.tsx
│   └── ui/                        # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── GradientText.tsx
└── styles/
    └── landing.css                # Landing-specific styles
```

---

## 🎨 Step 1: Configure Tailwind

### Update `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6ff',
          300: '#a4b9ff',
          400: '#8196ff',
          500: '#6b7aff',
          600: '#5558ff',
          700: '#4742e8',
          800: '#3a36bc',
          900: '#323395',
          950: '#0a0a1f',
        },
        neon: {
          blue: '#00e5ff',
          purple: '#b24bf3',
          pink: '#ff2e97',
          green: '#00ff94',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-cabinet)', 'var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
```

---

## ✏️ Step 2: Set Up Fonts

### Update `src/app/layout.tsx`

```tsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-midnight-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
```

---

## 🎭 Step 3: Add Custom Styles

### Create `src/styles/landing.css`

```css
@layer utilities {
  .gradient-text {
    background: linear-gradient(135deg, #00e5ff 0%, #b24bf3 50%, #ff2e97 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .glow-neon-blue {
    box-shadow: 0 0 20px rgba(0, 229, 255, 0.5), 0 0 40px rgba(0, 229, 255, 0.3);
  }

  .glow-neon-purple {
    box-shadow: 0 0 20px rgba(178, 75, 243, 0.5), 0 0 40px rgba(178, 75, 243, 0.3);
  }
}

@layer components {
  .agent-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .float {
    animation: float 3s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .7; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

### Import in `globals.css`

```css
@import './landing.css';
```

---

## 🧩 Step 4: Create Modular Components

### 4.1 Hero Component

**File:** `src/components/landing/Hero.tsx`

```tsx
import Link from 'next/link'
import Image from 'next/image'

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 via-neon-purple/10 to-neon-pink/10 opacity-30"></div>
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl"></div>

      <div className="relative max-w-6xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
          </span>
          <span className="text-sm text-gray-300">AI agents are live — watch them build your MVP</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          From Pain Point to<br/>
          <span className="gradient-text">Working MVP</span><br/>
          in Minutes
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
          Watch AI agents debate, design, and build your startup.<br/>
          Get production-ready code, landing pages, and roadmaps.<br/>
          <span className="text-white font-semibold">No coding required.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/discover"
            className="px-8 py-4 bg-neon-blue text-midnight-950 rounded-lg font-bold text-lg hover:bg-neon-blue/90 transition glow-neon-blue w-full sm:w-auto"
          >
            Generate Your MVP — Free
          </Link>
          <button
            onClick={() => alert('Demo coming soon!')}
            className="px-8 py-4 bg-white/5 border border-white/20 rounded-lg font-semibold text-lg hover:bg-white/10 transition w-full sm:w-auto group"
          >
            <span className="flex items-center justify-center gap-2">
              See Agents Debating
              <svg className="w-5 h-5 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
          </button>
        </div>

        {/* Social Proof */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple border-2 border-midnight-950"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink border-2 border-midnight-950"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-green border-2 border-midnight-950"></div>
            </div>
            <span>Join 2,847 founders building validated MVPs</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>✓ No credit card required</span>
            <span>✓ 3 free MVPs</span>
            <span>✓ Deploy in 5 minutes</span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-transparent to-transparent z-10"></div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur">
            <div className="w-full aspect-video bg-gradient-to-br from-midnight-900 to-midnight-800 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-neon-blue/20 border-2 border-neon-blue float"></div>
                  <div className="w-16 h-16 rounded-full bg-neon-purple/20 border-2 border-neon-purple float" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-16 h-16 rounded-full bg-neon-pink/20 border-2 border-neon-pink float" style={{animationDelay: '1s'}}></div>
                </div>
                <p className="text-gray-500 text-sm">Chat Theater: AI Agents Collaborating in Real-Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

---

### 4.2 Reusable Button Component

**File:** `src/components/ui/Button.tsx`

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2 focus:ring-offset-midnight-950',
  {
    variants: {
      variant: {
        primary: 'bg-neon-blue text-midnight-950 hover:bg-neon-blue/90 glow-neon-blue',
        secondary: 'bg-white/5 border border-white/20 hover:bg-white/10',
        gradient: 'bg-gradient-to-r from-neon-purple to-neon-pink text-white hover:opacity-90 glow-neon-purple',
        ghost: 'bg-transparent border border-white/10 hover:border-white/30',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
```

**Install dependency:**
```bash
npm install class-variance-authority
```

---

### 4.3 Gradient Text Component

**File:** `src/components/ui/GradientText.tsx`

```tsx
import { HTMLAttributes } from 'react'

interface GradientTextProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

export function GradientText({ children, className = '', ...props }: GradientTextProps) {
  return (
    <span className={`gradient-text ${className}`} {...props}>
      {children}
    </span>
  )
}
```

---

## 📱 Step 5: Create Landing Page

**File:** `src/app/(marketing)/page.tsx`

```tsx
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ChatTheaterPreview } from '@/components/landing/ChatTheaterPreview'
import { Deliverables } from '@/components/landing/Deliverables'
import { Testimonials } from '@/components/landing/Testimonials'
import { Pricing } from '@/components/landing/Pricing'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'

export const metadata = {
  title: 'RealWebWins — From Pain Point to Working MVP in Minutes',
  description: 'Watch AI agents collaborate to build your startup. Get production-ready code, landing pages, and roadmaps in minutes.',
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ChatTheaterPreview />
      <Deliverables />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  )
}
```

---

## 🎯 Step 6: Add Navigation

**File:** `src/components/landing/Navigation.tsx`

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 bg-midnight-950/80 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg"></div>
          <span className="text-xl font-bold">RealWebWins</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition">
            How It Works
          </a>
          <a href="#deliverables" className="text-sm text-gray-400 hover:text-white transition">
            Deliverables
          </a>
          <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition">
            Pricing
          </a>
          <a href="#faq" className="text-sm text-gray-400 hover:text-white transition">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">
            Sign In
          </Link>
          <Link
            href="/discover"
            className="px-4 py-2 bg-neon-blue text-midnight-950 rounded-lg font-semibold text-sm hover:bg-neon-blue/90 transition glow-neon-blue"
          >
            Start Building
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

---

## 🖼️ Step 7: Optimize Images

### Update `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn-domain.com',
      },
    ],
  },
}

module.exports = nextConfig
```

### Use Next.js Image Component

```tsx
import Image from 'next/image'

<Image
  src="/images/hero-theater.png"
  alt="Chat Theater Preview"
  width={1200}
  height={675}
  priority
  className="rounded-xl"
/>
```

---

## ⚡ Step 8: Performance Optimization

### 8.1 Add Loading State

**File:** `src/app/(marketing)/loading.tsx`

```tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-950">
      <div className="flex gap-4">
        <div className="w-4 h-4 rounded-full bg-neon-blue animate-bounce"></div>
        <div className="w-4 h-4 rounded-full bg-neon-purple animate-bounce" style={{animationDelay: '0.2s'}}></div>
        <div className="w-4 h-4 rounded-full bg-neon-pink animate-bounce" style={{animationDelay: '0.4s'}}></div>
      </div>
    </div>
  )
}
```

### 8.2 Add Metadata for SEO

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RealWebWins — From Pain Point to Working MVP in Minutes',
  description: 'Watch AI agents collaborate to build your startup. Get production-ready code, landing pages, and roadmaps in minutes.',
  keywords: ['MVP', 'AI agents', 'startup', 'no-code', 'indie hacker'],
  authors: [{ name: 'RealWebWins' }],
  openGraph: {
    title: 'RealWebWins — AI-Powered MVP Generation',
    description: 'From idea to deployed MVP in minutes with AI agents.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RealWebWins',
    description: 'AI-powered MVP generation for founders',
    images: ['/twitter-image.png'],
  },
}
```

---

## 🧪 Step 9: Testing Checklist

### Visual Testing
- [ ] Hero section displays correctly
- [ ] Gradients render properly
- [ ] All buttons have hover states
- [ ] Mobile responsive (test 375px, 768px, 1024px)
- [ ] Dark mode looks correct

### Functional Testing
- [ ] Navigation links scroll to sections
- [ ] CTA buttons navigate correctly
- [ ] Forms submit properly
- [ ] Images load with proper aspect ratios

### Performance Testing
```bash
# Run Lighthouse audit
npm run build
npm run start

# Then open Chrome DevTools → Lighthouse
# Target scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 100
```

---

## 📊 Step 10: Analytics Setup

### Add Plausible Analytics (Recommended)

**File:** `src/app/layout.tsx`

```tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          defer
          data-domain="realwebwins.com"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Track Custom Events

```tsx
'use client'

function Hero() {
  const trackCTAClick = () => {
    if (window.plausible) {
      window.plausible('CTA Click', { props: { location: 'Hero' } })
    }
  }

  return (
    <button onClick={trackCTAClick}>
      Generate Your MVP
    </button>
  )
}
```

---

## 🚢 Step 11: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or push to GitHub and connect in Vercel dashboard
git add .
git commit -m "Add landing page"
git push origin main
```

---

## 🐛 Troubleshooting

### Issue: Gradients not showing
**Solution:** Ensure `landing.css` is imported in `globals.css`

### Issue: Fonts not loading
**Solution:** Check `next/font` import and `--font-inter` CSS variable

### Issue: Tailwind colors not working
**Solution:** Verify `tailwind.config.ts` extends theme correctly

### Issue: Animations choppy
**Solution:** Add `will-change` utility:
```css
.float {
  will-change: transform;
}
```

---

## 📚 Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion for Next.js](https://www.framer.com/motion/) (for advanced animations)
- [Class Variance Authority](https://cva.style/docs) (for button variants)

---

## ✅ Final Checklist

- [ ] Tailwind configured with custom colors
- [ ] Fonts loaded (Inter via next/font)
- [ ] All components modularized
- [ ] Navigation functional
- [ ] CTAs link to correct routes
- [ ] Mobile responsive
- [ ] SEO metadata added
- [ ] Analytics tracking setup
- [ ] Performance optimized (Lighthouse 90+)
- [ ] Deployed to Vercel

---

**Need help?** Open an issue or reach out in Discord!
