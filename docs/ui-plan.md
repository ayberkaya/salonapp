# UI/UX Modernization Plan

## Overview
Transform the salon CRM into a modern, tablet-friendly, premium experience while maintaining all existing business logic and flows.

## Information Architecture

### Navigation Structure

**STAFF Navigation:**
- 🏠 Home (Search) - Primary screen
- 👥 Customers - Customer list & management
- 🚪 Logout

**OWNER Navigation:**
- 🏠 Home (Search) - Primary screen
- 👥 Customers - Customer list & management
- 📧 Campaigns - SMS campaign management
- ⚙️ Settings - (Future: salon settings)
- 🚪 Logout

**Public Routes:**
- /checkin - Customer check-in flow (no nav)

### Route Structure
```
/ (redirects to /home)
/home - Main search & quick actions
/customers - Customer list
/customers/[id] - Customer detail
/campaigns - Owner campaigns (owner only)
/checkin - Public check-in
/login - Staff/Owner login
```

## Component System

### Core Components (Lightweight, Tailwind-only)

1. **Button** (`components/ui/Button.tsx`)
   - Variants: primary, secondary, ghost, destructive
   - Sizes: sm, md, lg
   - Tablet-friendly: min 44x44px touch targets

2. **Input** (`components/ui/Input.tsx`)
   - Clear focus states
   - Error states
   - Icon support

3. **Card** (`components/ui/Card.tsx`)
   - Subtle shadows, rounded corners
   - Padding system

4. **Badge** (`components/ui/Badge.tsx`)
   - Status indicators
   - Visit counts

5. **Modal** (`components/ui/Modal.tsx`)
   - Backdrop blur
   - Keyboard (Esc) close
   - Focus trap

6. **Toast** (`components/ui/Toast.tsx`)
   - Success/error/info variants
   - Auto-dismiss
   - Stack multiple

7. **EmptyState** (`components/ui/EmptyState.tsx`)
   - Friendly illustrations
   - Clear CTAs

8. **LoadingSkeleton** (`components/ui/LoadingSkeleton.tsx`)
   - Subtle shimmer
   - Content-aware

9. **Nav** (`components/layout/Nav.tsx`)
   - Role-based items
   - Active state
   - Tablet-optimized

## Screen-by-Screen Improvements

### 1. Home / Search Screen (`/home`)
**Priority: HIGHEST**

**Layout:**
```
┌─────────────────────────────────────┐
│ [Salon Name]              [Logout]  │
├─────────────────────────────────────┤
│                                     │
│    🔍 [Big Search Bar]              │
│                                     │
│    [+ New Customer]                 │
│                                     │
├─────────────────────────────────────┤
│ Today's Stats                       │
│ [Visits: 12] [New: 3]              │
├─────────────────────────────────────┤
│ Recent Customers                    │
│ [Customer cards...]                 │
└─────────────────────────────────────┘
```

**Features:**
- Massive search input (min 60px height)
- Instant search results (debounced, 300ms)
- Keyboard shortcuts:
  - `Enter` → Open first result
  - `Cmd/Ctrl+K` → Focus search
  - `Esc` → Clear search
- Recent customers (last 5-10)
- Today's visit count badge
- Quick "New Customer" button

**UX Flow:**
1. Staff opens app → Search bar auto-focused
2. Types phone/name → Results appear instantly
3. Clicks customer → Goes to detail
4. Clicks "Start Visit" → QR modal opens

**Target: < 15 seconds from open to QR code**

### 2. Customer Detail Screen (`/customers/[id]`)
**Priority: HIGH**

**Layout:**
```
┌─────────────────────────────────────┐
│ ← Back                              │
├─────────────────────────────────────┤
│ [Customer Name]                     │
│ [Phone] [Last Visit: 2 days ago]    │
│ [Visit Count: 5]                    │
├─────────────────────────────────────┤
│                                     │
│    [START VISIT] (Primary CTA)      │
│                                     │
├─────────────────────────────────────┤
│ Visit History                       │
│ [List of visits...]                 │
└─────────────────────────────────────┘
```

**Features:**
- Prominent customer header
- Big "Start Visit" button (primary CTA)
- Visit history list (date, time)
- Edit customer (owner only)
- Delete customer (owner only, with confirmation)

### 3. Visit Session / QR Screen
**Priority: HIGH**

