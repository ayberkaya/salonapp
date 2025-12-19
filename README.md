# Hair Salon CRM + Loyalty System

A secure, operational CRM system for hair salons to track customer visits, manage loyalty, and reactivate inactive customers via SMS.

## Features

- **Role-based Access Control**: OWNER and STAFF roles with different permissions
- **Customer Management**: Search, create, and manage customers
- **Visit Tracking**: Secure visit confirmation via dynamic QR codes
- **Customer Reactivation**: Identify and message inactive customers (30+ days)
- **SMS Integration**: OTP login and campaign sending (mock in MVP)

## Tech Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + Postgres + RLS)
- **Deployment**: Vercel-ready
- **SMS**: Abstraction layer with mock provider

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- (Optional) SMS provider API key for production

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Create Initial Users

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" and create:
   - **Owner**: `owner@salon.com` / `owner123`
   - **Staff 1**: `staff1@salon.com` / `staff123`
   - **Staff 2**: `staff2@salon.com` / `staff123`

### 5. Seed Initial Data

Run the seed script to create the salon and profiles:

```bash
# Set service role key for seed script
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run seed script
npx tsx scripts/seed.ts
```

**Note**: The seed script will create:
- A salon named "Kuaför Sadakat"
- Profiles for owner and staff (if users exist)
- Sample customers

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Flows

### Staff Checkout Flow

1. Staff logs in with email/password
2. Searches customer by phone or name
3. If customer exists: Click "Start Visit"
4. If customer is new: Create customer → Click "Start Visit"
5. System generates dynamic QR code (expires in 60 seconds)
6. Customer scans QR code at counter

### Customer Check-In Flow

1. Customer scans QR code
2. Lands on `/checkin` page
3. Enters phone number
4. Receives SMS OTP (mocked in MVP)
5. Enters OTP to verify
6. System validates token and creates visit record
7. Shows confirmation screen

### Owner Reactivation Flow

1. Owner views dashboard
2. Sees inactive customers (30+ days) and top visitors
3. Selects customers for campaign
4. Composes and sends SMS message
5. Messages are sent (mocked in MVP)

## Security Features

- **Visit Tokens**: One-time use, expire in 60 seconds
- **Row Level Security**: Users can only access their salon's data
- **Role-based Access**: STAFF cannot send campaigns or change settings
- **Token Validation**: Server-side validation prevents abuse
- **Daily Visit Limit**: Optional max 1 visit per customer per day

## Project Structure

```
├── app/
│   ├── checkin/          # Customer check-in page
│   ├── dashboard/        # Main dashboard (role-based)
│   ├── login/            # Staff/Owner login
│   └── layout.tsx        # Root layout
├── components/
│   ├── CustomerSearch.tsx    # Staff customer search UI
│   ├── OwnerDashboard.tsx    # Owner dashboard UI
│   └── LogoutButton.tsx      # Logout functionality
├── lib/
│   ├── supabase/         # Supabase client utilities
│   ├── auth.ts           # Authentication helpers
│   └── sms/              # SMS abstraction layer
├── supabase/
│   └── schema.sql        # Database schema + RLS policies
├── scripts/
│   └── seed.ts           # Seed data script
└── types/
    └── database.ts       # TypeScript types
```

## Database Schema

- **salons**: Salon information
- **profiles**: User profiles linked to auth.users (OWNER/STAFF)
- **customers**: Customer records (phone-based identification)
- **visits**: Visit history
- **visit_tokens**: One-time visit tokens with expiration

## SMS Integration

The SMS system uses an abstraction layer (`lib/sms/index.ts`). In MVP, it's mocked and logs to console. To use a real provider:

1. Update `lib/sms/index.ts` with your provider (Twilio, etc.)
2. Set `SMS_PROVIDER_API_KEY` in environment variables
3. Implement the `SMSProvider` interface

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SMS_PROVIDER_API_KEY=your_sms_api_key  # Optional
```

## Development Notes

- **No Charts**: MVP focuses on core functionality
- **No AI**: Simple rule-based segmentation
- **No Mobile App**: Web-based, tablet-friendly UI
- **Minimal Styling**: Functional UI with Tailwind CSS
- **Mock SMS**: Real SMS integration can be added later

## Troubleshooting

### "Unauthorized" errors
- Check that RLS policies are applied correctly
- Verify user has a profile in the `profiles` table
- Ensure user's `salon_id` matches their profile

### QR codes not working
- Check that `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- Verify visit tokens are being created
- Check browser console for errors

### OTP not received
- In MVP, OTP is logged to console (check server logs)
- For production, implement real SMS provider

## License

Private - For internal use only
