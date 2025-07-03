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
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 5,
      profile_filter: profile_name
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
    res.json({ answer: chatbotReply, match: topMatch.question }); // 🆕 returns match too!
  } catch (err) {
    console.error("🔥 Server error:", err);
    res.status(500).json({ error: "Chatbot failed to respond." });
  }
});
