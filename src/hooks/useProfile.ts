import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type Profile = {
  user_id: string;
  full_name: string | null;
  restaurant_name: string | null;
  created_at: string;
};

export function useProfile(userId: string) {
  const qc = useQueryClient();

  const query = useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id,full_name,restaurant_name,created_at")
        .eq("user_id", userId)
        .maybeSingle();
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const upsert = useMutation({
    mutationFn: async (values: { full_name: string; restaurant_name: string }) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, ...values }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });

  return { ...query, upsert };
}
