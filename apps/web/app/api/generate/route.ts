import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { match } from "ts-pattern";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

// Create an OpenAI API client (that's edge friendly!)
// Using LLamma's OpenAI client:

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
export const runtime = "edge";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request): Promise<Response> {
  const openai = new OpenAI({
    ...(!isProd && {
      baseURL: "http://localhost:11434/v1",
    }),
    apiKey: isProd ? process.env.OPENAI_API_KEY : "ollama",
  });
  // Check if the OPENAI_API_KEY is set, if not return 400
  if (
    (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") &&
    isProd
  ) {
    return new Response(
      "Missing OPENAI_API_KEY - make sure to add it to your .env file.",
      {
        status: 400,
      },
    );
  }
  if (isProd && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `novel_ratelimit_${ip}`,
    );

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  let { prompt, option } = await req.json();

  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content:
          "You are an AI writing assistant that continues existing text based on context from prior text. " +
          "Give more weight/priority to the later characters than the beginning ones. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content:
          "Create a digital illustration of an AI assistant, represented as a futuristic robot, sitting at an antique wooden desk in a dimly lit room, surrounded by books and manuscripts. The robot is intently focusing on a glowing holographic display, where it's visibly enhancing and editing a piece of text. The room combines elements of the old world with the future, showcasing the blend of traditional writing with advanced technology. The atmosphere is serene and scholarly, emphasizing the AI's role as a meticulous editor and improver of written content. The image should capture the essence of old meets new, highlighting the AI's task of refining text with precision and creativity, making it more engaging, grammatically correct, and detailed, without exceeding the original text's length significantly." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: prompt,
      },
    ])
    .run() as ChatCompletionMessageParam[];

  console.log(messages);
  const response = await openai.chat.completions.create({
    model: process.env.NODE_ENV == "development" ? "llama2" : "gpt-3.5-turbo",
    stream: true,
    messages,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    n: 1,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
