require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { OpenAI } = require("openai");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function answerUserQuestion(question) {
  console.log(`🧠 User question: ${question}`);

  // Step 1: Generate embedding for the user question
  const embed = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });
  const queryEmbedding = embed.data[0].embedding;

  // Step 2: Search Supabase for best-matching FAQ
  const { data: matches, error } = await supabase.rpc("match_profile_faqs", {
    query_embedding: queryEmbedding,
    match_threshold: 0.6,
    match_count: 3
  });

  if (error) {
    console.error("❌ Supabase query error:", error);
    return;
  }

  console.log("📦 Raw Supabase matches:", matches);

  const topMatch = matches[0];
  if (!topMatch) {
    console.log("😕 No relevant answer found.");
    return;
  }

  // Step 3: Use GPT to generate a conversational reply
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a friendly and professional chatbot helping users understand the Canine Personality Profile Test. Answer clearly and conversationally.`
      },
      {
        role: "user",
        content: `Question: ${question}\n\nAnswer from the FAQ: ${topMatch.answer}\n\nRespond in a natural, helpful way:`
      }
    ]
  });

  const chatbotReply = chatCompletion.choices[0].message.content;
  console.log("🤖 GPT Reply:", chatbotReply);
}

// 💬 Test it
answerUserQuestion("Can I be a mix of two profiles?");