**Layout:**
```
┌─────────────────────────────────────┐
│ [Customer Name]          [Cancel]   │
├─────────────────────────────────────┤
│                                     │
│         [HUGE QR CODE]              │
│                                     │
│    Time remaining: 45s              │
│                                     │
│    "Scan to confirm your visit"     │
│                                     │
│    [Regenerate QR]               │
└─────────────────────────────────────┘
```

**Features:**
- Full-screen option (kiosk mode)
- Large QR code (min 300x300px)
- Countdown timer (prominent)
- Clear instructions
- Regenerate button (if expired)
- Success state (when confirmed)

### 4. Owner Campaigns Screen (`/campaigns`)
**Priority: MEDIUM**

**Layout:**
```
┌─────────────────────────────────────┐
│ Campaigns                           │
├─────────────────────────────────────┤
│ [Inactive 30+ days] [Top Visitors] │
│                                     │
│ Selected: 5 customers               │
│                                     │
│ [Message Composer]                  │
│ [Character count: 120/160]         │
│                                     │
│ [Send Campaign]                     │
└─────────────────────────────────────┘
```

**Features:**
- Segmentation cards
- Checkbox list with "Select all"
- Message composer with preview
- Character count
- Send confirmation modal
- Success toast

### 5. Customer Check-In (`/checkin`)
**Priority: HIGH**

**Mobile-First Flow:**
1. **Phone Input**
   - Large input
   - Country code support
   - "Send OTP" button

2. **OTP Verification**
   - 6-digit input (auto-focus)
   - Resend option
   - Clear error states

3. **Confirmation**
   - Token validation
   - Success screen
   - Friendly confirmation

**Error States:**
- Expired token → Clear message + action
- Already used → Clear message
- Rate limit → Friendly explanation

## Design System

### Colors
```css
Primary: Blue-600 (#2563eb)
Success: Green-600 (#16a34a)
Warning: Yellow-600 (#ca8a04)
Error: Red-600 (#dc2626)
Neutral: Gray scale (50-900)
```

### Typography
```css
Heading 1: text-3xl font-bold (30px)
Heading 2: text-2xl font-semibold (24px)
Heading 3: text-xl font-semibold (20px)
Body: text-base (16px)
Small: text-sm (14px)
```

### Spacing
```css
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
```

### Touch Targets
- Minimum: 44x44px
- Preferred: 48x48px
- Button padding: py-3 px-6 (min)

### Shadows
```css
sm: shadow-sm
md: shadow-md
lg: shadow-lg
```

## Implementation Phases

### Phase 1: Component System
- [ ] Create `/components/ui` directory
- [ ] Build Button, Input, Card, Badge, Modal, Toast
- [ ] Add EmptyState and LoadingSkeleton
- [ ] Test components in isolation

### Phase 2: Navigation & Layout
- [ ] Create Nav component
- [ ] Update layout to include navigation
- [ ] Add role-based navigation items
- [ ] Implement active states

### Phase 3: Home Screen
- [ ] Refactor search to be primary focus
- [ ] Add keyboard shortcuts
- [ ] Add recent customers section
- [ ] Add today's stats
- [ ] Improve search UX

### Phase 4: Customer Detail
- [ ] Create customer detail page
- [ ] Add visit history
- [ ] Improve "Start Visit" flow
- [ ] Add edit/delete (owner only)

### Phase 5: QR Screen
- [ ] Improve QR modal/component
- [ ] Add countdown timer
- [ ] Add full-screen mode
- [ ] Improve success states

### Phase 6: Campaigns
- [ ] Create campaigns page
- [ ] Improve segmentation UI
- [ ] Add message composer
- [ ] Add send confirmation

### Phase 7: Check-In Flow
- [ ] Improve mobile UX
- [ ] Better error states
- [ ] Clearer instructions
- [ ] Success screen polish

### Phase 8: Polish
- [ ] Add toast notifications
- [ ] Improve loading states
- [ ] Add empty states
- [ ] Accessibility audit
- [ ] Performance optimization

## Accessibility Checklist
- [ ] All interactive elements have focus states
- [ ] Icons have aria-labels
- [ ] Touch targets ≥ 44x44px
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Screen reader friendly

## Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Search results: < 300ms
- No layout shift

## Testing Checklist
- [ ] All flows work on tablet (768px+)
- [ ] All flows work on desktop (1024px+)
- [ ] Keyboard shortcuts work
- [ ] Touch targets are adequate
- [ ] No broken routes
- [ ] Auth still works
- [ ] RLS policies still enforced

