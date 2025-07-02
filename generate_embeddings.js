require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { OpenAI } = require("openai");

// Load environment variables from .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedFAQs() {
  // 1. Fetch all question + answer rows from Supabase
  const { data: faqs, error } = await supabase
    .from("profile_faqs")
    .select("id, question, answer"); // we’ll filter nulls later

  if (error) {
    console.error("❌ Error fetching FAQs:", error);
    return;
  }

  // 2. Loop through each FAQ row
  for (const faq of faqs) {
    const input = `${faq.question}\n${faq.answer}`;
    console.log(`🔄 Generating embedding for FAQ ID ${faq.id}: ${faq.question}`);

    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error: updateError } = await supabase
        .from("profile_faqs")
        .update({ embedding })
        .eq("id", faq.id);

      if (updateError) {
        console.error(`❌ Error updating FAQ ID ${faq.id}:`, updateError);
      } else {
        console.log(`✅ Embedded FAQ ID ${faq.id}`);
      }

    } catch (err) {
      console.error(`❌ OpenAI error on FAQ ID ${faq.id}:`, err.message);
    }
  }

  console.log("🎉 All embeddings generated and stored!");
}

// Call the function
embedFAQs();

