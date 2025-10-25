import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("🤖  Phase 17-18 Agent Relay Response Test\n");

  // 1️⃣ Create conversation
  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .insert([{ title: "Relay Handshake Test" }])
    .select()
    .single();
  if (convoErr) throw convoErr;

  console.log("✅ Conversation created:", convo.id);

  // 2️⃣ Send human message → Next.js relay endpoint
  const relayUrl = "http://localhost:3000/api/agents/relay"; //  change to prod URL if needed

  const payload = {
  conversation_id: convo.id,
  sender_agent: "human",
  receiver_agent: "assistant", // or "researcher" if your app uses that name
  content: "Hello agent, please reply briefly to confirm relay works.",
};



  console.log("🛰️ Sending message to relay...");
  const res = await fetch(relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const reply = await res.json();
  console.log("✅ Relay response:", reply);

  // 3️⃣ Check Supabase for AI reply in agent_messages
  console.log("🔍 Fetching conversation messages...");
  const { data: msgs, error: msgsErr } = await supabase
    .from("agent_messages")
    .select("role, content, created_at")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true });
  if (msgsErr) throw msgsErr;

  console.table(msgs);
}

main().catch((e) => {
  console.error("❌ Relay test failed:", e.message);
  process.exit(1);
});
