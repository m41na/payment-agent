import { useMemo } from 'react';
import { useEvents } from './useEvents';
import { useRSVP, useUserRSVPs } from './useRSVP';
import { useEventSync } from './useEventSync';
import {
  Event,
  EventCreateData,
  EventUpdateData,
  EventFilters,
  EventOperationResult,
  RSVPOperationResult,
  EventError,
  EventType,
  AttendeeStatus,
  EventSyncEvent,
  ConnectionState,
} from '../types';

interface UseEventsManagementOptions {
  // Events options
  initialFilters?: EventFilters;
  pageSize?: number;
  autoLoadEvents?: boolean;
  
  // RSVP options
  autoLoadUserRSVPs?: boolean;
  
  // Sync options
  enableRealTimeSync?: boolean;
  autoSubscribeToUserEvents?: boolean;
  autoSubscribeToUserRSVPs?: boolean;
  maxSyncEvents?: number;
  
  // Event callbacks
  onEventCreated?: (event: Event) => void;
  onEventUpdated?: (event: Event) => void;
  onEventDeleted?: (eventId: string) => void;
  onRSVPChanged?: (eventId: string, status: AttendeeStatus | null) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

interface UseEventsManagementReturn {
  // Events state and actions
  events: Event[];
  eventsLoading: boolean;
  eventsError: EventError | null;
  hasMoreEvents: boolean;
  refreshingEvents: boolean;
  eventsByType: Record<EventType, Event[]>;
  upcomingEvents: Event[];
  pastEvents: Event[];
  todayEvents: Event[];
  thisWeekEvents: Event[];
  eventCount: number;
  isEventsEmpty: boolean;
  
  // Events actions
  createEvent: (eventData: EventCreateData) => Promise<EventOperationResult>;
  updateEvent: (eventId: string, updates: EventUpdateData) => Promise<EventOperationResult>;
  deleteEvent: (eventId: string) => Promise<EventOperationResult>;
  loadEvents: (filters?: EventFilters) => Promise<void>;
  loadMoreEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  searchEvents: (query: string, filters?: EventFilters) => Promise<void>;
  clearEvents: () => void;
  
  // RSVP state and actions
  userRSVPs: any[];
  userRSVPsLoading: boolean;
  userRSVPsError: EventError | null;
  
  // RSVP actions
  rsvpToEvent: (eventId: string, status: AttendeeStatus, notes?: string) => Promise<RSVPOperationResult>;
  removeRSVP: (eventId: string) => Promise<RSVPOperationResult>;
  loadUserRSVPs: (status?: AttendeeStatus, includeUpcoming?: boolean) => Promise<void>;
  
  // Real-time sync state and actions
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  syncEvents: EventSyncEvent[];
  lastSyncTime: string | null;
  
  // Sync actions
  subscribeToEvent: (eventId: string) => Promise<void>;
  unsubscribeFromEvent: (eventId: string) => void;
  reconnectSync: () => Promise<void>;
  disconnectSync: () => void;
  clearSyncEvents: () => void;
  
  // Utility actions
  clearAllErrors: () => void;
  
