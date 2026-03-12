// test_delivery.js - Diagnostic script
require("dotenv").config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const EMAILS = [
  "ios.sagarkrishna@gmail.com",
  "ios.sagarkrishna+viral@gmail.com",
  "ios.sagarkrishna+test@gmail.com"
];

async function test() {
  console.log("🚀 Testing delivery for 3 email variations...\n");
  for (const to of EMAILS) {
    console.log(`📡 Sending to: ${to}...`);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Anakin AI Delivery Test <${FROM_EMAIL}>`,
        to: [to],
        subject: `Delivery Test for ${to}`,
        html: `<p>Test email for tracking verification.</p>`,
      }),
    });
    const data = await res.json();
    if (res.status === 200 || res.status === 201) {
      console.log(`✅ Success! ID: ${data.id}\n`);
    } else {
      console.log(`❌ FAILED: ${res.status}`);
      console.log(`   Message: ${data.message || JSON.stringify(data)}\n`);
    }
  }
}

test().catch(console.error);
