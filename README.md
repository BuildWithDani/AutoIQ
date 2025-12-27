# AutoIQ

**Smart Vehicle Diagnostics & Performance**

AutoIQ is an AI-powered OBD2 diagnostics and performance tool for Windows and macOS desktop platforms.

## Tech Stack

- **Desktop Shell**: Electron
- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Python 3 + FastAPI
- **Database & Auth**: Appwrite (centralized SaaS backend)
- **OBD Access**: `python-OBD` library (supports OBDLink EX, ELM327, etc.)
- **Billing**: Stripe (subscription management)

## Project Structure

```
AutoIQ/
├── backend/           # Python FastAPI backend
│   ├── main.py       # FastAPI app entry point
│   ├── obd_service.py # OBD connection and data handling
│   ├── ai_service.py  # AI diagnostics service
│   ├── billing_service.py # Stripe billing integration
│   ├── appwrite_client.py  # Appwrite client
│   ├── jwt_utils.py  # JWT token utilities
│   ├── auth.py       # Authentication dependencies
│   ├── models.py     # Pydantic models
│   ├── config.py     # Config management (legacy, for OBD/AI only)
│   └── requirements.txt
├── frontend/         # React + TypeScript app
│   ├── src/
│   │   ├── pages/    # Main screens
│   │   ├── api.ts    # API client
│   │   └── types.ts  # TypeScript types
│   └── package.json
├── electron/         # Electron main process
│   └── main.js
└── package.json      # Root package.json
```

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** 3.8 or higher
- **OBD2 Device** (OBDLink EX, ELM327, or compatible)
- **npm** or **yarn**

## Installation

### 1. Install Root Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

Or using a virtual environment (recommended):

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Setup Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
touch .env  # On Windows: type nul > .env
```

Add the following to `backend/.env`:

```env
# Backend Configuration
PORT=8001

# AI Diagnostics Configuration (Optional)
# To enable AI diagnostics, sign up at https://openrouter.ai and get an API key
AI_PROVIDER=openrouter
AI_MODEL=openrouter/bert-nebulon-alpha
OPENROUTER_API_KEY=your_api_key_here
# OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # Optional, defaults to this

# Appwrite Configuration (Required)
# Appwrite endpoint - your Appwrite server URL
APPWRITE_ENDPOINT=https://your-appwrite-instance.appwrite.io/v1
# Appwrite project ID - from your Appwrite project settings
APPWRITE_PROJECT_ID=your_project_id_here
# Appwrite API key - server-side API key (keep secret!)
APPWRITE_API_KEY=your_server_api_key_here
# Optional: Custom database/collection IDs (defaults to "autoiq" and "profiles")
# APPWRITE_DATABASE_ID=autoiq
# APPWRITE_PROFILES_COLLECTION_ID=profiles

