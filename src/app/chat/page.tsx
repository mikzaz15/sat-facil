import ChatClient from "@/app/chat/chat-client";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return <ChatClient initialQuestion={params.q ?? ""} />;
}
