import { performance } from "node:perf_hooks";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface AgentConfig {
  id?: string;
  name?: string;
  prompt: string;
  llm_provider?: string | null;
  llm_model?: string | null;
  temperature?: number | null;
}

interface RunLLMOptions {
  agent: AgentConfig;
  variables?: Record<string, string>;
}

export interface LLMRunResult {
  content: string;
  provider: string;
  model: string;
  durationMs: number;
  tokens?: number | null;
  raw?: unknown;
}

function interpolatePrompt(prompt: string, variables: Record<string, string> = {}) {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    return acc.replace(pattern, value);
  }, prompt);
}

export async function runLLM({ agent, variables }: RunLLMOptions): Promise<LLMRunResult> {
  const provider = (agent.llm_provider ?? "openai").toLowerCase();
  const model = agent.llm_model ?? "gpt-4o-mini";
  const temperature = agent.temperature ?? 0.7;
  const prompt = interpolatePrompt(agent.prompt, variables);
  const startedAt = performance.now();

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY missing");
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model,
      temperature,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "";
    return {
      content,
      provider,
      model,
      durationMs: Math.round(performance.now() - startedAt),
      tokens: response.usage?.total_tokens ?? null,
      raw: response,
    };
  }

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY missing");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      temperature,
      messages: [{ role: "user", content: prompt }],
    });
    const content =
      response.content
        ?.map((chunk) => ("text" in chunk ? chunk.text : ""))
        .join("")
        .trim() ?? "";
    return {
      content,
      provider,
      model,
      durationMs: Math.round(performance.now() - startedAt),
      tokens:
        typeof response.usage?.input_tokens === "number" &&
        typeof response.usage?.output_tokens === "number"
          ? response.usage.input_tokens + response.usage.output_tokens
          : null,
      raw: response,
    };
  }

  if (provider === "gemini") {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY missing");
    }
    const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const generativeModel = gemini.getGenerativeModel({ model });
    const response = await generativeModel.generateContent(prompt);
    const content = response.response?.text?.() ?? "";
    return {
      content,
      provider,
      model,
      durationMs: Math.round(performance.now() - startedAt),
      tokens: response.response?.usageMetadata?.totalTokenCount ?? null,
      raw: response,
    };
  }

  if (provider === "local") {
    console.warn("[runLLM] Mock local provider used (no external call).");
    const content = `Mock response for ${prompt.slice(0, 60)}...`;
    return {
      content,
      provider,
      model,
      durationMs: Math.round(performance.now() - startedAt),
      tokens: null,
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
