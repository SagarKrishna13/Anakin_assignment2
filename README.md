# Anakin Outreach Automation - Quick Start

## 1. Initial Setup
1. **Install Node.js**: [nodejs.org](https://nodejs.org/) (restart your computer/VS Code if you just installed it).
2. **Set up a Custom Domain in Resend** (Required for reply tracking):
   - Go to [Resend Domains](https://resend.com/domains).
   - Click **Add Domain** and enter your domain (e.g., `outreach.yourcompany.com`).
   - Verify ownership by adding the TXT record to your DNS.
   - Set up MX records to point to Resend for inbound email forwarding.
   - Once verified, set `FROM_EMAIL` to an address on this domain (e.g., `noreply@outreach.yourcompany.com`).
3. **Create `.env` File**: Open `.env` and paste your API keys:
   ```env
   HUBSPOT_TOKEN=your_private_app_token
   RESEND_API_KEY=re_your_api_key
   FROM_EMAIL=onboarding@resend.dev  # Use your custom domain address
   PORT=3000
   ```
4. **Install Dependencies**: Open a VS Code terminal and run:
   ```bash
   npm install
   ```

---

## 2. Run the Scripts (In Order)

Open 3 separate terminals in VS Code (use the `+` button in the terminal panel).

### Terminal 1: Add Contacts & Send Emails
First, seed your HubSpot CRM:
```bash
node add_contacts.js
```
Then, send the personalized emails:
```bash
node send_emails.js
```
*(You are done with Terminal 1)*

### Terminal 2: Start the Webhook Tracker
This server runs in the background to log opens/replies to HubSpot.
```bash
node reply_tracker.js
```
*(Leave this terminal running!)*

### Terminal 3: Go Public with Ngrok
Connect Ngrok (first time only):
```bash
npx ngrok config add-authtoken YOUR_NGROK_TOKEN
```
Expose port 3000 to the internet:
```bash
npx ngrok http 3000
```
*(Leave this terminal running!)*

---

## 3. Connect the Webhook (Final Step)
1. Copy the `https://...` Forwarding URL generated in **Terminal 3**.
2. Go to [Resend Webhooks Dashboard](https://resend.com/webhooks).
3. Click **Add Webhook** -> paste your URL and add `/webhook` to the end.
   *(Example: `https://1234abcd.ngrok-free.app/webhook`)*
4. Select these events: `email.opened`, `email.clicked`, and `inbound.email` -> **Save**.

**You're done! Open the emails in your inbox, and watch your HubSpot Contacts get updated automatically.**
