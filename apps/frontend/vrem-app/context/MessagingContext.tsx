'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ChatMessage } from '@/types/chat';

interface MessagingContextType {
  // Message state
  messages: ChatMessage[];
  getMessagesForJob: (jobId: string) => ChatMessage[];
  
  // Message handlers
  sendMessage: (
    jobId: string,
    content: string,
    chatType: 'client' | 'team',
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

  const getMessagesForJob = useCallback((jobId: string): ChatMessage[] => {
    return messages.filter((msg) => msg.jobId === jobId);
  }, [messages]);

  const sendMessage = useCallback((
    jobId: string,
    content: string,
    chatType: 'client' | 'team',
    threadId?: string
  ) => {
    if (!currentUserId || !currentUserName) {
      console.warn('Cannot send message: user info not set');
      return;
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      jobId,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      content,
      createdAt: new Date(),
      threadId,
      chatType,
    };

    setMessages((prev) => [...prev, newMessage]);
    
    // Store in localStorage for persistence
    const storedMessages = localStorage.getItem('chatMessages');
    const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
    allMessages.push(newMessage);
    localStorage.setItem('chatMessages', JSON.stringify(allMessages));
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('messageCreated', { detail: newMessage }));
  }, [currentUserId, currentUserName, currentUserAvatar]);

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

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    
    // Update in localStorage
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      const allMessages: ChatMessage[] = JSON.parse(storedMessages);
      const updatedMessages = allMessages.filter((msg) => msg.id !== messageId);
      localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
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

  // Load messages from localStorage on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      try {
        const parsedMessages: ChatMessage[] = JSON.parse(storedMessages);
        // Convert date strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Error loading messages from localStorage:', error);
      }
    }
  }, []);

  return (
    <MessagingContext.Provider
      value={{
        messages,
        getMessagesForJob,
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

