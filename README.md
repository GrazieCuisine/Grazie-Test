# GRAZIE

A front-end restaurant ordering website for GRAZIE.

## Run it

No build tools are required for the demo. The customer account system persists accounts in browser storage.

1. Extract the ZIP.
2. Open `index.html` in a browser.
3. For best results with browser restrictions, serve the folder from a local web server, for example:
   - VS Code + Live Server
   - Python: `python -m http.server 8000`
4. Open `http://localhost:8000`.

## Demo accounts

Customer:
- Create an account from `account.html`.
- Customer accounts are stored in the browser's `localStorage` under `dahiUsers`, so the same email/password can be used again on that browser.

Staff:
- Moderator and admin sign in through the same customer login terminal on `account.html`.
- Successful staff login automatically routes to `admin.html`.
- Moderator username: `moderator`
- Moderator password: `dahi123`
- Admin username: `admin`
- Admin password: `dahi123`

## Included

- Responsive restaurant website
- Italian-inspired pasta, pizza, and all-night menu
- Shopping cart
- Pickup, delivery, and dine-in order type
- $ configurable demo sales tax
- Coupon codes:
  - WELCOME10 = 10% off
  - GRAZIE5 = $5 off $30+
  - PICKUP15 = 15% off pickup
- Customer signup/login with persistent browser-stored accounts and profile management
- Order checkout
- Table reservations
- Local order/reservation history for staff
- Moderator dashboard
- Admin dashboard with tax/name/currency settings
- Browser localStorage persistence

## Important production note

This project is a functional front-end prototype. It is NOT a secure production authentication or payment system.

For a real restaurant deployment, move authentication, passwords, roles, orders, reservations, coupons and settings to a server/database. Never store plaintext passwords in localStorage. Use hashed passwords, secure sessions/JWTs, server-side authorization and validation, HTTPS, CSRF protection, rate limiting, audit logs, and a PCI-compliant payment provider such as Stripe Checkout/Payment Element or another supported gateway.

The 8.25% tax rate is only a demo value. Configure it for the restaurant's actual tax jurisdiction.


## GRAZIE AI Admin prototype (Phase 1)

The admin dashboard now includes a GRAZIE AI workspace for chat, document indexing, browser voice interaction, image analysis/generation hooks, automation-rule previews, and local order-data summaries/CSV export. Existing pages and workflows are otherwise left in place.

### Run the optional AI backend

1. Install Python 3.10+.
2. In the extracted project folder, run `python -m pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and add an OpenAI API key (server-side only).
4. Start the API with `uvicorn ai_backend:app --reload --host 127.0.0.1 --port 8000`.
5. Serve the project files from the same computer (for example `python -m http.server 8080`) and open `http://127.0.0.1:8080/account.html` to sign in as the demo admin, then open the dashboard.

The browser UI falls back to local guidance when the API is not running. The optional API stores knowledge documents in a local SQLite database and uses simple text retrieval as a Phase 1 RAG baseline. Chat/image features require provider credentials and supported API access. Voice uses browser speech APIs. For production, replace the demo browser-stored staff session with server-side sessions and role authorization; configure PostgreSQL + pgvector, secure uploads, HTTPS, audit logging, rate limiting, backups and a real scheduler before exposing it publicly. Do not treat this prototype as production-secure.


### Troubleshooting the AI API

- If chat shows a network/CORS error, start the FastAPI backend on `127.0.0.1:8000` when testing locally.
- For deployment, serve the API behind the same origin under `/api`, or set `window.GRAZIE_AI_API` before `ai.js` loads to the backend's HTTPS URL and add the website origin to the backend CORS allowlist.
- If the backend returns `OPENAI_API_KEY is not configured`, add a valid key to the server-side `.env` and restart FastAPI. Never put that key in browser JavaScript.
