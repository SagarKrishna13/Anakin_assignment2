// add_contacts.js
// Adds 3 contacts to HubSpot CRM
// Run: node add_contacts.js

require("dotenv").config();

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;

const contacts = [
  {
    email: "ios.sagarkrishna@gmail.com",
    firstname: "Tosh",
    lastname: "Kothari",
    company: "Anakin AI",
    persona: "founder",
  },
  {
    email: "ios.sagarkrishna+viral@gmail.com",
    firstname: "Viral",
    lastname: "Patel",
    company: "Anakin AI",
    persona: "insider",
  },
  {
    email: "ios.sagarkrishna+test@gmail.com",
    firstname: "Nikesh",
    lastname: "Bakshi",
    company: "SenseHawk",
    persona: "partner",
  },
];

async function createContact(contact) {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        email: contact.email,
        firstname: contact.firstname,
        lastname: contact.lastname,
        company: contact.company,
      },
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`✅  Added: ${contact.email}  →  HubSpot ID: ${data.id}`);
    return data.id;
  } else {
    if (data.message?.includes("Contact already exists")) {
      console.log(`⚠️   Already exists: ${contact.email} — skipping`);
      return null;
    }
    console.error(`❌  Failed: ${contact.email}  →  ${data.message}`);
    return null;
  }
}

(async () => {
  console.log("\n── Adding contacts to HubSpot ──\n");
  for (const contact of contacts) {
    await createContact(contact);
  }
  console.log("\n✅  Done. Check HubSpot → Contacts to confirm.\n");
})();
