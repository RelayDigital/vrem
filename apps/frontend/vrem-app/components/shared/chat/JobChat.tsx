'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../../types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ScrollArea } from '../../ui/scroll-area';
import { Badge } from '../../ui/badge';
import { Small, Muted, P } from '../../ui/typography';
import { Send, AtSign, Users, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface JobChatProps {
  jobId: string;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  isClient?: boolean; // Whether current user is a client
  onSendMessage?: (content: string, chatType: 'client' | 'team', threadId?: string) => void;
  onMention?: (userId: string) => void;
  showInput?: boolean; // Whether to show the input box (default: true)
  onActiveTabChange?: (tab: 'client' | 'team') => void; // Callback when active tab changes
  activeTab?: 'client' | 'team'; // Controlled active tab
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
}: JobChatProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'client' | 'team'>('team');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  
  const handleTabChange = (tab: 'client' | 'team') => {
    if (!controlledActiveTab) {
      setInternalActiveTab(tab);
    }
    if (onActiveTabChange) {
      onActiveTabChange(tab);
    }
  };
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Filter messages by chat type
  const clientMessages = messages.filter((m) => m.chatType === 'client');
  const teamMessages = messages.filter((m) => m.chatType === 'team');

  // Group messages by thread
  const threadMap = new Map<string, ChatMessage[]>();
  const rootMessages: ChatMessage[] = [];

  // Get messages for active tab
  const activeMessages = activeTab === 'client' ? clientMessages : teamMessages;

  activeMessages.forEach((message) => {
    if (message.threadId) {
      if (!threadMap.has(message.threadId)) {
        threadMap.set(message.threadId, []);
      }
      threadMap.get(message.threadId)!.push(message);
    } else {
      rootMessages.push(message);
    }
  });

  // Sort messages by date
  const sortedRootMessages = [...rootMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [activeMessages.length, activeTab]);

  // Expose replyingTo state if needed (for external input)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  const renderMessage = (message: ChatMessage, isThread = false) => {
    const threadMessages = threadMap.get(message.id) || [];
    const isOwnMessage = message.userId === currentUserId;

    return (
      <div key={message.id} className={`flex gap-3 ${isThread ? 'ml-8 mt-2' : 'mt-4'}`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.userAvatar} alt={message.userName} />
          <AvatarFallback className="text-xs">
            {message.userName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Small className="font-semibold">{message.userName}</Small>
            <Muted className="text-xs">
              {format(new Date(message.createdAt), 'MMM d, h:mm a')}
            </Muted>
            {message.mentions && message.mentions.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <AtSign className="h-3 w-3 mr-1" />
                {message.mentions.length}
              </Badge>
            )}
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </div>
          {!isThread && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-xs"
              onClick={() => setReplyingTo(message)}
            >
              Reply
            </Button>
          )}
          {threadMessages.length > 0 && (
            <div className="mt-2 space-y-2">
              {threadMessages
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((threadMsg) => renderMessage(threadMsg, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'client' | 'team')} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Client Chat
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Chat
            {!isClient && <Badge variant="secondary" className="ml-1 text-xs">Private</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="client" className="flex-1 flex flex-col mt-0 data-[state=active]:flex">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            <div className="py-4">
              {clientMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No messages in client chat yet
                </div>
              ) : (
                sortedRootMessages.map((message) => renderMessage(message))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="team" className="flex-1 flex flex-col mt-0 data-[state=active]:flex">
          <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
            <div className="py-4">
              {teamMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No messages in team chat yet
                </div>
              ) : (
                sortedRootMessages.map((message) => renderMessage(message))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

