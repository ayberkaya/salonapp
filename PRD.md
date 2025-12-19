# Hair Salon CRM + Loyalty System - MVP PRD

## Product Overview
A secure, operational CRM system for a single hair salon to track customer visits, manage loyalty, and reactivate inactive customers via SMS.

## Core Objectives
- Increase repeat visits and revenue
- Track customer visit history
- Reactivate inactive customers (30+ days)
- Secure visit confirmation system (anti-abuse)

## User Roles

### OWNER
- Full system access
- View all customers and visits
- View customer segments (inactive, top visitors)
- Send manual SMS campaigns
- Manage system settings

### STAFF
- Search customers by phone/name
- Create new customers
- Initiate visit sessions (generate QR codes)
- Cannot send bulk campaigns
- Cannot change system settings

### CUSTOMER
- Identified by phone number only
- Login via SMS OTP
- Confirm visits via time-limited, one-time tokens
- No email, no password

## Core User Flows

### 1. Staff Checkout Flow (Primary)
1. Staff logs in (email/password)
2. Searches customer by phone or name
3. If customer exists:
   - Click "Start Visit" button
4. If customer is new:
   - Create customer (name + phone + KVKK consent)
   - Click "Start Visit" button

### 2. Visit Session (Hybrid Control)
1. Staff clicks "Start Visit"
2. System generates ONE-TIME visit token:
   - Linked to: customer_id, salon_id, created_by (staff)
   - Expires in 60 seconds
   - Can be used ONLY ONCE
3. System displays large dynamic QR code on staff screen
4. Customer scans QR code at counter

### 3. Customer Check-In Flow
1. Customer scans QR code
2. Lands on `/checkin` page
3. If not logged in:
   - Enter phone number
   - Receive SMS OTP
   - Enter OTP to login
4. System validates:
   - Token exists
   - Token not expired (< 60 seconds)
   - Token not already used
   - Token matches customer's phone
   - Optional: Max 1 visit per customer per day
5. On success:
   - Create visit record
   - Mark token as used
   - Update customer.last_visit_at
   - Show confirmation screen

### 4. Owner Reactivation Flow
1. Owner views dashboard
2. Sees segments:
   - Customers inactive for 30+ days
   - Top visitors by visit count
3. Owner selects customers
4. Sends manual SMS campaign
5. SMS is sent (mock in MVP)

## Security Constraints
- Visit tokens expire in 60 seconds
- Tokens can only be used once
- No static QR codes
- Customer cannot add visits alone
- Staff cannot complete visits without customer confirmation
- Max 1 visit per customer per day (optional validation)

## MVP Features (IN)
- Auth (email/password) for OWNER + STAFF
- Role-based access control
- Customer CRUD (minimal fields)
- Visit tracking
- Secure dynamic QR check-in
- Manual SMS sending (mocked)
- Inactive customer segmentation (30 days)

## MVP Features (OUT)
- Charts/analytics
- AI features
- WhatsApp integration
- Mobile app
- Advanced styling
- Long customer forms

## Technical Architecture
- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + Postgres + RLS)
- **Deployment**: Vercel
- **SMS**: Abstraction layer with mock provider

## Database Schema

### salons
- id (uuid, primary key)
- name (text)
- created_at (timestamp)

### profiles
- id (uuid, primary key, references auth.users)
- salon_id (uuid, references salons)
- full_name (text)
- role ('OWNER' | 'STAFF')
- created_at (timestamp)

### customers
- id (uuid, primary key)
- salon_id (uuid, references salons)
- full_name (text)
- phone (text, unique per salon)
- kvkk_consent_at (timestamp)
- created_at (timestamp)
- last_visit_at (timestamp)

### visits
- id (uuid, primary key)
- salon_id (uuid, references salons)
- customer_id (uuid, references customers)
- created_by (uuid, references profiles)
- visited_at (timestamp)

### visit_tokens
- id (uuid, primary key)
- salon_id (uuid, references salons)
- customer_id (uuid, references customers)
- created_by (uuid, references profiles)
- token (text, unique)
- expires_at (timestamp)
- used_at (timestamp, nullable)
- created_at (timestamp)

## UX Requirements
- Default focus on search input
- Adding visit must take < 15 seconds
- Big buttons (tablet-friendly)
- Minimal screens:
  1. Login
  2. Main search + customer list
  3. Customer detail + "Start Visit"
  4. Owner campaign screen
  5. Customer check-in page

