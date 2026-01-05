import { useState } from 'react';
import { 
  useChatRequests, 
  usePrivateChats, 
  useChatMessages, 
  useRespondToChatRequest,
  useSendMessage,
  useMarkMessagesRead,
  useBlockUserInChat,
  useUnblockUserInChat,
  useDeleteChat,
  useChatBlockStatus,
  PrivateChat,
} from '@/hooks/usePremiumChats';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MessageCircle, 
  Check, 
  X, 
  Send, 
  ArrowLeft,
  Users,
  Bell,
  MoreVertical,
  Trash2,
  Ban,
  ShieldOff,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const PremiumChatsPanel = () => {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<PrivateChat | null>(null);
  const [message, setMessage] = useState('');
  
  const { data: requests } = useChatRequests();
  const { data: chats } = usePrivateChats();
  const { data: messages } = useChatMessages(selectedChat?.id);
  const { data: blockStatus } = useChatBlockStatus(selectedChat?.id);
  const respondToRequest = useRespondToChatRequest();
  const sendMessage = useSendMessage();
  const markRead = useMarkMessagesRead();
  const blockUser = useBlockUserInChat();
  const unblockUser = useUnblockUserInChat();
  const deleteChat = useDeleteChat();

  if (!profile?.is_premium) return null;

  const totalUnread = (chats || []).reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const pendingRequests = requests?.incoming?.length || 0;

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;
    
    // Check if blocked
    if (blockStatus?.isBlockedByOther) return;
    
    sendMessage.mutate({ chatId: selectedChat.id, content: message });
    setMessage('');
  };

  const handleOpenChat = (chat: PrivateChat) => {
    setSelectedChat(chat);
    if (chat.unread_count && chat.unread_count > 0) {
      markRead.mutate(chat.id);
    }
  };

  const handleBlockUser = () => {
    if (!selectedChat?.other_user_id) return;
    blockUser.mutate({ 
      chatId: selectedChat.id, 
      blockedUserId: selectedChat.other_user_id 
    });
  };

  const handleUnblockUser = () => {
    if (!selectedChat) return;
    unblockUser.mutate({ chatId: selectedChat.id });
  };

  const handleDeleteChat = () => {
    if (!selectedChat) return;
    deleteChat.mutate(selectedChat.id);
    setSelectedChat(null);
  };

  const canSendMessage = !blockStatus?.isBlockedByOther;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageCircle className="h-5 w-5" />
          {(totalUnread > 0 || pendingRequests > 0) && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
              {totalUnread + pendingRequests}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0">
        {selectedChat ? (
          // Chat view
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold">{selectedChat.other_user_name}</h3>
                  <p className="text-xs text-muted-foreground">Премиум чат</p>
                </div>
              </div>
              
              {/* Chat actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {blockStatus?.isBlockedByMe ? (
                    <DropdownMenuItem onClick={handleUnblockUser}>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Разблокировать
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleBlockUser} className="text-destructive">
                      <Ban className="h-4 w-4 mr-2" />
                      Заблокировать
                    </DropdownMenuItem>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить чат
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить чат?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Все сообщения будут удалены безвозвратно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages?.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2",
                      msg.sender_id === user?.id 
                        ? "ml-auto bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {formatDistanceToNow(new Date(msg.created_at), { locale: ru, addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Blocked status indicator */}
            {blockStatus?.isBlockedByOther && (
              <div className="px-4 py-3 bg-destructive/10 border-t border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Вы заблокированы в этом чате и не можете отправлять сообщения
                  </span>
                </div>
              </div>
            )}

            {/* Input area - disabled if blocked */}
            <div className="p-4 border-t flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={canSendMessage ? "Сообщение..." : "Вы заблокированы"}
                onKeyDown={(e) => e.key === 'Enter' && canSendMessage && handleSendMessage()}
                disabled={!canSendMessage}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() || !canSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Chats list view
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Премиум чаты
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1">
              {/* Pending requests */}
              {requests?.incoming && requests.incoming.length > 0 && (
                <div className="p-4 border-b">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Запросы на общение
                  </h4>
                  <div className="space-y-2">
                    {requests.incoming.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium text-sm">{req.from_user_name}</span>
                        <div className="flex gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                            onClick={() => respondToRequest.mutate({ requestId: req.id, accept: true })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                            onClick={() => respondToRequest.mutate({ requestId: req.id, accept: false })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chats list */}
              <div className="p-4">
                <h4 className="text-sm font-medium mb-3">Чаты</h4>
                {chats && chats.length > 0 ? (
                  <div className="space-y-2">
                    {chats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleOpenChat(chat)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors text-left",
                          chat.is_blocked_by_other && "opacity-60"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{chat.other_user_name}</span>
                            {chat.is_blocked_by_me && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                <Ban className="h-3 w-3 mr-1" />
                                Заблокирован
                              </Badge>
                            )}
                            {chat.is_blocked_by_other && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Вы заблокированы
                              </Badge>
                            )}
                          </div>
                          {chat.last_message_at && (
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(chat.last_message_at), { locale: ru, addSuffix: true })}
                            </p>
                          )}
                        </div>
                        {chat.unread_count && chat.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground ml-2">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    У вас пока нет активных чатов
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};