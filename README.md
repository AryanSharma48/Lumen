# Lumen

>**Live Demo:** [https://lumenaudit.vercel.app](https://lumenaudit.vercel.app)

Lumen is a lead-generation tool that helps startup founders and engineering managers analyze their AI subscriptions, identify overspending, and find cheaper alternatives.

## Getting Started Locally

Follow these instructions to clone and run the application on your local machine.

### 1. Environment Variables

This project requires a few external services to function. You will need API keys for Supabase, Google Gemini, and Resend.

Copy the provided example file to create your local environment file:
```bash
cp .env.example .env.local
```

You **must** populate `.env.local` with the following variables (matching the exact keys found in `.env.example`):

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | Your Supabase Project URL (Dashboard → Project Settings → API). |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key for backend access. |
| `GEMINI_API_KEY` | Your Google AI Studio API Key. |
| `RESEND_API_KEY` | Your Resend API key for transactional emails. |
| `NEXT_PUBLIC_APP_URL` | The base URL used in email templates. Use `http://localhost:3000` locally. |

### 2. Installation & Startup

Once your environment variables are configured, install the dependencies and start the development server:

```bash
npm install
npm run dev
```

The application will spin up and be accessible at [http://localhost:3000](http://localhost:3000).

### Available Scripts

- `npm run dev` - Starts the local development server.
- `npm run build` - Builds the Next.js application for production.
- `npm run test` - Runs the Vitest test suite.
- `npm run lint` - Runs ESLint against the codebase.
