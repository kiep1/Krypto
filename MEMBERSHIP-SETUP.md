# ChartMentor membership setup

The member features fail closed until their required configuration is present. Without a database, Google OAuth credentials, Stripe webhook settings, and the Premium content key, the existing public site remains available but account, saved-journal, and paid-membership features stay disabled.

## 1. Create persistent storage

Create a PostgreSQL database in the same Render region as the `chartmentor-ai` web service, then set `DATABASE_URL` on the web service to the database's **internal** connection URL. The app creates its required tables at startup. Do not use an ephemeral web-service filesystem for user accounts or uploaded charts. Keep database credentials in Render environment settings, never in Git or chat.

The app stores each signed-in analysis image as a PostgreSQL binary value along with its context and AI response. Images remain until the user deletes the saved analysis or account. A production operator should select a persistent database plan and backup policy appropriate for the expected image volume.

## 2. Configure Google sign-in

Create a Google OAuth web client and authorize this exact redirect URI:

`https://www.candletutor.com/auth/google/callback`

Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and a unique `SESSION_SECRET` to the Render service environment. Do not paste credentials into chat, source files, or this repository.

## 3. Configure the Premium content key

The eight Premium lesson bodies are encrypted in `premium-lessons.enc`; only their public titles and summaries are in the source code. Copy the value from the separately delivered local key file `Krypto-premium-content-key.txt` into the Render environment variable `PREMIUM_CONTENT_KEY`. Do not commit or publish that key. Premium checkout stays disabled until the key can decrypt the lesson file.

## 4. Configure Stripe

The provided Payment Link is used only after a signed-in user requests checkout. The server adds a random, single-use `client_reference_id`; a Stripe webhook maps a verified subscription back to that account. Set these values in Render:

- `STRIPE_PAYMENT_LINK_URL=https://buy.stripe.com/aFabJ1gcMdvv8AY7lGfnO01`
- `STRIPE_PAYMENT_LINK_ID` to the corresponding `plink_...` ID from Stripe
- `STRIPE_SECRET_KEY` using the live secret key
- `STRIPE_WEBHOOK_SECRET` from the webhook endpoint configuration

Register `https://www.candletutor.com/api/stripe/webhook` in Stripe and enable these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Also configure Stripe's customer portal so users can manage or cancel subscriptions. The checkout page requests English locale, but merchant branding is controlled in Stripe.

## 5. Limits and content

- Free: 3 chart analyses and 5 lesson-tutor answers per UTC day; first 3 of 11 lessons.
- Premium: up to 30 chart analyses and 50 tutor answers per UTC day; all 11 lessons.
- Premium price: $9.99 USD per month, as shown by the supplied Stripe link.

Premium lessons are served only after a verified active/trialing subscription check. Successful signed-in chart analyses are automatically saved with their image. Each record can be deleted from the private journal; account deletion also removes saved records and cancels an active subscription.

## 6. Health check

After deployment, open `/api/health`. `accountsEnabled` should be `true`; `paymentsEnabled` should be `true` only after all payment and Premium-content settings are correct. The account page must offer Google sign-in and show the Stripe upgrade flow before checkout is considered live.