  // Computed values
  totalActiveSubscriptions: number;
  hasAnyError: boolean;
  isFullyLoaded: boolean;
}

export function useEventsManagement(options: UseEventsManagementOptions = {}): UseEventsManagementReturn {
  const {
    // Events options
    initialFilters,
    pageSize = 20,
    autoLoadEvents = true,
    
    // RSVP options
    autoLoadUserRSVPs = true,
    
    // Sync options
    enableRealTimeSync = true,
    autoSubscribeToUserEvents = true,
    autoSubscribeToUserRSVPs = true,
    maxSyncEvents = 50,
    
    // Callbacks
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onRSVPChanged,
    onConnectionStateChange,
  } = options;

  // Initialize hooks
  const eventsHook = useEvents({
    initialFilters,
    pageSize,
    autoLoad: autoLoadEvents,
  });

  const userRSVPsHook = useUserRSVPs();

  const syncHook = useEventSync({
    autoSubscribeToUserEvents: enableRealTimeSync && autoSubscribeToUserEvents,
    autoSubscribeToUserRSVPs: enableRealTimeSync && autoSubscribeToUserRSVPs,
    maxSyncEvents,
    onEventCreated: (syncEvent) => {
      // Refresh events list when new event is created
      if (syncEvent.data.event) {
        eventsHook.refreshEvents();
        onEventCreated?.(syncEvent.data.event);
      }
    },
    onEventUpdated: (syncEvent) => {
      // Refresh events list when event is updated
      if (syncEvent.data.event) {
        eventsHook.refreshEvents();
        onEventUpdated?.(syncEvent.data.event);
      }
    },
    onEventDeleted: (syncEvent) => {
      // Refresh events list when event is deleted
      if (syncEvent.data.event) {
        eventsHook.refreshEvents();
        onEventDeleted?.(syncEvent.data.event.id);
      }
    },
    onAttendeeAdded: (syncEvent) => {
      // Refresh user RSVPs when attendee is added
      if (syncEvent.data.attendee) {
        userRSVPsHook.loadUserRSVPs();
        onRSVPChanged?.(syncEvent.data.attendee.event_id, syncEvent.data.attendee.status);
      }
    },
    onAttendeeUpdated: (syncEvent) => {
      // Refresh user RSVPs when attendee is updated
      if (syncEvent.data.attendee) {
        userRSVPsHook.loadUserRSVPs();
        onRSVPChanged?.(syncEvent.data.attendee.event_id, syncEvent.data.attendee.status);
      }
    },
    onAttendeeRemoved: (syncEvent) => {
      // Refresh user RSVPs when attendee is removed
      if (syncEvent.data.attendee) {
        userRSVPsHook.loadUserRSVPs();
        onRSVPChanged?.(syncEvent.data.attendee.event_id, null);
      }
    },
    onConnectionStateChange,
  });

  // Enhanced RSVP function that triggers sync refresh
  const enhancedRSVPToEvent = async (
    eventId: string,
    status: AttendeeStatus,
    notes?: string
  ): Promise<RSVPOperationResult> => {
    // Use a temporary RSVP hook for this operation
    const tempRSVPHook = useRSVP();
    const result = await tempRSVPHook.rsvpToEvent(eventId, status, notes);
    
    if (result.success) {
      // Refresh user RSVPs after successful RSVP
      await userRSVPsHook.loadUserRSVPs();
      onRSVPChanged?.(eventId, status);
    }
    
    return result;
  };

  // Enhanced remove RSVP function
  const enhancedRemoveRSVP = async (eventId: string): Promise<RSVPOperationResult> => {
    const tempRSVPHook = useRSVP();
    const result = await tempRSVPHook.removeRSVP(eventId);
    
    if (result.success) {
      // Refresh user RSVPs after successful removal
      await userRSVPsHook.loadUserRSVPs();
      onRSVPChanged?.(eventId, null);
    }
    
    return result;
  };

  // Enhanced event creation that triggers sync
  const enhancedCreateEvent = async (eventData: EventCreateData): Promise<EventOperationResult> => {
    const result = await eventsHook.createEvent(eventData);
    
    if (result.success && result.event) {
      onEventCreated?.(result.event);
    }
    
    return result;
  };

  // Enhanced event update that triggers sync
  const enhancedUpdateEvent = async (
    eventId: string,
    updates: EventUpdateData
  ): Promise<EventOperationResult> => {
    const result = await eventsHook.updateEvent(eventId, updates);
    
    if (result.success && result.event) {
      onEventUpdated?.(result.event);
    }
    
    return result;
  };

  // Enhanced event deletion that triggers sync
  const enhancedDeleteEvent = async (eventId: string): Promise<EventOperationResult> => {
    const result = await eventsHook.deleteEvent(eventId);
    
    if (result.success) {
      onEventDeleted?.(eventId);
    }
    
    return result;
  };

  // Clear all errors
  const clearAllErrors = () => {
    eventsHook.clearError();
    userRSVPsHook.clearError();
    syncHook.clearError();
  };

  // Computed values
  const computed = useMemo(() => {
    const hasAnyError = !!(
      eventsHook.error || 
      userRSVPsHook.error || 
      syncHook.error
    );

    const isFullyLoaded = !eventsHook.loading && !userRSVPsHook.loading;

    // Count active subscriptions (this is a simplified count)
    const totalActiveSubscriptions = syncHook.isConnected ? 
      (autoSubscribeToUserEvents ? 1 : 0) + (autoSubscribeToUserRSVPs ? 1 : 0) : 0;

    return {
      hasAnyError,
      isFullyLoaded,
      totalActiveSubscriptions,
    };
  }, [
    eventsHook.error,
    eventsHook.loading,
    userRSVPsHook.error,
    userRSVPsHook.loading,
    syncHook.error,
    syncHook.isConnected,
    autoSubscribeToUserEvents,
    autoSubscribeToUserRSVPs,
  ]);

  return {
    // Events state
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
    
    // Events actions
    createEvent: enhancedCreateEvent,
    updateEvent: enhancedUpdateEvent,
    deleteEvent: enhancedDeleteEvent,
    loadEvents: eventsHook.loadEvents,
    loadMoreEvents: eventsHook.loadMoreEvents,
    refreshEvents: eventsHook.refreshEvents,
    searchEvents: eventsHook.searchEvents,
    clearEvents: eventsHook.clearEvents,
    
    // RSVP state
    userRSVPs: userRSVPsHook.rsvps,
    userRSVPsLoading: userRSVPsHook.loading,
    userRSVPsError: userRSVPsHook.error,
    
    // RSVP actions
    rsvpToEvent: enhancedRSVPToEvent,
    removeRSVP: enhancedRemoveRSVP,
    loadUserRSVPs: userRSVPsHook.loadUserRSVPs,
    
    // Sync state
    connectionState: syncHook.connectionState,
    isConnected: syncHook.isConnected,
    isConnecting: syncHook.isConnecting,
    syncEvents: syncHook.syncEvents,
    lastSyncTime: syncHook.lastSyncTime,
    
    // Sync actions
    subscribeToEvent: syncHook.subscribeToEvent,
    unsubscribeFromEvent: syncHook.unsubscribeFromEvent,
    reconnectSync: syncHook.reconnect,
    disconnectSync: syncHook.disconnect,
    clearSyncEvents: syncHook.clearSyncEvents,
    
    // Utility actions
    clearAllErrors,
    
    // Computed values
    ...computed,
  };
}
