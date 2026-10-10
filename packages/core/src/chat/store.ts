import type { ChatMessage, Conversation, ExpertMode } from "../types.js";

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createConversation(expertMode: ExpertMode, title?: string): Conversation {
  const now = Date.now();
  return {
    id: newId("convo"),
    title: title ?? "New brief",
    expertMode,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function titleFromPrompt(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 42 ? clean || "New brief" : `${clean.slice(0, 40)}…`;
}

export function appendMessage(convo: Conversation, msg: Omit<ChatMessage, "id" | "createdAt">): Conversation {
  const next: ChatMessage = { ...msg, id: newId("msg"), createdAt: Date.now() };
  return {
    ...convo,
    title: convo.messages.length === 0 && msg.role === "user" ? titleFromPrompt(msg.content) : convo.title,
    messages: [...convo.messages, next],
    updatedAt: Date.now(),
  };
}

export function exportConversationMarkdown(convo: Conversation): string {
  const lines = [
    `# ${convo.title}`,
    `Mode: ${convo.expertMode}`,
    `Updated: ${new Date(convo.updatedAt).toISOString()}`,
    "",
  ];
  for (const m of convo.messages) {
    lines.push(`## ${m.role}`, "", m.content, "");
    if (m.citations?.length) {
      lines.push("Citations:");
      for (const c of m.citations) lines.push(`- ${c.title} (${c.source})`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
