# AI Observability SDK - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Linear + Stripe hybrid)  
**Justification:** This is a data-intensive developer tool requiring clarity, efficiency, and trust. Drawing from Linear's clean developer UX and Stripe's data presentation excellence.

**Core Principles:**
- Clarity over decoration
- Information density with breathing room
- Scan-optimized layouts for quick data comprehension
- Trust through professional restraint

---

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts CDN) - all UI, body text
- Monospace: JetBrains Mono - code snippets, API keys, JSON logs

**Hierarchy:**
- Hero/H1: 48px (3rem), font-weight 700, tracking-tight
- Section Headers/H2: 32px (2rem), font-weight 600
- Subsections/H3: 24px (1.5rem), font-weight 600
- Card Titles/H4: 18px (1.125rem), font-weight 600
- Body: 16px (1rem), font-weight 400, leading-relaxed
- Small/Meta: 14px (0.875rem), font-weight 400
- Code/Mono: 14px (0.875rem), JetBrains Mono

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing (between related items): 2, 4
- Component internal padding: 4, 6, 8
- Section spacing: 12, 16
- Large gaps: 16, 24

**Grid Structure:**
- Max container: max-w-7xl
- Dashboard content: max-w-full with internal gutters
- Forms/settings: max-w-2xl centered
- Sidebar: Fixed 256px (w-64)

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header, h-16, backdrop-blur with subtle border-b
- Logo left, workspace switcher center-left, user menu right
- API key indicator (truncated) in top-right corner

**Sidebar (Dashboard):**
- w-64, sticky left navigation
- Collapsible sections: Overview, Logs, Analytics, Projects, Settings
- Active state with subtle left border indicator
- Icons from Heroicons (outline style)

### Dashboard Layout
**Three-Column Analytics Grid:**
```
[Metric Card] [Metric Card] [Metric Card]
Total Requests | Avg Latency | Total Cost
```
- Each card: rounded-lg border, p-6
- Large number (text-3xl font-bold) + label (text-sm) + trend indicator

**Log Viewer:**
- Full-width table with sticky header
- Columns: Timestamp | Project | Model | Latency | Tokens | Cost | Status
- Row height: 52px for scannability
- Expandable rows show full prompt/response JSON
- Monospace for all data values

**Real-time Stream Indicator:**
- Top-right of log viewer: "● Live" with pulse animation
- Pause/resume toggle button adjacent

### Data Visualization
**Charts (using Chart.js or Recharts):**
- Cost over time: Area chart, 7/30-day toggles
- Usage by model: Horizontal bar chart
- Latency distribution: Line chart with gradient fill
- All charts: h-80, consistent padding-6

### Forms & Inputs
**Workspace Creation:**
- Single-column form, max-w-md
- Input fields: h-12, rounded-lg, border with focus ring
- Labels: text-sm font-medium, mb-2
- Helper text: text-sm, mt-1

**API Key Display:**
- Monospace, truncated with reveal button
- Copy-to-clipboard button (icon only) on right
- Background treatment to distinguish from regular text

### Cards & Containers
**Project Cards:**
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Card: rounded-xl border p-6, h-40
- Hover: subtle border emphasis (no color change)

**Metric Cards:**
- Compact: p-4 for dense dashboards
- Standard: p-6 for primary metrics
- Includes: Icon (top-left 20px), Value (large), Label (small), Change indicator

### Modals & Overlays
**Modal Structure:**
- Max-w-2xl, centered overlay
- Header: p-6 with border-b, h4 title + close button
- Content: p-6
- Footer (if needed): p-6 border-t, buttons right-aligned

### Buttons
**Variants:**
- Primary: rounded-lg px-4 py-2, font-medium
- Secondary: rounded-lg px-4 py-2, border
- Ghost: px-4 py-2, no border
- Icon-only: p-2, rounded-lg

---

## Page Structures

### Marketing/Landing Page
**Hero Section (60vh):**
- Two-column split: Left - headline + description + CTA, Right - Dashboard preview screenshot
- Headline: "Real-time AI Observability for Modern Apps"
- Subhead: Cost tracking, performance insights, multi-model support
- CTA buttons: "Start Free" (primary) + "View Docs" (secondary)
- Trust indicator below: "Trusted by 2,000+ developers"

**Features Grid (3 columns):**
- Icon-title-description cards
- Features: Real-time Logs, Cost Analytics, Multi-tenant, SDK Drop-in, Performance Metrics, Workspace Management

**SDK Integration Section:**
- Two-column: Left - benefits list, Right - code snippet
- Code block: rounded-xl, p-6, syntax highlighting placeholder

**Pricing Tiers (3 columns):**
- Free, Team, Enterprise cards
- Each: h-auto, rounded-xl border p-8
- Feature list with checkmark icons

**Footer:**
- Four-column: Product, Resources, Company, Legal
- Newsletter signup (email input + button)
- Social icons row (GitHub, Twitter)

### Dashboard Home
**Layout:**
- Sidebar + main content area
- Top: Welcome header with workspace name
- Metrics row (3-4 cards)
- Charts section (2-column grid for Cost + Usage charts)
- Recent activity table (last 10 requests)

### Logs Page
**Full-width table view:**
- Filters bar: Project dropdown, Environment dropdown, Date range picker, Search
- Export button (top-right)
- Pagination controls (bottom)

### Analytics Page
**Dashboard-style:**
- Time range selector (top-right)
- Three tabs: Overview, Costs, Performance
- Multiple charts in 2-column responsive grid
- Summary cards above charts

---

## Icons
**Library:** Heroicons (outline style via CDN)
**Common icons:**
- Dashboard: ChartBarIcon
- Logs: DocumentTextIcon
- Cost: CurrencyDollarIcon
- Projects: FolderIcon
- Settings: CogIcon
- API Keys: KeyIcon
- Expand: ChevronDownIcon

---

## Images
**Hero Section Image:**
- Dashboard preview/screenshot (right side of hero)
- Shows the actual product interface in use
- Shadow treatment for depth

**Feature Section Icons:**
- Use icon library, not custom images

---

## Animations
**Minimal, purposeful only:**
- Live indicator: gentle pulse on dot
- Chart data: smooth enter transition (300ms)
- Modal: fade + scale enter (200ms)
- Avoid scroll effects and hover animations