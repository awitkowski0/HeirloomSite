# Heirloom Cribs E-Commerce Platform

A premium, full-stack React and Express application built to showcase and manage customizable wooden cribs. This project utilizes a minimal, high-end "Tactile Minimalism" aesthetic, with a fully functioning backend designed to deploy smoothly to Vercel.

## Core Features
- **Dynamic Interactive Showroom**: An animated, immersive shopping experience.
- **Automated Inventory System**: A custom Express API manages base prices, stain multipliers, and available woods.
- **Admin Dashboard**: Located at `/admin` (Password configured via `ADMIN_PASSWORD`). Dropdown-driven configuration allows easy addition of new lines, new wood variants, and pricing adjustments.
- **PayPal Integration**: Ready-to-go Smart Payment Buttons.
- **Vercel Cloud Support**: The backend conditionally supports **Upstash Redis** and **Vercel Blob** for seamless deployment without losing data.

## Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Vanilla CSS with custom properties for theming
- **Backend**: Node.js + Express (Serverless ready via `@vercel/node`)
- **Storage Integrations**: `@upstash/redis` (for JSON DB) and `@vercel/blob` (for image uploads)
- **Payments**: `@paypal/react-paypal-js`

## Getting Started Locally

### 1. Environment Setup (Optional but recommended for Vercel deployment)
To use cloud features locally (and properly mimic the production Vercel environment), create a `.env.local` file in the root directory and add the keys provided by your Vercel Dashboard:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token

# Vercel Blob
BLOB_READ_WRITE_TOKEN=your_token

# Admin Dashboard Password
ADMIN_PASSWORD=your_secure_password

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```
*(If you do not provide these, the app will safely fall back to storing images on your local filesystem and the database to `server/inventory.json`).*

### 2. Run the Platform
You will need two terminals to run the full stack locally:

**Terminal 1: Start the Backend**
```bash
npm install
npm run server
```
*(Runs the Express API on port `3001` using `ts-node`)*

**Terminal 2: Start the Frontend**
```bash
npm run dev
```
*(Runs the Vite development server on port `5173`)*

## Deploying to Vercel (Production Setup)

This project is deeply integrated with Vercel's serverless infrastructure. Because serverless environments use read-only file systems, we rely on Vercel's cloud storage solutions to manage state and media.

### Step 1: Link Your Repository
1. Push this codebase to a GitHub, GitLab, or Bitbucket repository.
2. Log into [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your repository. Vercel will automatically detect Vite and the `vercel.json` file.
4. Click **Deploy**. *(Note: The initial deployment will work, but the admin panel will fail to save images until you complete Step 2).*

### Step 2: Provision Cloud Storage
Once deployed, navigate to your Project Dashboard on Vercel.
1. Click the **Storage** tab.
2. **Create a Database**: Select **Upstash Redis** (or Vercel KV). This will act as your `inventory.json`.
3. **Create a Blob**: Select **Vercel Blob**. This will act as your `public/assets/` directory for uploading images.
4. Vercel will automatically bind these storage buckets to your project and inject the necessary environment variables behind the scenes.

### Step 3: Add External Environment Variables
Go to **Settings > Environment Variables** and add the following keys:
- `ADMIN_PASSWORD`: Your secure password for the `/admin` portal.
- `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key (starts with `pk_...`).
- `STRIPE_SECRET_KEY`: Your Stripe secret key (starts with `sk_...`).

*(Vercel handles all the `UPSTASH` and `BLOB` keys for you automatically).*

### Step 4: Run the Cloud Migration
If you have been running the app locally and have images saved in your local `public/assets` folder, you must migrate them to the cloud.

1. Open your local terminal in the project directory.
2. Pull down the new environment variables from Vercel by creating a `.env.local` file and pasting the `UPSTASH` and `BLOB` keys that Vercel generated.
3. Run the automated migration script:
   ```bash
   npm run cloud-setup
   ```
   *This script will safely stream all your local images up to Vercel Blob, rewrite your inventory with the new permanent CDN URLs, and inject the JSON object directly into your Upstash Redis database.*

Your store is now fully serverless and ready for live traffic!
