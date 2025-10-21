type Provider = "anthropic" | "openrouter" | "ollama" | "local";

interface GenerateOptions {
  model?: string;
}

function resolveProvider(): Provider {
  const value = process.env.AI_PROVIDER?.toLowerCase();
  if (value === "anthropic" || value === "openrouter" || value === "ollama") {
    return value;
  }
  return "local";
}

function resolveModel(options?: GenerateOptions): string {
  if (options?.model && options.model.trim().length > 0) {
    return options.model.trim();
  }
  const envModel = process.env.AI_MODEL;
  if (envModel && envModel.trim().length > 0) {
    return envModel.trim();
  }
  return "claude-3-sonnet-20240620";
}

async function ensureOk(response: Response, provider: Provider): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await response.text();
  throw new Error(
    `[aiProvider] ${provider} request failed: ${response.status} ${response.statusText} - ${body}`
  );
}

export async function generateAIResponse(
  prompt: string,
  options?: GenerateOptions
): Promise<string> {
  const provider = resolveProvider();
  const model = resolveModel(options);

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "[aiProvider] ANTHROPIC_API_KEY must be set when AI_PROVIDER=anthropic"
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    await ensureOk(response, provider);
    const data = (await response.json()) as {
      content?: Array<{ text?: string }>;
    };
    return data?.content?.[0]?.text ?? JSON.stringify(data);
  }

  if (provider === "openrouter") {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(
        "[aiProvider] OPENROUTER_API_KEY must be set when AI_PROVIDER=openrouter"
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    await ensureOk(response, provider);
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
  }

  if (provider === "ollama") {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || "llama3", prompt }),
    });

    await ensureOk(response, provider);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let output = "";

    if (!reader) {
      return output;
    }

    // Ollama streams newline-delimited JSON objects.
    // Accumulate the text field from each chunk if present.
    let buffered = "";
    while (true) {
      const chunk = await reader.read();
      if (!chunk || chunk.done) {
        break;
      }

      buffered += decoder.decode(chunk.value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as { response?: string };
          if (parsed.response) {
            output += parsed.response;
          }
        } catch {
          output += line;
        }
      }
    }

    if (buffered.trim()) {
      try {
        const parsed = JSON.parse(buffered) as { response?: string };
        if (parsed.response) {
          output += parsed.response;
        } else {
          output += buffered;
        }
      } catch {
        output += buffered;
      }
    }

    return output;
  }

  console.warn(
    `[aiProvider] No provider found for ${provider}, returning mock response.`
  );
  return `MOCK_RESULT for: ${prompt.substring(0, 100)}...`;
}
