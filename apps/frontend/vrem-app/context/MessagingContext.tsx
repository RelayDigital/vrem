'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ChatMessage } from '@/types/chat';
import { api } from '@/lib/api';
import { chatSocket } from '@/lib/chat-socket';
import { toast } from 'sonner';

interface MessagingContextType {
  // Message state
  messages: ChatMessage[];
  getMessagesForJob: (jobId: string) => ChatMessage[];
  fetchMessages: (jobId: string, channel?: 'TEAM' | 'CUSTOMER', orgId?: string) => Promise<void>;

  // Message handlers
  sendMessage: (
    jobId: string,
    content: string,
    channel: 'TEAM' | 'CUSTOMER',
    threadId?: string
  ) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;

  // User info (for message creation)
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  setUserInfo: (userId: string, userName: string, userAvatar?: string) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({
  children,
  defaultUserId,
  defaultUserName,
  defaultUserAvatar,
}: {
  children: ReactNode;
  defaultUserId?: string;
  defaultUserName?: string;
  defaultUserAvatar?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(defaultUserId);
  const [currentUserName, setCurrentUserName] = useState<string | undefined>(defaultUserName);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(defaultUserAvatar);
  const [connected, setConnected] = useState(false);

  // Establish socket connection on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    chatSocket.connect();
    setConnected(true);
    return () => {
      chatSocket.disconnect();
      setConnected(false);
    };
  }, []);

  // Subscribe to incoming messages
  useEffect(() => {
    const handler = (incoming: ChatMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === incoming.id);
        return exists ? prev : [...prev, incoming];
      });
    };
    chatSocket.onMessage(handler);
    return () => chatSocket.offMessage(handler);
  }, []);

  const getMessagesForJob = useCallback((jobId: string): ChatMessage[] => {
    return messages.filter((msg) => msg.jobId === jobId);
  }, [messages]);

  const fetchMessages = useCallback(async (jobId: string, channel: 'TEAM' | 'CUSTOMER' = 'TEAM', orgId?: string) => {
    try {
      if (orgId) {
        api.organizations.setActiveOrganization(orgId);
      }
      const fetchedMessages = await api.chat.getMessages(jobId, channel);
      // Convert date strings to Date objects if needed
      const processedMessages = fetchedMessages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        channel: msg.channel || channel,
        chatType: (msg.channel || channel) === 'CUSTOMER' ? 'client' : 'team',
      }));

      setMessages((prev) => {
        // Remove existing messages for this job+channel to avoid duplicates
        const otherMessages = prev.filter((msg) => !(msg.jobId === jobId && (msg as any).channel === channel));
        return [...otherMessages, ...processedMessages];
      });

      // Join project room for realtime updates
      if (connected) {
        chatSocket.joinProject(jobId).catch(() => {
          // silently ignore join errors for now
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't show toast here to avoid spamming if called frequently
    }
  }, [connected]);

  const sendMessage = useCallback(async (
    jobId: string,
    content: string,
    channel: 'TEAM' | 'CUSTOMER',
    threadId?: string | null
  ) => {
    if (!currentUserId || !currentUserName) {
      console.warn('Cannot send message: user info not set');
      return;
    }

    try {
      let newMessage: ChatMessage | null = null;

      if (connected) {
        newMessage = await chatSocket.sendMessage(jobId, content, channel, threadId);
      } else {
        const response = await api.chat.sendMessage(jobId, content, channel, threadId);
        newMessage = {
          ...response,
          jobId,
          userId: currentUserId,
          userName: currentUserName,
          userAvatar: currentUserAvatar,
          content,
          channel,
          chatType: channel === 'CUSTOMER' ? 'client' : 'team',
          thread: threadId || null,
          threadId,
          createdAt: new Date(response.createdAt || new Date()),
        };
      }

      if (newMessage) {
        setMessages((prev) => [...prev, newMessage!]);
        window.dispatchEvent(new CustomEvent('messageCreated', { detail: newMessage }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  }, [connected, currentUserId, currentUserName, currentUserAvatar]);

  const editMessage = useCallback((messageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content } : msg))
    );

    // Update in localStorage
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      const allMessages: ChatMessage[] = JSON.parse(storedMessages);
      const updatedMessages = allMessages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      );
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('messageUpdated', {
      detail: { messageId, content }
    }));
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    // Update in localStorage
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      const allMessages: ChatMessage[] = JSON.parse(storedMessages);
      const updatedMessages = allMessages.filter((msg) => msg.id !== messageId);
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
    }

    try {
      await api.messages.delete(messageId);
    } catch (error) {
      console.error('Failed to delete message on backend', error);
      // Keep UI state consistent; optionally refetch later
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('messageDeleted', {
      detail: { messageId }
    }));
  }, []);

  const setUserInfo = useCallback((
    userId: string,
    userName: string,
    userAvatar?: string
  ) => {
    setCurrentUserId(userId);
    setCurrentUserName(userName);
    setCurrentUserAvatar(userAvatar);
  }, []);

  // Load messages from localStorage on mount - REMOVED in favor of API
  // We now fetch messages per job when needed
  useEffect(() => {
    // Optional: Load some initial messages or clear state
  }, []);

  return (
    <MessagingContext.Provider
      value={{
        messages,
        getMessagesForJob,
        fetchMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        currentUserId,
        currentUserName,
        currentUserAvatar,
        setUserInfo,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