# Billing Configuration (Optional)
# To enable Stripe billing, sign up at https://stripe.com and get your API keys
STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
# Monthly subscription price IDs
STRIPE_PRICE_ID_PLUS=price_your_plus_price_id_here
STRIPE_PRICE_ID_PRO_PLUS=price_your_pro_plus_price_id_here
# Yearly subscription price IDs (optional, but recommended for yearly billing)
STRIPE_PRICE_ID_PLUS_YEARLY=price_your_plus_yearly_price_id_here
STRIPE_PRICE_ID_PRO_PLUS_YEARLY=price_your_pro_plus_yearly_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Note:** 
- **Appwrite is REQUIRED** - The app uses Appwrite for user authentication and plan storage. See [Appwrite Setup](#appwrite-setup) below.
- AI diagnostics are optional. The app will work without them, but AI features will show "AI unavailable" messages. See the [Enabling AI Diagnostics](#enabling-ai-diagnostics) section below for details.
- Billing is optional. The app will work without it, but upgrade buttons will show "billing not configured" messages. See the [Enabling Billing](#enabling-billing) section below for details.

## Development

### Run the Desktop App

```bash
npm run dev
```

This will:
1. Build the frontend (if not already built)
2. Launch the Electron desktop application
3. **Automatically start the Python backend** as a child process
4. Load the UI from built files (not a dev server)

The app runs as a **standalone desktop application** - no separate servers needed!

### Development Workflow

If you're actively developing the frontend and want hot-reload:

**Terminal 1 - Frontend Dev Server (for hot-reload):**
```bash
npm run dev:frontend
```

**Terminal 2 - Desktop App:**
```bash
npm run dev:electron
```

Note: The Electron app will automatically start the backend. The frontend dev server is only needed if you want hot-reload during development.

### Backend Development

If you need to test backend changes separately:

```bash
npm run dev:backend
```

This runs the backend standalone on port 8001.

## Building for Production

### Build Desktop Application

```bash
npm run build
```

This will:
1. Build the React frontend
2. Package everything into a distributable desktop application
3. Create installers in the `dist/` folder

### Platform-Specific Builds

**Windows:**
```bash
npm run build:win
```

**macOS:**
```bash
npm run build:mac
```

The built application includes:
- Electron shell
- Built React frontend
- Python backend (bundled)
- All dependencies

Users can install and run the app like any other desktop application - no Node.js or Python installation required!

## Enabling AI Diagnostics

AI diagnostics use OpenRouter to provide intelligent explanations of diagnostic trouble codes. To enable this feature:

### 1. Sign Up for OpenRouter

1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Create an account
3. Navigate to your API keys section
4. Create a new API key

### 2. Configure Environment Variables

Add your API key to `backend/.env`:

```env
AI_PROVIDER=openrouter
AI_MODEL=openrouter/bert-nebulon-alpha
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
```

### 3. Restart the Backend

After adding the API key, restart the backend (or restart the entire app):

```bash
# If running standalone backend
npm run dev:backend

# Or restart the full app
npm run dev
```

### 4. Verify AI is Working

1. Set your plan to `plus` or `pro_plus` in Settings
2. Scan for trouble codes
3. Navigate to AI Diagnostic page
4. Click "Analyze Codes"

If AI is properly configured, you'll see real AI-powered diagnostics. If not configured, you'll see a clear "AI unavailable" message instead of an error.

### What Happens Without AI?

- The app runs normally
- All non-AI features work (scanning, live data, etc.)
- AI Diagnostic page shows "AI diagnostics are not configured" message
- No crashes or errors - graceful degradation

## Enabling Billing

AutoIQ supports Stripe for subscription billing. To enable payment processing:

### 1. Sign Up for Stripe

1. Visit [https://stripe.com](https://stripe.com)
2. Create an account
3. Navigate to Developers → API keys
4. Get your **Publishable key** (starts with `pk_test_` or `pk_live_`)
5. Get your **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2. Create Products and Prices

1. In Stripe Dashboard, go to Products
2. Create two products:
   - **AutoIQ+** (monthly subscription)
   - **Pro+** (monthly subscription)
3. For each product, create a recurring price (monthly)
4. Copy the **Price ID** for each (starts with `price_`)

### 3. Configure Environment Variables

Add your Stripe keys to `backend/.env`:

```env
STRIPE_PUBLIC_KEY=pk_test_your_public_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
# Monthly subscription price IDs
STRIPE_PRICE_ID_PLUS=price_your_plus_price_id_here
STRIPE_PRICE_ID_PRO_PLUS=price_your_pro_plus_price_id_here
# Yearly subscription price IDs (optional, but recommended for yearly billing)
STRIPE_PRICE_ID_PLUS_YEARLY=price_your_plus_yearly_price_id_here
STRIPE_PRICE_ID_PRO_PLUS_YEARLY=price_your_pro_plus_yearly_price_id_here
```

### 4. Restart the Backend

After adding the Stripe keys, restart the backend (or restart the entire app):

```bash
# If running standalone backend
npm run dev:backend

# Or restart the full app
npm run dev
```

### 5. Test the Payment Flow

1. Set your plan to `free` in Settings
2. Click "Upgrade to AutoIQ+" or "Upgrade to Pro+"
3. The Stripe Checkout page will open in your default browser
4. Use Stripe test cards (e.g., `4242 4242 4242 4242`) to test payments

### What Happens Without Billing?

- The app runs normally with Appwrite authentication
- Users can register and login
- All users start on "free" plan
- Upgrade buttons show "Billing is not yet configured" message
- Users cannot manually upgrade to paid plans (must use Stripe checkout)
- No crashes or errors - graceful degradation

**Note:** With webhooks configured, plan upgrades happen automatically after successful payment. The webhook updates the user's profile in Appwrite. See [Stripe Webhook Setup](#stripe-webhook-setup) below.

## Appwrite Setup

AutoIQ uses Appwrite as a centralized backend for user authentication and profile management. All desktop clients connect to a single Appwrite instance over HTTPS.

### 1. Set Up Appwrite Instance

You have two options:

**Option A: Use Appwrite Cloud (Recommended for Production)**
1. Visit [https://cloud.appwrite.io](https://cloud.appwrite.io)
2. Create an account and project
3. Copy your project endpoint, project ID, and create a server API key

**Option B: Self-Host Appwrite**
1. Follow [Appwrite installation guide](https://appwrite.io/docs/installation)
2. Set up your Appwrite server
3. Create a project and get your credentials

### 2. Create Database and Collection

1. In Appwrite Console, go to **Databases**
2. Create a new database (or use default)
3. Create a collection named `profiles` (or use `APPWRITE_PROFILES_COLLECTION_ID` env var)
4. Add the following attributes to the `profiles` collection:
   - `userId` (String, required, indexed)
   - `plan` (String, required, default: "free")
   - `stripeCustomerId` (String, optional)
   - `stripeSubscriptionId` (String, optional)

### 3. Configure Environment Variables

Add your Appwrite credentials to `backend/.env`:

```env
APPWRITE_ENDPOINT=https://your-appwrite-instance.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_server_api_key_here
```

**Important Security Notes:**
- The `APPWRITE_API_KEY` is a **server-side API key** - keep it secret!
- Never expose this key in frontend code or Electron
- Only the FastAPI backend uses this key to communicate with Appwrite
- Desktop clients never interact with Appwrite directly - they only talk to your FastAPI backend

### 4. Verify Setup

After configuring Appwrite:
1. Restart the backend
2. Try registering a new user
3. Check Appwrite Console → Users to see the new user
4. Check Appwrite Console → Databases → profiles collection to see the user profile

### How It Works

- **Desktop App** → FastAPI Backend → Appwrite (server-side API)
- Users register/login through FastAPI endpoints
- FastAPI authenticates with Appwrite using server API key
- User profiles (plan, Stripe IDs) are stored in Appwrite database
- Backend issues its own JWT tokens for AutoIQ sessions
- All user data is centralized in your Appwrite instance

## Stripe Webhook Setup

Stripe webhooks automatically upgrade user plans when payment is completed. This eliminates the need for manual plan updates.

### 1. Get Your Webhook Secret

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `http://localhost:8001/api/billing/webhook` (for development)
4. Select events to listen for:
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 2. Configure Environment Variable

Add the webhook secret to `backend/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Test with Stripe CLI (Development)

For local development, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI (if not already installed)
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8001/api/billing/webhook
```

The CLI will output a webhook signing secret. Use this in your `.env` file for local testing.

### 4. Test the Webhook

1. Create a test checkout session (use test card `4242 4242 4242 4242`)
2. Complete the payment
3. Check your backend logs - you should see:
   - "Verified webhook event: checkout.session.completed"
   - "Upgrading plan to plus/pro_plus"
   - "Successfully upgraded plan to plus/pro_plus"
4. Verify plan in Settings - it should be automatically upgraded

### 5. Production Setup

For production:

1. Deploy your backend with a public URL (e.g., `https://api.autoiq.com`)
2. In Stripe Dashboard, add webhook endpoint: `https://api.autoiq.com/api/billing/webhook`
3. Select `checkout.session.completed` event
4. Copy the production webhook secret
5. Set `STRIPE_WEBHOOK_SECRET` in your production environment

### How It Works

1. User completes Stripe Checkout payment
2. Stripe sends `checkout.session.completed` event to your webhook endpoint
3. Backend verifies the webhook signature
4. Backend extracts `metadata.user_id` and `metadata.plan` from the checkout session
5. Backend looks up user in Appwrite by `user_id`
6. Backend updates user's profile in Appwrite: `plan`, `stripeCustomerId`, and `stripeSubscriptionId`
7. User's plan is upgraded automatically - next time they refresh or call `/api/auth/me`, they'll see the new plan

### Webhook Events Handled

- `checkout.session.completed`: Upgrades user plan when payment succeeds
- `customer.subscription.updated`: Updates plan when subscription changes (upgrade/downgrade)
- `customer.subscription.deleted`: Downgrades user to "free" when subscription is cancelled

### Troubleshooting

- **Webhook not received**: Check that your endpoint URL is correct and accessible
- **Signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- **Plan not updated**: Check backend logs for errors; verify `metadata.user_id` and `metadata.plan` are set correctly in checkout session
- **User not found**: Ensure the user_id in metadata matches an Appwrite user ID

## Usage

### Connecting to OBD Device

1. Connect your OBD2 device (OBDLink EX, ELM327, etc.) to your computer via USB
2. Launch AutoIQ
3. The app will automatically attempt to connect to the device
4. Check the Dashboard for connection status

### Plan Management

- All users start on `free` plan (stored in Appwrite)
- Users must register/login to use the app
- Plan-based feature gating:
  - **Free**: Basic scanning, code reading, live data
  - **Plus (AutoIQ+)**: Unlocks AI diagnostics
  - **Pro+**: All features (advanced features coming soon)
- **With Billing Enabled**: Users cannot manually change plans - must use Stripe checkout to upgrade
- **Without Billing**: Users can manually change plans for testing (not recommended for production)

## No Mock Data Guarantee

AutoIQ is production-ready with **zero mock data**:

### OBD Data
- ✅ **100% Real**: All telemetry comes from `python-OBD` library via actual OBD2 device
- ✅ **No Fake Data**: If OBD is disconnected, returns `"N/A"` or `connected: false`
- ✅ **No Simulators**: No random number generators or fake RPM/speed values
- ✅ **Graceful Degradation**: Shows "Not connected" or "No data" instead of fake readings

### AI Diagnostics
- ✅ **100% Real**: All AI responses come from OpenRouter API (OpenAI-compatible)
- ✅ **No Mock Responses**: If `OPENROUTER_API_KEY` is missing, returns structured `503 AI_UNAVAILABLE` error
- ✅ **No Placeholders**: No fake diagnostic responses or development mode mocks
- ✅ **Graceful Degradation**: Shows "AI is not configured" message instead of fake output

### User Plans
- ✅ **Appwrite Storage**: All user plans stored in Appwrite database
- ✅ **No Config Fallback**: Plans come from authenticated user profiles in Appwrite, not local config
- ✅ **Subscription-Aware**: Plans sync automatically via Stripe webhooks
- ✅ **Centralized**: Single Appwrite instance serves all desktop clients

### Features

- **Dashboard**: Connection status, quick stats, primary actions
- **Scan / Codes**: Scan for trouble codes, view stored/pending codes, clear codes
- **AI Diagnostic**: AI-powered explanations (AutoIQ+ and Pro+ only)
- **Live Data**: Real-time vehicle performance metrics
- **Settings**: Plan management, developer tools

## API Endpoints

The backend exposes the following endpoints:

- `GET /api/status` - Connection status
- `POST /api/reconnect` - Reconnect to OBD device
- `GET /api/live-data` - Live OBD data
- `GET /api/codes` - Get trouble codes
- `POST /api/clear-codes` - Clear trouble codes
- `GET /api/vehicle` - Vehicle information
- `GET /api/plan` - Get current plan
- `POST /api/plan` - Update plan
- `POST /api/ai/explain` - AI explanation (requires AutoIQ+ or Pro+ plan and OpenRouter API key)

## Troubleshooting

### Backend Won't Start

- Ensure Python 3.8+ is installed
- Check that all dependencies are installed: `pip install -r backend/requirements.txt`
- Verify the port 8001 is not in use

### OBD Device Not Detected

- Ensure the device is connected via USB
- Check device manager (Windows) or System Information (macOS) for the COM port
- Try manually specifying the port in `obd_service.py` if auto-detection fails
- Some devices may require drivers - check manufacturer's website

### Frontend Build Errors

- Ensure Node.js v18+ is installed
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check that all frontend dependencies are installed

## Future Enhancements

- Additional AI model support
- Advanced performance logging
- Data export and reports
- Shop/mechanic features for Pro+ tier
- Mobile apps
- BWD-branded hardware support

## License

MIT

