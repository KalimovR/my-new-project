import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uuid } from "@/lib/uuid";

export const useOnlinePresence = () => {
  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: uuid(),
        },
      },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          online_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
