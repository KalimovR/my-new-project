import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { uuid } from "@/lib/uuid";

interface PresenceState {
  [key: string]: {
    online_at: string;
    user_agent?: string;
  }[];
}

export const OnlineUsersIndicator = () => {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: uuid(),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
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

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
      <div className="relative">
        <Users className="h-5 w-5 text-primary" />
        <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Онлайн сейчас</span>
        <span className="text-lg font-bold text-foreground">{onlineCount}</span>
      </div>
    </div>
  );
};
