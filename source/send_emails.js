// send_emails.js
// Sends personalized emails via Resend
// + auto follow-up if no reply in 48 hours
// Run: node send_emails.js

require("dotenv").config();
const fs = require("fs");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const STATE_FILE = "./followup_state.json";

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const contacts = [
  {
    email: "ios.sagarkrishna@gmail.com",
    name: "Tosh", persona: "founder",
    subject: "Tosh — AI workflows that actually ship",
    intro: `I came across your work and was struck by your focus on
            <strong>making intelligent systems genuinely useful</strong>
            in production — not just demos.`,
    bullets: [
      "🔗 <strong>Visual workflow builder</strong> — connect LLMs, APIs and logic in minutes",
      "⚡ <strong>Autonomous AI agents</strong> — execute tasks across your entire stack",
      "📊 <strong>Full observability</strong> — every decision logged and improvable",
    ],
    cta: "Would love 20 minutes to show you what we're building. Free this week?",
    followUp: {
      subject: "Re: Tosh — AI workflows that actually ship",
      body: `<p>Hi Tosh,</p>
             <p>Just bumping this — I know inboxes get busy.</p>
             <p>Happy to send a short demo video instead if that's easier?</p>`,
    },
  },
  {
    email: "ios.sagarkrishna+viral@gmail.com", // Updated to unique test email
    name: "Viral", persona: "insider",
    subject: "Viral — what's shipping next at Anakin 🚀",
    intro: `As part of the Anakin team, I wanted to make sure you're seeing
            the full scope of what's coming — especially the
            <strong>multi-agent orchestration layer</strong> rolling out next quarter.`,
    bullets: [
      "🧠 <strong>Agent chaining</strong> — compose specialized agents into pipelines",
      "🔄 <strong>Human-in-the-loop gates</strong> — approval steps built into flows",
      "🛡️ <strong>SOC2-ready</strong> — audit trails, RBAC, data residency controls",
    ],
    cta: "I'd love 15 minutes to walk through the roadmap and get your thoughts.",
    followUp: {
      subject: "Re: Viral — what's shipping next at Anakin 🚀",
      body: `<p>Hi Viral,</p>
             <p>Following up — your input on the roadmap would be super valuable.</p>
             <p>Even 10 minutes. When works for you?</p>`,
    },
  },
  {
    email: "ios.sagarkrishna+test@gmail.com", // Updated to unique test email
    name: "Nikish", persona: "partner",
    subject: "Nikish — from drone intelligence to AI workflows",
    intro: `Your work at SenseHawk — turning drone imagery into actionable intelligence
            for solar and infrastructure — is exactly the kind of
            <strong>real-world AI application</strong> Anakin AI was built to accelerate.`,
    bullets: [
      "🛰️ <strong>Data pipeline automation</strong> — ingest and act on sensor/image data at scale",
      "🤖 <strong>Domain-trained agents</strong> — deployable in days, not months",
      "📡 <strong>Edge-friendly</strong> — designed where connectivity is limited",
    ],
    cta: "Open to 20 minutes this week? No hard pitch — just a good conversation.",
    followUp: {
      subject: "Re: Viral — from drone intelligence to AI workflows",
      body: `<p>Hi Viral,</p>
             <p>Bumping this in case it got buried.</p>
             <p>The overlap between SenseHawk and Anakin feels genuinely worth 20 minutes.</p>`,
    },
  },
];

