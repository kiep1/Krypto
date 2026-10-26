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

The provided Payment Link is used only after a signed-in user requests checkout. In Stripe, edit the link to collect a payment method and grant a seven-day subscription trial (`subscription_data.trial_period_days = 7`). After the trial, Stripe must automatically bill the saved payment method at $9.99 USD monthly until cancellation. The server verifies the active link, the seven-day trial, payment-method collection, and the exact monthly price before enabling checkout. It adds a random, single-use `client_reference_id`; a Stripe webhook maps a verified trial or paid subscription back to that account.

The seven-day duration, payment method requirement, first post-trial price, automatic monthly renewal, and cancellation steps are shown on the plan page, account page, and Stripe Checkout before the customer starts the trial. The account page shows the recorded trial end date after checkout. This app does not currently send a separate trial-ending reminder email.

- `STRIPE_PAYMENT_LINK_URL=https://buy.stripe.com/aFabJ1gcMdvv8AY7lGfnO01`
- `STRIPE_PAYMENT_LINK_ID` to the corresponding `plink_...` ID from Stripe
- `STRIPE_SECRET_KEY` using the live secret key
- `STRIPE_WEBHOOK_SECRET` from the webhook endpoint configuration

Register `https://www.candletutor.com/api/stripe/webhook` in Stripe and enable these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

The subscription remains Premium while its verified Stripe status is `trialing`, then becomes paid after Stripe successfully starts billing. If the user cancels during the trial, Stripe's subscription update removes the Premium status.

Also configure Stripe's customer portal so users can manage or cancel subscriptions. The checkout page requests English locale, but merchant branding is controlled in Stripe.

## 5. Limits and content

- Free: 3 chart analyses and 5 lesson-tutor answers per UTC day; first 3 of 11 lessons.
- Premium: up to 30 chart analyses and 50 tutor answers per UTC day; all 11 lessons.
- Premium: 7 days free, then $9.99 USD per month, automatically recurring until cancellation.

Premium lessons are served only after a verified active/trialing subscription check. Successful signed-in chart analyses are automatically saved with their image. Each record can be deleted from the private journal; account deletion also removes saved records and cancels an active subscription.

## 6. Health check

After deployment, open `/api/health`. `accountsEnabled` should be `true`; `paymentsEnabled` should be `true` only after all payment and Premium-content settings are correct. The account page must offer Google sign-in and show the Stripe upgrade flow before checkout is considered live.

## 7. Google indexing and Render free service behavior

The canonical homepage is `https://www.candletutor.com/`; HTTP and apex-host variants redirect to it and should not be submitted as separate pages. The repository `robots.txt` allows public pages and excludes only private/API routes. Render Free web services can return a platform-level `Disallow: /` robots response while the service is spun down. Upgrade the web service to an always-on paid plan before asking Google to recrawl. Then verify the live canonical URL and sitemap in Search Console and request indexing for `https://www.candletutor.com/`.
