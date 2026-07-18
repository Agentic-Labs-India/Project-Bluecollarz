"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth/auth-client";

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={className ?? "size-7 shrink-0"}>
      <AvatarImage
        src="/logo.svg"
        alt="Gulf Path"
        className="object-contain p-1"
      />
      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
        GP
      </AvatarFallback>
    </Avatar>
  );
}

export function UserChatAvatar({
  name,
  image,
  className,
}: {
  name?: string;
  image?: string;
  className?: string;
}) {
  const label = name?.trim() || "You";
  const initial = label.charAt(0).toUpperCase() || "U";

  return (
    <Avatar className={className ?? "size-7 shrink-0"}>
      <AvatarImage src={image || ""} alt={label} />
      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

/** Session-backed user avatar for chat rows (call once per screen). */
export function useChatUserAvatar() {
  const { data: session } = authClient.useSession();
  return {
    name: session?.user?.name?.trim() || "You",
    image: session?.user?.image || "",
  };
}
