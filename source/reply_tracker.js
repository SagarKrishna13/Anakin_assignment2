// reply_tracker.js
// Webhook server — listens for Resend events
// ON REPLY  → HubSpot note + create Deal + cancel follow-up
// ON OPEN   → HubSpot note
// ON CLICK  → HubSpot note
//
// Run:    node reply_tracker.js
// Expose: npx ngrok http 3000

require("dotenv").config();
const express = require("express");
const fs      = require("fs");
const app     = express();
app.use(express.json());

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const PORT          = process.env.PORT || 3000;
const STATE_FILE    = "./followup_state.json";

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function findContact(email) {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
      properties: ["email", "firstname", "lastname", "company"],
    }),
  });
  const data = await res.json();
  return data.results?.[0] || null;
}

async function addNote(contactId, noteText) {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { hs_note_body: noteText, hs_timestamp: Date.now() },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
      }],
    }),
  });
  const data = await res.json();
  if (res.status >= 400) {
    console.error(`   ❌ Failed to add note: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function createDeal(contact, replySubject) {
  const firstname = contact.properties.firstname || "";
  const lastname  = contact.properties.lastname  || "";
  const company   = contact.properties.company   || "Unknown";
  const now       = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        dealname:    `${firstname} ${lastname} — Inbound Reply`,
        dealstage:   "appointmentscheduled",
        pipeline:    "default",
        closedate:   new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        description: `Auto-created when ${firstname} replied to Anakin AI outreach.\n` +
                     `Reply subject: ${replySubject}\nCompany: ${company}\nDate: ${now}`,
      },
    }),
  });

  const deal = await dealRes.json();
  if (!deal.id) {
    console.error("   ❌ Deal creation failed:", deal.message);
    return null;
  }
  console.log(`   🤝 Deal created → "${firstname} ${lastname} — Inbound Reply" (ID: ${deal.id})`);

  await fetch(
    `https://api.hubapi.com/crm/v3/objects/deals/${deal.id}/associations/contacts/${contact.id}/deal_to_contact`,
    { method: "PUT", headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` } }
  );
  console.log(`   🔗 Deal linked to contact ${contact.id}`);
  return deal;
}

app.post("/webhook", async (req, res) => {
  const event = req.body;
  const type  = event.type || "";
  const now   = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  console.log(`\n📩 [${now}] Event: ${type}`);
  console.log("   Raw payload:", JSON.stringify(event.data || {}).slice(0, 300));

  if (type === "inbound.email") {
    const fromEmail = event.data?.from?.address || "";
    const subject   = event.data?.subject       || "(no subject)";
    const snippet   = (event.data?.text || event.data?.html || "")
                        .replace(/<[^>]+>/g, "").trim().slice(0, 400);
    console.log(`   From: ${fromEmail}  Subject: ${subject}`);

    const contact = await findContact(fromEmail);
    if (contact) {
      // 1. Add note
      await addNote(contact.id,
        `📨 Reply received — ${now}\n\n` +
        `From: ${fromEmail}\nSubject: ${subject}\n\n` +
        `Snippet:\n${snippet || "(empty)"}\n\n---\nTracked via Resend webhook`
      );
      console.log(`   ✅ Note added for: ${contact.properties.firstname}`);

      // 2. Create HubSpot Deal
      await createDeal(contact, subject);

      // 3. Cancel follow-up
      const state = loadState();
      if (state[fromEmail]) {
        state[fromEmail].replied   = true;
        state[fromEmail].repliedAt = new Date().toISOString();
        saveState(state);
        console.log(`   📌 Follow-up cancelled for ${fromEmail}`);
      }
    } else {
      console.log(`   ⚠️  No contact found for ${fromEmail}`);
    }
  }

  else if (type === "email.opened") {
    // 1. Determine which email to look up in HubSpot
    // We prioritize the 'hubspot_email' tag we set in send_emails.js
    const tags = event.data?.tags || {};
    let taggedEmail = tags.hubspot_email;
    if (taggedEmail) {
      // Desanitize back to real email (reverse of send_emails.js)
      taggedEmail = taggedEmail
        .replace(/_at_/g, "@")
        .replace(/_plus_/g, "+")
        .replace(/_dot_/g, ".");
    }
    const toEmail = taggedEmail || event.data?.to?.[0] || "";

    const subject = event.data?.subject || event.data?.email?.subject || "(no subject)";
    console.log(`   Target: ${toEmail} (from tags: ${taggedEmail || "no"}) | Sub: ${subject}`);
    
    const contact = await findContact(toEmail);
    if (contact) {
      await addNote(contact.id,
        `👁️ Email opened — ${now}\nSubject: ${subject}\n---\nTracked via Resend webhook`
      );
      console.log(`   ✅ Open logged for: ${contact.properties.firstname}`);
    }
  }

  else if (type === "email.clicked") {
    const tags = event.data?.tags || {};
    const taggedEmail = tags.hubspot_email;
    const toEmail = taggedEmail || event.data?.to?.[0] || "";
    
    const link    = event.data?.click?.link || "";
    console.log(`   Target: ${toEmail} | Link: ${link}`);
    const contact = await findContact(toEmail);
    if (contact) {
      await addNote(contact.id,
        `🖱️ Link clicked — ${now}\nLink: ${link}\n---\nTracked via Resend webhook`
      );
      console.log(`   ✅ Click logged for: ${contact.properties.firstname}`);
    }
  }

  else {
    console.log(`   (Ignored — not a tracked event type)`);
  }

  res.status(200).json({ received: true });
});

app.get("/", (req, res) => {
  const state = loadState();
  res.json({
    status: "running ✅",
    contacts: Object.entries(state).map(([email, s]) => ({
      email, replied: s.replied, followUpSent: s.followUpSent,
    })),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Reply tracker → http://localhost:${PORT}`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   Expose:  npx ngrok http ${PORT}`);
  console.log(`   Resend events: email.opened  email.clicked  inbound.email\n`);
});
