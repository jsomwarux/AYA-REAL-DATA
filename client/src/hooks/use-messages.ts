import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

// Even though the requirement is just "AYA" text, I'm generating the hook based on the provided schema/routes
// in case it's needed later, following the "let unused APIs fail" instruction, 
// but for this specific "AYA" request, it might not be strictly used in the UI yet.

export function useMessages() {
  return useQuery({
    queryKey: [api.messages.list.path],
    queryFn: async () => {
      const res = await fetch(api.messages.list.path);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return api.messages.list.responses[200].parse(await res.json());
    },
  });
}
