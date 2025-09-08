import React, { createContext, useContext, ReactNode, memo } from 'react';
import { useAuth } from '../features/user-auth/context/AuthContext';
import { EventsManagementContextType, AttendeeStatus, ConnectionState, EventType } from '../features/events-management/types';
import { useEvents } from '../features/events-management/hooks/useEvents';
import { useRSVP } from '../features/events-management/hooks/useRSVP';

const EventsManagementContext = createContext<EventsManagementContextType | undefined>(undefined);

interface EventsManagementProviderProps {
  children: ReactNode;
}

/**
 * STEP 2: Events Management Provider with useEvents + useRSVP
 * 
 * Adding useRSVP hook integration with defensive programming
 * to build up the provider functionality piece by piece.
 */
const EventsManagementProviderComponent: React.FC<EventsManagementProviderProps> = ({ children }) => {
  console.log('[EventsManagementProvider] STEP 2 - Starting initialization with useEvents + useRSVP');
  const { user, loading } = useAuth();
  console.log('[EventsManagementProvider] STEP 2 - Auth state:', { user: !!user, loading });
  
  // Add useEvents hook (already working)
  console.log('[EventsManagementProvider] STEP 2 - About to call useEvents hook');
  let eventsHook;
  try {
    eventsHook = useEvents({
      initialFilters: undefined,
      pageSize: 20,
      autoLoad: !!(user && !loading)
    });
    console.log('[EventsManagementProvider] STEP 2 - useEvents hook completed successfully');
  } catch (error) {
    console.error('[EventsManagementProvider] STEP 2 - ERROR in useEvents hook:', error);
    throw error;
  }
  
  // Add useRSVP hook with defensive programming
  console.log('[EventsManagementProvider] STEP 2 - About to call useRSVP hook');
  let rsvpHook;
  try {
    rsvpHook = useRSVP();
    console.log('[EventsManagementProvider] STEP 2 - useRSVP hook completed successfully');
    console.log('[EventsManagementProvider] STEP 2 - useRSVP result keys:', Object.keys(rsvpHook));
  } catch (error) {
    console.error('[EventsManagementProvider] STEP 2 - ERROR in useRSVP hook:', error);
    throw error;
  }
  
  // Create context that combines both hooks
  const contextWithEventsAndRSVP: EventsManagementContextType = {
    // Events state from useEvents hook
    events: eventsHook.events,
    eventsLoading: eventsHook.loading,
    eventsError: eventsHook.error,
    hasMoreEvents: eventsHook.hasMore,
    refreshingEvents: eventsHook.refreshing,
    eventsByType: eventsHook.eventsByType,
    upcomingEvents: eventsHook.upcomingEvents,
    pastEvents: eventsHook.pastEvents,
    todayEvents: eventsHook.todayEvents,
    thisWeekEvents: eventsHook.thisWeekEvents,
    eventCount: eventsHook.eventCount,
    isEventsEmpty: eventsHook.isEmpty,
    
    // Events actions from useEvents hook
    createEvent: eventsHook.createEvent,
    updateEvent: eventsHook.updateEvent,
    deleteEvent: eventsHook.deleteEvent,
    loadEvents: eventsHook.loadEvents,
    loadMoreEvents: eventsHook.loadMoreEvents,
    refreshEvents: eventsHook.refreshEvents,
    searchEvents: eventsHook.searchEvents,
    clearEvents: eventsHook.clearEvents,
    
    // RSVP state from useRSVP hook
    userRSVPs: [], // Will be populated when we add user RSVP loading
    userRSVPsLoading: rsvpHook.loading,
    userRSVPsError: rsvpHook.error,
    
    // RSVP actions from useRSVP hook
    rsvpToEvent: rsvpHook.rsvpToEvent,
    removeRSVP: rsvpHook.removeRSVP,
    loadUserRSVPs: async () => { console.log('[EventsManagementProvider] STEP 2 - loadUserRSVPs called (placeholder)'); },
    
    // Sync state - static for now
    connectionState: ConnectionState.DISCONNECTED,
    isConnected: false,
    isConnecting: false,
    syncEvents: [],
    lastSyncTime: null,
    
    // Sync actions - no-ops for now
    subscribeToEvent: async () => { console.log('[EventsManagementProvider] STEP 2 - subscribeToEvent called (no-op)'); },
    unsubscribeFromEvent: () => { console.log('[EventsManagementProvider] STEP 2 - unsubscribeFromEvent called (no-op)'); },
    reconnectSync: async () => { console.log('[EventsManagementProvider] STEP 2 - reconnectSync called (no-op)'); },
    disconnectSync: () => { console.log('[EventsManagementProvider] STEP 2 - disconnectSync called (no-op)'); },
    clearSyncEvents: () => { console.log('[EventsManagementProvider] STEP 2 - clearSyncEvents called (no-op)'); },
    
    // Utility actions
    clearAllErrors: () => { 
      eventsHook.clearError();
      rsvpHook.clearError();
      console.log('[EventsManagementProvider] STEP 2 - clearAllErrors called'); 
    },
    
    // Computed values
    totalActiveSubscriptions: 0,
    hasAnyError: !!(eventsHook.error || rsvpHook.error),
    isFullyLoaded: !eventsHook.loading && !rsvpHook.loading,
  };

  console.log('[EventsManagementProvider] STEP 2 - Returning context with useEvents + useRSVP integration');

  return (
    <EventsManagementContext.Provider value={contextWithEventsAndRSVP}>
      {children}
    </EventsManagementContext.Provider>
  );
};

export const EventsManagementProvider = memo(EventsManagementProviderComponent);

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
