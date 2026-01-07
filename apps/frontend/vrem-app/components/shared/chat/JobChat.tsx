'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage, TypingUser, PresenceUser, ReadReceipt, ProjectChatChannel } from '../../../types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ScrollArea } from '../../ui/scroll-area';
import { Badge } from '../../ui/badge';
import { Small, Muted, P } from '../../ui/typography';
import {
  Send,
  AtSign,
  Users,
  MessageSquare,
  Reply,
  X,
  ChevronRight,
  Check,
  CheckCheck,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet';

interface JobChatProps {
  jobId: string;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isClient?: boolean;
  onSendMessage?: (content: string, channel: 'TEAM' | 'CUSTOMER', threadId?: string) => void;
  onMention?: (userId: string) => void;
  showInput?: boolean;
  onActiveTabChange?: (tab: 'client' | 'team') => void;
  activeTab?: 'client' | 'team';
  // Live chat features
  typingUsers?: TypingUser[];
  onlineUsers?: PresenceUser[];
  onTyping?: (channel: ProjectChatChannel) => void;
  onStopTyping?: (channel: ProjectChatChannel) => void;
  getMessageReadReceipts?: (messageId: string) => ReadReceipt[];
  onMessagesVisible?: (messageIds: string[], channel: ProjectChatChannel) => void;
}

// Format time for message bubbles
function formatMessageTime(date: Date): string {
  return format(new Date(date), 'h:mm a');
}

// Format date for date separators
function formatDateSeparator(date: Date): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

// Group messages by date for date separators
function groupMessagesByDate(messages: ChatMessage[]): Map<string, ChatMessage[]> {
  const groups = new Map<string, ChatMessage[]>();

  messages.forEach((message) => {
    const dateKey = format(new Date(message.createdAt), 'yyyy-MM-dd');
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(message);
  });

  return groups;
}

// Format typing indicator text
function formatTypingText(users: TypingUser[]): string {
  if (users.length === 0) return '';
  if (users.length === 1) return `${users[0].userName} is typing...`;
  if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing...`;
  return `${users[0].userName} and ${users.length - 1} others are typing...`;
}

// Typing dots animation component
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
    </span>
  );
}

export function JobChat({
  jobId,
  messages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isClient = false,
  onSendMessage,
  onMention,
  showInput = true,
  onActiveTabChange,
  activeTab: controlledActiveTab,
  typingUsers = [],
  onlineUsers = [],
  onTyping,
  onStopTyping,
  getMessageReadReceipts,
  onMessagesVisible,
}: JobChatProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'client' | 'team'>('team');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [threadViewMessage, setThreadViewMessage] = useState<ChatMessage | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleTabChange = (tab: 'client' | 'team') => {
    if (!controlledActiveTab) {
      setInternalActiveTab(tab);
    }
    if (onActiveTabChange) {
      onActiveTabChange(tab);
    }
    setReplyingTo(null);
  };

  // Filter messages by chat type
  const clientMessages = useMemo(
    () => messages.filter((m) => m.chatType === 'client' || m.channel === 'CUSTOMER'),
    [messages]
  );
  const teamMessages = useMemo(
    () => messages.filter((m) => m.chatType === 'team' || m.channel === 'TEAM'),
    [messages]
  );

  // Get messages for active tab
  const activeMessages = activeTab === 'client' ? clientMessages : teamMessages;

  // Create a map of message ID to message for quick lookup
  const messageMap = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  // Get all messages in a thread (original + all replies)
  const getThreadMessages = useCallback(
    (rootMessageId: string): ChatMessage[] => {
      const rootMessage = messageMap.get(rootMessageId);
      if (!rootMessage) return [];

      const threadMessages = messages.filter(
        (m) => m.threadId === rootMessageId || m.thread === rootMessageId
      );

      return [rootMessage, ...threadMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
    [messages, messageMap]
  );

  // Get reply count for a message
  const getReplyCount = useCallback(
    (messageId: string): number => {
      return messages.filter((m) => m.threadId === messageId || m.thread === messageId).length;
    },
    [messages]
  );

  // Sort messages chronologically (excluding replies which will be shown inline)
  const sortedMessages = useMemo(() => {
    // Get all root messages (messages that are not replies)
    const rootMessages = activeMessages.filter((m) => !m.threadId && !m.thread);
    // Also include replies (they'll show the original message as a preview)
    const replies = activeMessages.filter((m) => m.threadId || m.thread);

    return [...rootMessages, ...replies].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeMessages]);

  // Group messages by date
  const messagesByDate = useMemo(() => groupMessagesByDate(sortedMessages), [sortedMessages]);

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.some((u) => u.userId === userId && u.isOnline);
    },
    [onlineUsers]
  );

  // Get read status for a message
  const getMessageReadStatus = useCallback(
    (message: ChatMessage): 'sent' | 'delivered' | 'read' => {
      if (!getMessageReadReceipts) return 'sent';
      const receipts = getMessageReadReceipts(message.id);
      // Filter out the message author's own receipts
      const otherReceipts = receipts.filter((r) => r.userId !== message.userId);
      if (otherReceipts.length > 0) return 'read';
      // For now, consider all sent messages as delivered
      return 'delivered';
    },
    [getMessageReadReceipts]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [activeMessages.length, activeTab]);

  // Handle send message
  const handleSend = () => {
    if (!newMessage.trim() || !onSendMessage) return;

    const channel = activeTab === 'client' ? 'CUSTOMER' : 'TEAM';
    const threadId = replyingTo?.id;

    // Stop typing indicator before sending
    if (onStopTyping) {
      onStopTyping(channel);
    }

    onSendMessage(newMessage.trim(), channel, threadId);
    setNewMessage('');
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (onTyping && e.target.value.trim()) {
      const channel = activeTab === 'client' ? 'CUSTOMER' : 'TEAM';
      onTyping(channel);
    }
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render a single message bubble
  const renderMessageBubble = (message: ChatMessage) => {
    const isOwn = message.userId === currentUserId;
    const replyCount = getReplyCount(message.id);
    const parentMessageId = message.threadId || message.thread;
    const parentMessage = parentMessageId ? messageMap.get(parentMessageId) : null;

    return (
      <div
        key={message.id}
        className={cn('flex mb-2 group', isOwn ? 'justify-end' : 'justify-start')}
      >
        {/* Avatar for others' messages */}
        {!isOwn && (
          <div className="relative mr-2 mt-auto mb-1 flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.userAvatar} alt={message.userName} />
              <AvatarFallback className="text-xs bg-muted">
                {message.userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            {/* Online presence indicator */}
            {isUserOnline(message.userId) && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
        )}

        <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
          {/* Sender name for others' messages */}
          {!isOwn && (
            <span className="text-xs text-muted-foreground ml-1 mb-0.5">{message.userName}</span>
          )}

          {/* Message bubble */}
          <div
            className={cn(
              'relative px-3 py-2 rounded-2xl shadow-sm',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}
          >
            {/* Reply preview (WhatsApp style) */}
            {parentMessage && (
              <button
                onClick={() => setThreadViewMessage(parentMessage)}
                className={cn(
                  'w-full mb-2 p-2 rounded-lg text-left transition-colors',
                  isOwn
                    ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                    : 'bg-background/50 hover:bg-background/70'
                )}
              >
                <div
                  className={cn(
                    'border-l-2 pl-2',
                    isOwn ? 'border-primary-foreground/50' : 'border-primary'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium block',
                      isOwn ? 'text-primary-foreground/80' : 'text-primary'
                    )}
                  >
                    {parentMessage.userName}
                  </span>
                  <span
                    className={cn(
                      'text-xs line-clamp-2',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {parentMessage.content}
                  </span>
                </div>
              </button>
            )}

            {/* Message content */}
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

            {/* Time and status */}
            <div
              className={cn(
                'flex items-center gap-1 mt-1',
                isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              <span
                className={cn(
                  'text-[10px]',
                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {isOwn && (() => {
                const status = getMessageReadStatus(message);
                if (status === 'read') {
                  return <CheckCheck className="h-3 w-3 text-sky-400" />;
                }
                if (status === 'delivered') {
                  return <CheckCheck className="h-3 w-3 text-primary-foreground/70" />;
                }
                return <Check className="h-3 w-3 text-primary-foreground/70" />;
              })()}
            </div>
          </div>

          {/* Reply button and thread indicator */}
          <div className="flex items-center gap-2 mt-0.5 px-1">
            {/* Reply button - shows on hover */}
            <button
              onClick={() => setReplyingTo(message)}
              className={cn(
                'flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            >
              <Reply className="h-3 w-3" />
              Reply
            </button>

            {/* Thread indicator */}
            {replyCount > 0 && (
              <button
                onClick={() => setThreadViewMessage(message)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <MessageSquare className="h-3 w-3" />
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

      </div>
    );
  };

  // Render date separator
  const renderDateSeparator = (date: string) => (
    <div key={`date-${date}`} className="flex items-center justify-center my-4">
      <div className="bg-muted/80 text-muted-foreground text-xs px-3 py-1 rounded-full">
        {formatDateSeparator(new Date(date))}
      </div>
    </div>
  );

  // Render messages list
  const renderMessages = () => {
    if (sortedMessages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No messages in {activeTab === 'client' ? 'customer' : 'team'} chat yet
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Start the conversation below
          </p>
        </div>
      );
    }

    const elements: React.ReactNode[] = [];

    messagesByDate.forEach((msgs, dateKey) => {
      elements.push(renderDateSeparator(dateKey));
      msgs.forEach((message) => {
        elements.push(renderMessageBubble(message));
      });
    });

    return elements;
  };

  // Thread view sheet content
  const renderThreadView = () => {
    if (!threadViewMessage) return null;

    const threadMessages = getThreadMessages(threadViewMessage.id);

    return (
      <Sheet open={!!threadViewMessage} onOpenChange={() => setThreadViewMessage(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base">Thread</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-1">
              {threadMessages.map((message, index) => {
                const isOwn = message.userId === currentUserId;
                const isOriginal = index === 0;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex mb-2',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!isOwn && (
                      <Avatar className="h-7 w-7 mr-2 mt-auto mb-1 flex-shrink-0">
                        <AvatarImage src={message.userAvatar} alt={message.userName} />
                        <AvatarFallback className="text-xs bg-muted">
                          {message.userName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'flex flex-col max-w-[80%]',
                        isOwn ? 'items-end' : 'items-start'
                      )}
                    >
                      {!isOwn && (
                        <span className="text-xs text-muted-foreground ml-1 mb-0.5">
                          {message.userName}
                        </span>
                      )}

                      <div
                        className={cn(
                          'relative px-3 py-2 rounded-2xl shadow-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md',
                          isOriginal && 'ring-2 ring-primary/20'
                        )}
                      >
                        {isOriginal && (
                          <div className="text-[10px] font-medium mb-1 opacity-70">
                            Original message
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div
                          className={cn(
                            'flex items-center gap-1 mt-1',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span
                            className={cn(
                              'text-[10px]',
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}
                          >
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Reply input in thread view */}
          {showInput && onSendMessage && (
            <div className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Reply in thread..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) {
                        const channel = activeTab === 'client' ? 'CUSTOMER' : 'TEAM';
                        onSendMessage(newMessage.trim(), channel, threadViewMessage.id);
                        setNewMessage('');
                      }
                    }
                  }}
                  className="min-h-[40px] max-h-[100px] resize-none"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={() => {
                    if (newMessage.trim()) {
                      const channel = activeTab === 'client' ? 'CUSTOMER' : 'TEAM';
                      onSendMessage(newMessage.trim(), channel, threadViewMessage.id);
                      setNewMessage('');
                    }
                  }}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as 'client' | 'team')}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-2 mx-0">
          <TabsTrigger value="client" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Customer
            {clientMessages.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {clientMessages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
            {!isClient && (
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs">
                Private
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="flex-1 flex flex-col mt-0 data-[state=active]:flex overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            <div className="px-3 py-2">{renderMessages()}</div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="team" className="flex-1 flex flex-col mt-0 data-[state=active]:flex overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            <div className="px-3 py-2">{renderMessages()}</div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-3 py-2 bg-muted/50 border-t flex items-center gap-2">
          <Reply className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-primary">{replyingTo.userName}</span>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setReplyingTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2">
          <TypingDots />
          <span className="text-xs text-muted-foreground">
            {formatTypingText(typingUsers)}
          </span>
        </div>
      )}

      {/* Message input */}
      {showInput && onSendMessage && (
        <div className="p-3 border-t bg-background">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.userName}...`
                  : `Message ${activeTab === 'client' ? 'customer' : 'team'}...`
              }
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Thread view sheet */}
      {renderThreadView()}
    </div>
  );
}
