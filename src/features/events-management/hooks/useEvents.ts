import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { EventService } from '../services/EventService';
import {
  Event,
  EventCreateData,
  EventUpdateData,
  EventFilters,
  EventOperationResult,
  EventError,
  EventType,
  EventSortBy,
} from '../types';

interface UseEventsState {
  events: Event[];
  loading: boolean;
  error: EventError | null;
  hasMore: boolean;
  refreshing: boolean;
}

interface UseEventsActions {
  createEvent: (eventData: EventCreateData) => Promise<EventOperationResult>;
  updateEvent: (eventId: string, updates: EventUpdateData) => Promise<EventOperationResult>;
  deleteEvent: (eventId: string) => Promise<EventOperationResult>;
  loadEvents: (filters?: EventFilters) => Promise<void>;
  loadMoreEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  searchEvents: (query: string, filters?: EventFilters) => Promise<void>;
  clearEvents: () => void;
  clearError: () => void;
}

interface UseEventsComputed {
  eventsByType: Record<EventType, Event[]>;
  upcomingEvents: Event[];
  pastEvents: Event[];
  todayEvents: Event[];
  thisWeekEvents: Event[];
  eventCount: number;
  isEmpty: boolean;
  isInitialLoad: boolean;
}

interface UseEventsReturn extends UseEventsState, UseEventsActions, UseEventsComputed {}

interface UseEventsOptions {
  initialFilters?: EventFilters;
  pageSize?: number;
  autoLoad?: boolean;
}

const eventService = new EventService();

export function useEvents(options: UseEventsOptions = {}): UseEventsReturn {
  const { user } = useAuth();
  const {
    initialFilters,
    pageSize = 20,
    autoLoad = true,
  } = options;

  const [state, setState] = useState<UseEventsState>({
    events: [],
    loading: false,
    error: null,
    hasMore: true,
    refreshing: false,
  });

  const [currentFilters, setCurrentFilters] = useState<EventFilters | undefined>(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load events
  const loadEvents = useCallback(async (filters?: EventFilters, reset: boolean = true) => {
    if (!user) return;

    try {
      setState(prev => ({
        ...prev,
        loading: reset,
        error: null,
        refreshing: !reset,
      }));

      const newFilters = filters || currentFilters;
      setCurrentFilters(newFilters);

      const offset = reset ? 0 : state.events.length;
      const events = await eventService.getEvents(
        newFilters,
        pageSize,
        offset
      );

      setState(prev => ({
        ...prev,
        events: reset ? events : [...prev.events, ...events],
        loading: false,
        refreshing: false,
        hasMore: events.length === pageSize,
      }));

      if (reset) {
        setCurrentPage(0);
      }

      setIsInitialLoad(false);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR', message: error.message }
          : error,
      }));
      setIsInitialLoad(false);
    }
  }, [user, currentFilters, state.events.length, pageSize]);

  // Load more events (pagination)
  const loadMoreEvents = useCallback(async () => {
    if (!state.hasMore || state.loading) return;
    await loadEvents(currentFilters, false);
    setCurrentPage(prev => prev + 1);
  }, [state.hasMore, state.loading, loadEvents, currentFilters]);

  // Refresh events
  const refreshEvents = useCallback(async () => {
    await loadEvents(currentFilters, true);
  }, [loadEvents, currentFilters]);

  // Search events
  const searchEvents = useCallback(async (query: string, filters?: EventFilters) => {
    if (!user) return;

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      setSearchQuery(query);
      const searchFilters = filters || currentFilters;
      setCurrentFilters(searchFilters);

      const events = await eventService.searchEvents(query, searchFilters, pageSize);

      setState(prev => ({
        ...prev,
        events,
        loading: false,
        hasMore: events.length === pageSize,
      }));

      setCurrentPage(0);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR', message: error.message }
          : error,
      }));
    }
  }, [user, currentFilters, pageSize]);

  // Create event
  const createEvent = useCallback(async (eventData: EventCreateData): Promise<EventOperationResult> => {
    if (!user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      const result = await eventService.createEvent(user.id, eventData);

      if (result.success && result.event) {
        // Add new event to the beginning of the list
        setState(prev => ({
          ...prev,
          events: [result.event!, ...prev.events],
        }));
      }

      return result;
    } catch (error: any) {
      const errorResult = {
        success: false as const,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR' as const, message: error.message }
          : error,
      };

      setState(prev => ({ ...prev, error: errorResult.error }));
      return errorResult;
    }
  }, [user]);

  // Update event
  const updateEvent = useCallback(async (eventId: string, updates: EventUpdateData): Promise<EventOperationResult> => {
    if (!user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      const result = await eventService.updateEvent(eventId, updates);

      if (result.success && result.event) {
        // Update event in the list
        setState(prev => ({
          ...prev,
          events: prev.events.map(event =>
            event.id === eventId ? result.event! : event
          ),
        }));
      }

      return result;
    } catch (error: any) {
      const errorResult = {
        success: false as const,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR' as const, message: error.message }
          : error,
      };

      setState(prev => ({ ...prev, error: errorResult.error }));
      return errorResult;
    }
  }, [user]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string): Promise<EventOperationResult> => {
    if (!user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      const result = await eventService.deleteEvent(eventId);

      if (result.success) {
        // Remove event from the list
        setState(prev => ({
          ...prev,
          events: prev.events.filter(event => event.id !== eventId),
        }));
      }

      return result;
    } catch (error: any) {
      const errorResult = {
        success: false as const,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR' as const, message: error.message }
          : error,
      };

      setState(prev => ({ ...prev, error: errorResult.error }));
      return errorResult;
    }
  }, [user]);

  // Clear events
  const clearEvents = useCallback(() => {
    setState(prev => ({
      ...prev,
      events: [],
      hasMore: true,
    }));
    setCurrentPage(0);
    setSearchQuery('');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Computed values
  const computed = useMemo<UseEventsComputed>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Group events by type
    const eventsByType = state.events.reduce((acc, event) => {
      if (!acc[event.event_type]) {
        acc[event.event_type] = [];
      }
      acc[event.event_type].push(event);
      return acc;
    }, {} as Record<EventType, Event[]>);

    // Filter events by time
    const upcomingEvents = state.events.filter(event => 
      new Date(event.start_date) >= now
    );

    const pastEvents = state.events.filter(event => 
      new Date(event.start_date) < now
    );

    const todayEvents = state.events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    });

    const thisWeekEvents = state.events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate >= now && eventDate <= weekFromNow;
    });

    return {
      eventsByType,
      upcomingEvents,
      pastEvents,
      todayEvents,
      thisWeekEvents,
      eventCount: state.events.length,
      isEmpty: state.events.length === 0,
      isInitialLoad,
    };
  }, [state.events, isInitialLoad]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user && isInitialLoad) {
      loadEvents(initialFilters);
    }
  }, [autoLoad, user, isInitialLoad, loadEvents, initialFilters]);

  return {
    // State
    ...state,
    
    // Actions
    createEvent,
    updateEvent,
    deleteEvent,
    loadEvents,
    loadMoreEvents,
    refreshEvents,
    searchEvents,
    clearEvents,
    clearError,
    
    // Computed
    ...computed,
  };
}