function buildHTML(name, intro, bullets, cta) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;background:#f5f2ec;margin:0;padding:40px 20px}
    .wrap{max-width:560px;margin:0 auto;background:#fff;border-left:4px solid #0f0f0f;
          padding:40px 48px;box-shadow:0 2px 20px rgba(0,0,0,.06)}
    .brand{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#999;margin-bottom:32px}
    .brand span{color:#0f0f0f;font-weight:700}
    p{color:#2d2d2d;font-size:15px;line-height:1.85;margin:0 0 18px}
    table{width:100%;border-collapse:collapse;margin:0 0 20px}
    td{padding:11px 16px;font-size:14px;color:#2d2d2d;border-left:3px solid #e8441a}
    tr:nth-child(odd) td{background:#f9f6f1}
    tr:nth-child(even) td{background:#f0ece4}
    .sign{margin-top:28px;padding-top:20px;border-top:1px solid #e8e4dc}
    .sign p{font-size:13px;color:#666;margin:3px 0}
    .foot{margin-top:36px;font-size:10px;color:#bbb;letter-spacing:2px;text-transform:uppercase}
  </style></head><body><div class="wrap">
    <div class="brand">from <span>ANAKIN AI</span></div>
    <p>Hi ${name},</p><p>${intro}</p>
    <p><strong>Anakin AI</strong> is an AI workflow automation platform:</p>
    <table>${bullets.map(b => `<tr><td>${b}</td></tr>`).join("")}</table>
    <p>${cta}</p>
    <div class="sign"><p><strong>The Anakin AI Team</strong></p>
    <p>anakin.ai — AI Workflows, Simplified</p></div>
    <div class="foot">anakin.ai · built for builders</div>
  </div></body></html>`;
}

function buildFollowUpHTML(name, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;background:#f5f2ec;margin:0;padding:40px 20px}
    .wrap{max-width:560px;margin:0 auto;background:#fff;border-left:4px solid #e8441a;
          padding:40px 48px;box-shadow:0 2px 20px rgba(0,0,0,.06)}
    .badge{display:inline-block;background:#e8441a;color:white;font-size:9px;
           letter-spacing:3px;text-transform:uppercase;padding:3px 10px;margin-bottom:28px}
    p{color:#2d2d2d;font-size:15px;line-height:1.85;margin:0 0 18px}
    .sign{margin-top:28px;padding-top:20px;border-top:1px solid #e8e4dc}
    .sign p{font-size:13px;color:#666;margin:3px 0}
  </style></head><body><div class="wrap">
    <div class="badge">follow-up · anakin ai</div>
    ${body}
    <div class="sign"><p><strong>The Anakin AI Team</strong></p>
    <p>anakin.ai — AI Workflows, Simplified</p></div>
  </div></body></html>`;
}

async function sendViaResend(to, subject, html, extraTags = []) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Anakin AI <${FROM_EMAIL}>`,
      to: [to], subject, html,
      tags: [{ name: "campaign", value: "anakin-outreach-2025" }, ...extraTags],
    }),
  });
  return res.json();
}

function scheduleFollowUp(contact) {
  // For demo/testing: change to 2 * 60 * 1000 (2 minutes)
  const DELAY_MS = 48 * 60 * 60 * 1000;
  console.log(`   ⏰  Follow-up queued for ${contact.email} (fires in 48h if no reply)`);

  setTimeout(async () => {
    const state = loadState();
    if (state[contact.email]?.replied) {
      console.log(`\n🚫 Follow-up cancelled — ${contact.email} already replied`);
      return;
    }
    if (state[contact.email]?.followUpSent) {
      console.log(`\n🚫 Follow-up already sent to ${contact.email} — skipping`);
      return;
    }
    console.log(`\n📤 Sending follow-up to ${contact.email}...`);
    const html = buildFollowUpHTML(contact.name, contact.followUp.body);
    const data = await sendViaResend(contact.email, contact.followUp.subject, html, [
      { name: "type", value: "followup" },
    ]);
    if (data.id) {
      console.log(`   ✅ Follow-up sent → Resend ID: ${data.id}`);
      state[contact.email].followUpSent = true;
      state[contact.email].followUpSentAt = new Date().toISOString();
      saveState(state);
    } else {
      console.error(`   ❌ Follow-up failed:`, data.message);
    }
  }, DELAY_MS);
}

(async () => {
  console.log("\n── Sending personalized emails via Resend ──\n");
  const state = loadState();
  for (const contact of contacts) {
    const html = buildHTML(contact.name, contact.intro, contact.bullets, contact.cta);

    // Physical recipient is always the primary address for sandbox testing
    const physicalTo = "ios.sagarkrishna@gmail.com";

    // Resend tags ONLY allow: letters, numbers, underscores, and dashes.
    // We sanitize the email so it passes validation (e.g. name@email.com -> name_at_email_dot_com)
    const sanitizedEmail = contact.email
      .replace(/@/g, "_at_")
      .replace(/\+/g, "_plus_")
      .replace(/\./g, "_dot_");

    const data = await sendViaResend(physicalTo, contact.subject, html, [
      { name: "persona", value: contact.persona },
      { name: "hubspot_email", value: sanitizedEmail }
    ]);

    if (data.id) {
      console.log(`✅  Sent to ${physicalTo} (Target: ${contact.email}) | ID: ${data.id}`);
      state[contact.email] = {
        name: contact.name, persona: contact.persona,
        sentAt: new Date().toISOString(),
        replied: false, followUpSent: false,
        followUpSentAt: null, repliedAt: null,
      };
      scheduleFollowUp(contact);
    } else {
      console.error(`❌  Failed → ${contact.email}:`, data.message);
    }
    await new Promise(r => setTimeout(r, 600));
  }
  saveState(state);
  console.log("\n── All emails sent. Follow-up scheduler is active. ──");
  console.log("   Keep this process running for follow-ups to fire.");
  console.log("   💡 Testing: set DELAY_MS = 2 * 60 * 1000 (2 min)\n");
})();
