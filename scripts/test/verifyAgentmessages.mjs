import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("🧩 Realwebwins Phase 17-18 Agent Message Test\n");

  // 1️⃣  Create a new conversation
  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .insert([{ title: "Phase 17-18 Sanity Check" }])
    .select()
    .single();

  if (convoErr) throw convoErr;
  console.log("✅ Conversation created:", convo.id);

  // 2️⃣  Insert a fake human message
  const { data: msg, error: msgErr } = await supabase
    .from("agent_messages")
    .insert([
      {
        conversation_id: convo.id,
        role: "human",
        content: "Hello agent, testing relay connection.",
      },
    ])
    .select()
    .single();

  if (msgErr) throw msgErr;
  console.log("✅ Message inserted:", msg.id);

  // 3️⃣  Fetch back conversation thread
  const { data: thread, error: threadErr } = await supabase
    .from("agent_messages")
    .select("role, content, created_at")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true });

  if (threadErr) throw threadErr;

  console.log("\n🧵 Conversation Thread:");
  console.table(thread);
}

main().catch((err) => {
  console.error("❌ Verification failed:", err.message);
  process.exit(1);
});
