import React, { createContext, useContext, ReactNode } from 'react';
import { useEventsManagement } from '../features/events-management/hooks/useEventsManagement';
import { EventsManagementContextType } from '../features/events-management/types';

const EventsManagementContext = createContext<EventsManagementContextType | undefined>(undefined);

interface EventsManagementProviderProps {
  children: ReactNode;
}

/**
 * Events Management Provider
 * 
 * Provides event creation and management capabilities across the application.
 * Integrates with the Events Management feature's hook system to manage
 * event creation, discovery, and event-related operations.
 */
export const EventsManagementProvider: React.FC<EventsManagementProviderProps> = ({ children }) => {
  const eventsManagementContext = useEventsManagement();

  return (
    <EventsManagementContext.Provider value={eventsManagementContext}>
      {children}
    </EventsManagementContext.Provider>
  );
};

/**
 * Hook to access Events Management context
 */
export const useEventsManagementContext = (): EventsManagementContextType => {
  const context = useContext(EventsManagementContext);
  if (!context) {
    throw new Error('useEventsManagementContext must be used within an EventsManagementProvider');
  }
  return context;
};

export default EventsManagementProvider;
