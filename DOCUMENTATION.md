# Anakin Outreach Automation — End-to-End Documentation

## 1. System Overview

This system automates B2B outreach by connecting **HubSpot CRM** and **Resend Email API** through three Node.js scripts and a shared state file. No third-party automation platform (like n8n or Zapier) is used.

---

## 2. Architecture

```
┌──────────────────┐        ┌──────────────────┐
│  add_contacts.js │        │  send_emails.js   │
│  (Run once)      │        │  (Run once)       │
│                  │        │                   │
│ ▸ Reads contacts │        │ ▸ Sends emails     │
│   list           │        │   via Resend API  │
│ ▸ POST to        │        │ ▸ Writes state to │
│   HubSpot API    │        │   followup_state  │
│                  │        │ ▸ Schedules 48h   │
│   Contacts live  │        │   follow-up timer │
│   in HubSpot ✅  │        │                   │
└──────────────────┘        └────────┬──────────┘
                                     │ writes
                                     ▼
                           ┌──────────────────┐
                           │followup_state.json│
                           │                   │
                           │ { email: {        │
                           │   replied: false, │
                           │   followUpSent:   │
                           │   false ... }     │
                           └────────┬──────────┘
                                    │ reads
                                    ▼
┌──────────────────┐       ┌──────────────────┐
│  Resend Webhooks │──────▶│ reply_tracker.js  │
│  (Cloud service) │       │ (Always running)  │
│                  │       │                   │
│ ▸ Fires events   │       │ ▸ ON email.opened │
│   to your /web   │       │   → adds HubSpot  │
│   hook URL       │       │     note          │
│                  │       │ ▸ ON email.clicked│
│                  │       │   → adds HubSpot  │
└──────────────────┘       │     note          │
         ▲                 │ ▸ ON inbound.email│
         │                 │   → adds note     │
    ngrok tunnel           │   → creates Deal  │
    (public URL)           │   → cancels       │
         │                 │     follow-up     │
    localhost:3000         └──────────────────┘
```

---

## 3. Complete Data Flow

### Step A: Contact Creation (`add_contacts.js`)

```
Your contacts list (hardcoded)
          │
          ▼
HubSpot REST API  POST /crm/v3/objects/contacts
          │
          ▼
HubSpot CRM ─ Contacts: Tosh Kothari, Viral Patel, Viral SenseHawk
```

**What gets stored in HubSpot:**
- `email`, `firstname`, `lastname`, `company`

---

### Step B: Email Sending (`send_emails.js`)

```
contacts[] array
    │
    ├──▶ buildHTML(name, intro, bullets, cta) → HTML email body
    │
    ├──▶ Resend API  POST /emails
    │       ├── from: Anakin AI <your@email.com>
    │       ├── to: contact.email
    │       ├── subject: personalized per persona
    │       └── tags: campaign=anakin-outreach-2025, persona=founder|insider|partner
    │
    ├──▶ followup_state.json
    │       └── { email: { replied: false, followUpSent: false, sentAt: ... } }
    │
    └──▶ setTimeout(48h) → scheduleFollowUp()
              │
              └──▶ Checks followup_state.json
                       ├── if replied=true → cancel (do nothing)
                       └── if replied=false → send follow-up email via Resend
```

---

### Step C: Event Tracking (`reply_tracker.js`)

```
Internet (Resend servers)
          │
          ▼
ngrok tunnel (public URL: https://xxx.ngrok-free.app)
          │
          ▼
localhost:3000/webhook  ← Express server
          │
          ├── event: email.opened
          │       └──▶ findContact(toEmail) in HubSpot
          │                   └──▶ addNote(contactId, "👁️ Email opened — [timestamp]")
          │
          ├── event: email.clicked
          │       └──▶ findContact(toEmail) in HubSpot
          │                   └──▶ addNote(contactId, "🖱️ Link clicked — [link]")
          │
          └── event: inbound.email (reply received)
                  └──▶ findContact(fromEmail) in HubSpot
                             ├──▶ addNote(contactId, "📨 Reply received — [snippet]")
                             ├──▶ createDeal("Firstname Lastname — Inbound Reply")
                             │         └──▶ Associate deal to contact
                             └──▶ followup_state.json
                                       └── { replied: true, repliedAt: ... }
                                            → Follow-up timer is now cancelled
```

---

## 4. The Shared State File (`followup_state.json`)

This JSON file is the **bridge between `send_emails.js` and `reply_tracker.js`**. It prevents follow-ups being sent to people who have already replied.

**Structure:**
```json
{
  "ios.sagarkrishna@gmail.com": {
    "name": "Tosh",
    "persona": "founder",
    "sentAt": "2025-03-11T10:00:00.000Z",
    "replied": false,
    "followUpSent": false,
    "followUpSentAt": null,
    "repliedAt": null
  }
}
```

| Field | Set By | Meaning |
|-------|--------|---------|
| `sentAt` | `send_emails.js` | When the first email was sent |
| `replied` | `reply_tracker.js` | Whether the contact replied |
| `repliedAt` | `reply_tracker.js` | Timestamp of reply |
| `followUpSent` | `send_emails.js` | Whether follow-up was sent |
| `followUpSentAt` | `send_emails.js` | Timestamp of follow-up |

---

## 5. API Integrations

### HubSpot APIs Used

| Action | Endpoint | Script |
|--------|----------|--------|
| Create Contact | `POST /crm/v3/objects/contacts` | `add_contacts.js` |
| Search Contact | `POST /crm/v3/objects/contacts/search` | `reply_tracker.js` |
| Add Note | `POST /crm/v3/objects/notes` | `reply_tracker.js` |
| Create Deal | `POST /crm/v3/objects/deals` | `reply_tracker.js` |
| Link Deal → Contact | `PUT /crm/v3/objects/deals/{id}/associations/...` | `reply_tracker.js` |

### Resend APIs Used

| Action | Endpoint | Script |
|--------|----------|--------|
| Send Email | `POST /emails` | `send_emails.js` |
| Receive Webhook Events | `POST /webhook` (your server) | `reply_tracker.js` |

---

## 6. Scripts Summary

| Script | Purpose | Run When |
|--------|---------|----------|
| `add_contacts.js` | Adds 3 contacts to HubSpot | Once, before emailing |
| `send_emails.js` | Sends personalized emails + starts 48h follow-up timer | Once per campaign |
| `reply_tracker.js` | Webhook server — logs opens/clicks/replies to HubSpot | Always running |

---

## 7. End-to-End Timeline

```
T+0h    → node add_contacts.js   → 3 contacts created in HubSpot
T+0h    → node send_emails.js    → 3 emails sent, 48h timers started
T+1h    → Recipient opens email  → reply_tracker logs "email opened" note in HubSpot
T+2h    → Recipient clicks link  → reply_tracker logs "link clicked" note in HubSpot
T+5h    → Recipient replies      → reply_tracker logs note + creates Deal + cancels follow-up
T+48h   → (If no reply)         → Follow-up email auto-sent by send_emails.js timer
```

---

## 8. Project File Structure

```
anakin-outreach/
├── add_contacts.js       ← Step 1: Seed HubSpot CRM
├── send_emails.js        ← Step 2: Send personalized outreach
├── reply_tracker.js      ← Step 3: Webhook server (keep running)
├── followup_state.json   ← Auto-created, shared between scripts
├── .env                  ← Your API keys (never commit this!)
├── package.json          ← Node.js dependencies
└── README.md             ← Quick start guide
```
