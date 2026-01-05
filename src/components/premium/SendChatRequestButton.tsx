import { useState } from 'react';
import { useSendChatRequest, useChatRequests } from '@/hooks/usePremiumChats';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MessageCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SendChatRequestButtonProps {
  toUserId: string;
  toUserName?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export const SendChatRequestButton = ({ 
  toUserId, 
  toUserName = 'пользователю',
  variant = 'icon',
  className 
}: SendChatRequestButtonProps) => {
  const { profile, user } = useAuth();
  const sendRequest = useSendChatRequest();
  const { data: requests } = useChatRequests();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Don't show if not premium or if trying to message self
  if (!profile?.is_premium || user?.id === toUserId) return null;

  // Check if request already sent
  const alreadySent = requests?.outgoing?.some(r => r.to_user_id === toUserId);
  const alreadyAccepted = requests?.outgoing?.some(
    r => r.to_user_id === toUserId && r.status === 'accepted'
  );

  if (alreadyAccepted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-green-500", className)} disabled>
        <Check className="h-4 w-4" />
      </Button>
    );
  }

  const handleSend = () => {
    sendRequest.mutate(toUserId, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  if (variant === 'icon') {
    return (
      <>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-8 w-8 text-primary hover:bg-primary/10", className)}
          onClick={() => setConfirmOpen(true)}
          disabled={alreadySent}
        >
          {alreadySent ? (
            <Check className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Отправить запрос на общение</DialogTitle>
              <DialogDescription>
                Вы хотите начать приватный чат с {toUserName}? 
                Пользователь получит уведомление и сможет принять или отклонить запрос.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSend} disabled={sendRequest.isPending}>
                {sendRequest.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Отправить запрос
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      className={className}
      onClick={() => setConfirmOpen(true)}
      disabled={alreadySent}
    >
      {alreadySent ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Запрос отправлен
        </>
      ) : (
        <>
          <MessageCircle className="h-4 w-4 mr-2" />
          Написать
        </>
      )}
    </Button>
  );
};
