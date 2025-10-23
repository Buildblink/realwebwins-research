import OpenAI from 'openai';

// Load .env.local automatically via CLI flag: node --env-file .env.local scripts/check-openai.mjs
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Add it to .env.local before running this script.');
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: 'Reply with the word "pong".',
  });

  console.log(response.output_text);
}

main().catch((error) => {
  console.error('API request failed:', error.message);
  process.exit(1);
});
