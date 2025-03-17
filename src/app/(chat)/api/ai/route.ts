import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { appendClientMessage, appendResponseMessages, streamText } from "ai";
import { saveChat } from "@/server/db/chat-store";
import {
  loadChatMessages,
  validateChatOwnership,
} from "@/server/db/message-loader";
import { type Message, smoothStream, wrapLanguageModel } from "ai";
import { cacheMiddleware } from "@/ai/cache-middleware";
import { createIdGenerator } from "ai";
import { gemish } from "@/ai/model";

export const maxDuration = 30;

export async function POST(req: Request) {
  // Get only the last message from the client
  const {
    message,
    id,
    model,
  }: { message: Message; id: string; model: string } = await req.json();

  if (!message || !id) {
    return NextResponse.json(
      { error: "Message and chat ID are required" },
      { status: 400 }
    );
  }

  console.log(JSON.stringify(message, null, 2), "API");

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Validate the chat belongs to this user
    const isValidChat = await validateChatOwnership(id, session.user.id);

    if (!isValidChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Load previous messages from the database
    const previousMessages = await loadChatMessages(id);

    const messages = appendClientMessage({
      messages: previousMessages[0].content === "" ? [] : previousMessages,
      message,
    });

    console.log(JSON.stringify(messages, null, 2), "API");

    // check if user has sent a PDF
    const messagesHaveAttachments = messages.some(
      (message) => message.experimental_attachments
    );

    const result = streamText({
      model: messagesHaveAttachments
        ? gemish.languageModel("normal")
        : gemish.languageModel(model),
      messages,
      system:
        "You are a helpful assistant. Respond to the user in Markdown format.",
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
      experimental_generateMessageId: createIdGenerator({
        prefix: "msgs",
        separator: "_",
      }),
      async onFinish({ response }) {
        await saveChat({
          id,
          userId: session.user.id,
          messages: appendResponseMessages({
            messages: messages,
            responseMessages: response.messages,
          }),
        });
      },
    });

    // consume the stream to ensure it runs to completion & triggers onFinish
    // even when the client response is aborted:
    result.consumeStream(); // no await
    return result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });
  } catch (error) {
    console.error("Error in AI API route:", error);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
