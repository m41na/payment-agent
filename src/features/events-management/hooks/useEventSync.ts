import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { EventSyncService } from '../services/EventSyncService';
import {
  EventSyncEvent,
  EventSyncEventType,
  ConnectionState,
  EventError,
} from '../types';

interface UseEventSyncState {
  connectionState: ConnectionState;
  syncEvents: EventSyncEvent[];
  error: EventError | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastSyncTime: string | null;
}

interface UseEventSyncActions {
  subscribeToEvent: (eventId: string) => Promise<void>;
  unsubscribeFromEvent: (eventId: string) => void;
  subscribeToUserEvents: () => Promise<void>;
  unsubscribeFromUserEvents: () => void;
  subscribeToUserRSVPs: () => Promise<void>;
  unsubscribeFromUserRSVPs: () => void;
  reconnect: () => Promise<void>;
  disconnect: () => void;
  clearSyncEvents: () => void;
  clearError: () => void;
}

interface UseEventSyncReturn extends UseEventSyncState, UseEventSyncActions {}

interface UseEventSyncOptions {
  autoSubscribeToUserEvents?: boolean;
  autoSubscribeToUserRSVPs?: boolean;
  maxSyncEvents?: number;
  onEventCreated?: (event: EventSyncEvent) => void;
  onEventUpdated?: (event: EventSyncEvent) => void;
  onEventDeleted?: (event: EventSyncEvent) => void;
  onAttendeeAdded?: (event: EventSyncEvent) => void;
  onAttendeeUpdated?: (event: EventSyncEvent) => void;
  onAttendeeRemoved?: (event: EventSyncEvent) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

const syncService = new EventSyncService();

export function useEventSync(options: UseEventSyncOptions = {}): UseEventSyncReturn {
  const { user } = useAuth();
  const {
    autoSubscribeToUserEvents = false,
    autoSubscribeToUserRSVPs = false,
    maxSyncEvents = 50,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onAttendeeAdded,
    onAttendeeUpdated,
    onAttendeeRemoved,
    onConnectionStateChange,
  } = options;

  const [state, setState] = useState<UseEventSyncState>({
    connectionState: syncService.getConnectionState(),
    syncEvents: syncService.getQueuedEvents(),
    error: null,
    isConnected: false,
    isConnecting: false,
    lastSyncTime: null,
  });

  const callbackIdRef = useRef<string>(`sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const eventCallbackIdRef = useRef<string>(`events_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Handle sync events
  const handleSyncEvent = useCallback((syncEvent: EventSyncEvent) => {
    setState(prev => {
      let updatedEvents = [syncEvent, ...prev.syncEvents];
      
      // Limit the number of stored sync events
      if (updatedEvents.length > maxSyncEvents) {
        updatedEvents = updatedEvents.slice(0, maxSyncEvents);
      }

      return {
        ...prev,
        syncEvents: updatedEvents,
        lastSyncTime: syncEvent.timestamp,
      };
    });

    // Call appropriate callback based on event type
    switch (syncEvent.type) {
      case EventSyncEventType.EVENT_CREATED:
        onEventCreated?.(syncEvent);
        break;
      case EventSyncEventType.EVENT_UPDATED:
        onEventUpdated?.(syncEvent);
        break;
      case EventSyncEventType.EVENT_DELETED:
        onEventDeleted?.(syncEvent);
        break;
      case EventSyncEventType.ATTENDEE_ADDED:
        onAttendeeAdded?.(syncEvent);
        break;
      case EventSyncEventType.ATTENDEE_UPDATED:
        onAttendeeUpdated?.(syncEvent);
        break;
      case EventSyncEventType.ATTENDEE_REMOVED:
        onAttendeeRemoved?.(syncEvent);
        break;
    }
  }, [
    maxSyncEvents,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onAttendeeAdded,
    onAttendeeUpdated,
    onAttendeeRemoved,
  ]);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((connectionState: ConnectionState) => {
    setState(prev => ({
      ...prev,
      connectionState,
      isConnected: connectionState === ConnectionState.CONNECTED,
      isConnecting: connectionState === ConnectionState.CONNECTING,
    }));

    onConnectionStateChange?.(connectionState);
  }, [onConnectionStateChange]);

  // Subscribe to a specific event
  const subscribeToEvent = useCallback(async (eventId: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await syncService.subscribeToEvent(eventId, handleSyncEvent);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error 
          ? { code: 'SUBSCRIPTION_ERROR', message: error.message }
          : error,
      }));
    }
  }, [handleSyncEvent]);

  // Unsubscribe from a specific event
  const unsubscribeFromEvent = useCallback((eventId: string) => {
    syncService.unsubscribeFromEvent(eventId);
  }, []);

  // Subscribe to user's events
  const subscribeToUserEvents = useCallback(async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      await syncService.subscribeToUserEvents(user.id, handleSyncEvent);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error 
          ? { code: 'SUBSCRIPTION_ERROR', message: error.message }
          : error,
      }));
    }
  }, [user, handleSyncEvent]);

  // Unsubscribe from user's events
  const unsubscribeFromUserEvents = useCallback(() => {
    if (!user) return;
    syncService.unsubscribeFromUserEvents(user.id);
  }, [user]);

  // Subscribe to user's RSVPs
  const subscribeToUserRSVPs = useCallback(async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, error: null }));
      await syncService.subscribeToUserRSVPs(user.id, handleSyncEvent);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error 
          ? { code: 'SUBSCRIPTION_ERROR', message: error.message }
          : error,
      }));
    }
  }, [user, handleSyncEvent]);

  // Unsubscribe from user's RSVPs
  const unsubscribeFromUserRSVPs = useCallback(() => {
    if (!user) return;
    syncService.unsubscribeFromUserRSVPs(user.id);
  }, [user]);

  // Reconnect
  const reconnect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await syncService.reconnect();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error 
          ? { code: 'CONNECTION_ERROR', message: error.message }
          : error,
      }));
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    syncService.disconnect();
  }, []);

  // Clear sync events
  const clearSyncEvents = useCallback(() => {
    setState(prev => ({
      ...prev,
      syncEvents: [],
      lastSyncTime: null,
    }));
    syncService.clearQueuedEvents();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Setup connection state monitoring
  useEffect(() => {
    const callbackId = callbackIdRef.current;
    
    syncService.onConnectionStateChange(callbackId, handleConnectionStateChange);

    return () => {
      syncService.offConnectionStateChange(callbackId);
    };
  }, [handleConnectionStateChange]);

  // Auto-subscribe to user events
  useEffect(() => {
    if (autoSubscribeToUserEvents && user) {
      subscribeToUserEvents();
      
      return () => {
        unsubscribeFromUserEvents();
      };
    }
  }, [autoSubscribeToUserEvents, user, subscribeToUserEvents, unsubscribeFromUserEvents]);

  // Auto-subscribe to user RSVPs
  useEffect(() => {
    if (autoSubscribeToUserRSVPs && user) {
      subscribeToUserRSVPs();
      
      return () => {
        unsubscribeFromUserRSVPs();
      };
    }
  }, [autoSubscribeToUserRSVPs, user, subscribeToUserRSVPs, unsubscribeFromUserRSVPs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    ...state,
    
    // Actions
    subscribeToEvent,
    unsubscribeFromEvent,
    subscribeToUserEvents,
    unsubscribeFromUserEvents,
    subscribeToUserRSVPs,
    unsubscribeFromUserRSVPs,
    reconnect,
    disconnect,
    clearSyncEvents,
    clearError,
  };
}

// Specialized hook for single event synchronization
export function useEventSyncSingle(eventId: string, options: {
  onEventUpdated?: (event: EventSyncEvent) => void;
  onAttendeeChanged?: (event: EventSyncEvent) => void;
} = {}) {
  const { onEventUpdated, onAttendeeChanged } = options;
  
  const syncHook = useEventSync({
    onEventUpdated,
    onAttendeeAdded: onAttendeeChanged,
    onAttendeeUpdated: onAttendeeChanged,
    onAttendeeRemoved: onAttendeeChanged,
  });

  // Subscribe to the specific event
  useEffect(() => {
    if (eventId) {
      syncHook.subscribeToEvent(eventId);
      
      return () => {
        syncHook.unsubscribeFromEvent(eventId);
      };
    }
  }, [eventId, syncHook]);

  return {
    connectionState: syncHook.connectionState,
    isConnected: syncHook.isConnected,
    isConnecting: syncHook.isConnecting,
    error: syncHook.error,
    syncEvents: syncHook.syncEvents.filter(event => 
      event.data.event?.id === eventId || event.data.attendee?.event_id === eventId
    ),
    clearError: syncHook.clearError,
    reconnect: syncHook.reconnect,
  };
}
