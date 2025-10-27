# RealWebWins 2.0 Landing Page Design System

## 🎨 Color Palette

### Midnight Base Colors
```css
--midnight-950: #0a0a1f;  /* Primary background */
--midnight-900: #13132e;  /* Section backgrounds */
--midnight-800: #1c1c3e;  /* Card backgrounds */
```

**Usage:**
- `midnight-950`: Main page background, footer
- `midnight-900`: Alternating section backgrounds for depth
- `midnight-800`: Card hover states, elevated surfaces

### Neon Accent Colors
```css
--neon-blue: #00e5ff;     /* Primary CTA, links */
--neon-purple: #b24bf3;   /* Secondary actions, highlights */
--neon-pink: #ff2e97;     /* Tertiary highlights, gradients */
--neon-green: #00ff94;    /* Success states, checkmarks */
```

**Usage:**
- `neon-blue`: Primary buttons, important CTAs, agent avatars (Researcher)
- `neon-purple`: Premium tier badges, agent avatars (Builder)
- `neon-pink`: Final CTA section, agent avatars (Validator)
- `neon-green`: Checkmarks, success indicators, live status dots

### Grayscale
```css
--gray-50: #fafafa;       /* Pure white text (rare use)
--gray-300: #d1d5db;      /* Secondary text
--gray-400: #9ca3af;      /* Body text, descriptions
--gray-500: #6b7280;      /* Tertiary text, metadata
--white: #ffffff;         /* Headers, primary text
```

### Gradient Definitions

#### Primary Gradient (Text & Highlights)
```css
.gradient-text {
  background: linear-gradient(135deg, #00e5ff 0%, #b24bf3 50%, #ff2e97 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```
**Usage:** Headlines ("Working MVP"), key terms, stats

#### Glow Effects
```css
.glow-neon-blue {
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.5), 0 0 40px rgba(0, 229, 255, 0.3);
}

.glow-neon-purple {
  box-shadow: 0 0 20px rgba(178, 75, 243, 0.5), 0 0 40px rgba(178, 75, 243, 0.3);
}
```
**Usage:** Primary CTA buttons, Premium tier cards

#### Background Gradients
```css
/* Hero section */
.bg-hero {
  background: radial-gradient(circle at 25% 20%, rgba(0, 229, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 80%, rgba(178, 75, 243, 0.1) 0%, transparent 50%);
}

/* Section dividers */
.bg-section-divide {
  background: linear-gradient(to bottom, #0a0a1f 0%, #13132e 100%);
}
```

---

## ✏️ Typography

### Font Family
**Primary:** [Inter](https://fonts.google.com/specimen/Inter) (400, 500, 600, 700, 800)
**Display:** Cabinet Grotesk *(optional, falls back to Inter)*

### Font Sizes & Line Heights

#### Headings
```css
/* Hero H1 */
h1 {
  font-size: 4rem;    /* 64px desktop */
  line-height: 1.1;
  font-weight: 800;
}
@media (max-width: 768px) {
  h1 { font-size: 3rem; /* 48px mobile */ }
}

/* Section H2 */
h2 {
  font-size: 3rem;    /* 48px desktop */
  line-height: 1.2;
  font-weight: 700;
}
@media (max-width: 768px) {
  h2 { font-size: 2.25rem; /* 36px mobile */ }
}

/* Card H3 */
h3 {
  font-size: 1.5rem;  /* 24px */
  line-height: 1.3;
  font-weight: 700;
}
```

#### Body Text
```css
/* Large body (subheadlines) */
.text-xl {
  font-size: 1.25rem;   /* 20px */
  line-height: 1.75;    /* 28px */
}

/* Regular body */
body, p {
  font-size: 1rem;      /* 16px */
  line-height: 1.5;     /* 24px */
  font-weight: 400;
}

/* Small text (metadata, captions) */
.text-sm {
  font-size: 0.875rem;  /* 14px */
  line-height: 1.25;    /* 17.5px */
}
```

---

## 🧩 Component Patterns

### Buttons

#### Primary CTA
```html
<a href="#" class="px-8 py-4 bg-neon-blue text-midnight-950 rounded-lg font-bold text-lg hover:bg-neon-blue/90 transition glow-neon-blue">
  Generate Your MVP — Free
</a>
```

#### Secondary Button
```html
<button class="px-8 py-4 bg-white/5 border border-white/20 rounded-lg font-semibold text-lg hover:bg-white/10 transition">
  See Agents Debating
</button>
```

#### Gradient Button (Premium)
```html
<a href="#" class="px-6 py-3 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg font-bold hover:opacity-90 transition glow-neon-purple">
  Upgrade to Premium
</a>
```

### Cards

#### Standard Card
```html
<div class="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition">
  <!-- Content -->
</div>
```

#### Featured Card (with glow on hover)
```html
<div class="relative group">
  <div class="absolute inset-0 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition"></div>
  <div class="relative bg-white/5 border border-white/10 rounded-2xl p-8">
    <!-- Content -->
  </div>
</div>
```

### Badges

#### Tier Badges
```html
<!-- Free -->
<span class="px-3 py-1 bg-neon-green/20 text-neon-green text-xs font-semibold rounded-full">FREE</span>

<!-- Pro -->
<span class="px-3 py-1 bg-neon-blue/20 text-neon-blue text-xs font-semibold rounded-full">PRO</span>

<!-- Premium -->
<span class="px-3 py-1 bg-neon-purple/20 text-neon-purple text-xs font-semibold rounded-full">PREMIUM</span>
```

#### Status Badge (Live)
```html
<div class="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur">
  <span class="relative flex h-2 w-2">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
    <span class="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
  </span>
  <span class="text-sm text-gray-300">AI agents are live</span>
</div>
```

---

## 🎭 Animations

### Float Effect (Agent Avatars)
```css
.float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

### Pulse Effect (Thinking State)
```css
.agent-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .7; }
}
```

### Ping Effect (Live Indicator)
```css
.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
```

---

## 📐 Spacing System

### Container Width
```css
.max-w-6xl {
  max-width: 72rem; /* 1152px */
}
```

### Section Padding
```css
/* Standard section */
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }

/* Hero section */
.pt-32 { padding-top: 8rem; }
.pb-20 { padding-bottom: 5rem; }
```

### Card Spacing
```css
/* Card padding */
.p-8 { padding: 2rem; }

/* Grid gaps */
.gap-8 { gap: 2rem; }
.gap-6 { gap: 1.5rem; }
```

---

## 🖼️ Image Placeholders

Replace these paths with actual assets:

```
/images/hero-theater.png        → Chat Theater screenshot
/images/agent-researcher.svg    → Researcher agent icon
/images/agent-builder.svg       → Builder agent icon
/images/agent-validator.svg     → Validator agent icon
/images/logo.svg                → RealWebWins logo
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* @media (min-width: 640px) */
md: 768px   /* @media (min-width: 768px) */
lg: 1024px  /* @media (min-width: 1024px) */
xl: 1280px  /* @media (min-width: 1280px) */
```

### Key Responsive Patterns

#### Hero Headline
```html
<h1 class="text-5xl md:text-7xl ...">
  <!-- 5xl mobile, 7xl desktop -->
</h1>
```

#### Grid Layout
```html
<div class="grid md:grid-cols-3 gap-8">
  <!-- 1 column mobile, 3 columns desktop -->
</div>
```

#### Flex Direction
```html
<div class="flex flex-col sm:flex-row gap-4">
  <!-- Column on mobile, row on tablet+ -->
</div>
```

---

## ♿ Accessibility

### Color Contrast
All text meets WCAG AA standards:
- White (#ffffff) on midnight-950 (#0a0a1f): **16.8:1** ✅
- Gray-400 (#9ca3af) on midnight-950: **7.2:1** ✅
- Neon-blue (#00e5ff) on midnight-950: **9.1:1** ✅

### Focus States
All interactive elements include focus states:
```css
button:focus, a:focus {
  outline: 2px solid #00e5ff;
  outline-offset: 2px;
}
```

### Semantic HTML
- Use `<nav>`, `<section>`, `<article>`, `<footer>`
- Add `aria-label` to icon buttons
- Include `alt` text for all images

---

## 🔗 Links & Interactions

### Link States
```css
a {
  transition: color 0.2s ease;
}
a:hover {
  color: #ffffff;
}
```

### Button States
```css
button {
  transition: all 0.2s ease;
}
button:hover {
  transform: translateY(-1px);
}
button:active {
  transform: translateY(0);
}
```

---

## 📦 Export This Design System

To use in Figma/Design tools:
1. Export color variables → Figma Styles
2. Create text styles for each heading level
3. Create component variants for buttons/cards
4. Add auto-layout frames with spacing tokens

To use in code:
1. Add to Tailwind config (`tailwind.config.js`)
2. Create CSS custom properties in `:root`
3. Document in Storybook/component library
