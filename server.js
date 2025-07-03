const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { OpenAI } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// Init Supabase and OpenAI
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// ✅ Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Chat endpoint
app.post("/chat", async (req, res) => {
  const { question, profile_name } = req.body;
  console.log("📨 Received question:", question);

  try {
    const embed = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question
    });

    const queryEmbedding = embed.data[0].embedding;

    const { data: matches, error } = await supabase.rpc("match_profile_faqs", {
  query_embedding: embedding,
  match_threshold: 0.78,
  match_count: 5,
  profile_filter: profile_name, // 💡 make sure this is defined above
});
    
    console.log("🔍 Match results from Supabase:", matches);

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ error: "Supabase query failed" });
    }

    const topMatch = matches[0];
    if (!topMatch) {
      return res.json({ answer: "Hmm, I’m not sure about that — try rephrasing your question?" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful, warm, and knowledgeable assistant who helps users understand the Canine Personality Profile Test."
        },
        {
          role: "user",
          content: `Question: ${question}\n\nAnswer from FAQ: ${topMatch.answer}\n\nRespond naturally:`
        }
      ]
    });

    const chatbotReply = completion.choices[0].message.content;
    res.json({ answer: chatbotReply });
  } catch (err) {
    console.error("🔥 Server error:", err);
    res.status(500).json({ error: "Chatbot failed to respond." });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
