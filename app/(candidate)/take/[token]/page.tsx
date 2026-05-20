import { redirect } from "next/navigation";

export default async function DirectInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/take?code=${encodeURIComponent(token.toUpperCase())}`);
}
