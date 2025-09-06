import React, { createContext, useContext, ReactNode } from 'react';
import { useMessaging } from '../features/messaging/hooks/useMessaging';
import { MessagingContextType } from '../features/messaging/types';

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: ReactNode;
}

/**
 * Messaging Provider
 * 
 * Provides messaging and communication capabilities across the application.
 * Integrates with the Messaging feature's hook system to manage
 * conversations, messages, and real-time communication.
 */
export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const messagingContext = useMessaging();

  return (
    <MessagingContext.Provider value={messagingContext}>
      {children}
    </MessagingContext.Provider>
  );
};

/**
 * Hook to access Messaging context
 */
export const useMessagingContext = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessagingContext must be used within a MessagingProvider');
  }
  return context;
};

export default MessagingProvider;
