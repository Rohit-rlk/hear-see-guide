import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useDescribeEnvironment() {
  const [isDescribing, setIsDescribing] = useState(false);
  const [description, setDescription] = useState<string | null>(null);

  const describe = useCallback(async (imageDataUrl: string) => {
    setIsDescribing(true);
    setDescription(null);
    try {
      const base64 = imageDataUrl.split(",")[1];
      const { data, error } = await supabase.functions.invoke("describe-environment", {
        body: { image: base64 },
      });
      if (error) throw error;
      const text = data?.description ?? "Could not describe the environment.";
      setDescription(text);
      return text;
    } catch (err) {
      console.error("Describe error:", err);
      const fallback = "Sorry, I couldn't describe the environment right now.";
      setDescription(fallback);
      return fallback;
    } finally {
      setIsDescribing(false);
    }
  }, []);

  return { isDescribing, description, describe };
}
