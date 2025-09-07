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
} from '../types';

// Simple, clean state interface
interface UseEventsState {
  events: Event[];
  loading: boolean;
  error: EventError | null;
  hasMore: boolean;
  refreshing: boolean;
}

// Hook options interface
interface UseEventsOptions {
  initialFilters?: EventFilters;
  pageSize?: number;
  autoLoad?: boolean;
}

/**
 * REBUILT useEvents Hook - Simple and Defensive
 * 
 * Completely rebuilt from scratch to eliminate the state initialization
 * error that was causing "Property 'error' doesn't exist" crashes.
 */
export function useEvents(options: UseEventsOptions = {}) {
  console.log('[useEvents] REBUILT - Starting initialization with options:', options);
  
  // Get auth state
  const { user } = useAuth();
  console.log('[useEvents] REBUILT - Auth user exists:', !!user);
  
  // Extract options with safe defaults
  const { initialFilters, pageSize = 20, autoLoad = false } = options;
  console.log('[useEvents] REBUILT - Extracted options:', { initialFilters, pageSize, autoLoad });
  
  // Initialize state with explicit, safe defaults
  const [state, setState] = useState<UseEventsState>(() => {
    console.log('[useEvents] REBUILT - Initializing state with safe defaults');
    return {
      events: [],
      loading: false,
      error: null,
      hasMore: true,
      refreshing: false,
    };
  });
  
  console.log('[useEvents] REBUILT - State initialized successfully');
  
  // Create EventService instance (no parameters needed)
  const eventService = new EventService();
  
  // Simple load function with defensive error handling
  const loadEvents = useCallback(async (filters?: EventFilters, reset = false) => {
    console.log('[useEvents] REBUILT - loadEvents called with filters:', filters, 'reset:', reset);
    
    if (!user) {
      console.log('[useEvents] REBUILT - No user, skipping load');
      return;
    }
    
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        refreshing: !reset,
      }));
      
      console.log('[useEvents] REBUILT - About to call EventService.searchEvents');
      const result = await eventService.searchEvents(
        filters || {},
        pageSize,
        reset ? 0 : state.events.length
      );
      
      console.log('[useEvents] REBUILT - EventService.searchEvents completed');
      
      if (result && result.success && Array.isArray(result.events)) {
        setState(prev => ({
          ...prev,
          events: reset ? result.events : [...prev.events, ...result.events],
          hasMore: result.events.length === pageSize,
          loading: false,
          refreshing: false,
          error: null,
        }));
      } else {
        console.log('[useEvents] REBUILT - Invalid result from EventService:', result);
        setState(prev => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: { code: 'LOAD_FAILED', message: 'Failed to load events' },
        }));
      }
    } catch (error) {
      console.error('[useEvents] REBUILT - Error in loadEvents:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: { code: 'LOAD_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      }));
    }
  }, [user, pageSize, state.events.length]);
  
  // Simple CRUD operations with defensive error handling
  const createEvent = useCallback(async (eventData: EventCreateData): Promise<EventOperationResult> => {
    console.log('[useEvents] REBUILT - createEvent called');
    
    if (!user) {
      return { success: false, error: { code: 'NO_USER', message: 'User not authenticated' } };
    }
    
    try {
      const result = await eventService.createEvent(user.id, eventData);
      if (result && result.success && result.event) {
        setState(prev => ({
          ...prev,
          events: [result.event!, ...prev.events],
        }));
        return { success: true, event: result.event };
      } else {
        return { success: false, error: result.error || { code: 'CREATE_FAILED', message: 'Failed to create event' } };
      }
    } catch (error) {
      console.error('[useEvents] REBUILT - Error in createEvent:', error);
      return { success: false, error: { code: 'CREATE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }, [user]);
  
  const updateEvent = useCallback(async (eventId: string, updates: EventUpdateData): Promise<EventOperationResult> => {
    console.log('[useEvents] REBUILT - updateEvent called');
    
    if (!user) {
      return { success: false, error: { code: 'NO_USER', message: 'User not authenticated' } };
    }
    
    try {
      const result = await eventService.updateEvent(user.id, eventId, updates);
      if (result && result.success && result.event) {
        setState(prev => ({
          ...prev,
          events: prev.events.map(event => event.id === eventId ? result.event! : event),
        }));
        return { success: true, event: result.event };
      } else {
        return { success: false, error: result.error || { code: 'UPDATE_FAILED', message: 'Failed to update event' } };
      }
    } catch (error) {
      console.error('[useEvents] REBUILT - Error in updateEvent:', error);
      return { success: false, error: { code: 'UPDATE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }, [user]);
  
  const deleteEvent = useCallback(async (eventId: string): Promise<EventOperationResult> => {
    console.log('[useEvents] REBUILT - deleteEvent called');
    
    if (!user) {
      return { success: false, error: { code: 'NO_USER', message: 'User not authenticated' } };
    }
    
    try {
      const result = await eventService.deleteEvent(user.id, eventId);
      if (result && result.success) {
        setState(prev => ({
          ...prev,
          events: prev.events.filter(event => event.id !== eventId),
        }));
        return { success: true };
      } else {
        return { success: false, error: result.error || { code: 'DELETE_FAILED', message: 'Failed to delete event' } };
      }
    } catch (error) {
      console.error('[useEvents] REBUILT - Error in deleteEvent:', error);
      return { success: false, error: { code: 'DELETE_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }, [user]);
  
  // Simple utility functions
  const refreshEvents = useCallback(() => loadEvents(initialFilters, true), [loadEvents, initialFilters]);
  const loadMoreEvents = useCallback(() => loadEvents(initialFilters, false), [loadEvents, initialFilters]);
  const searchEvents = useCallback((query: string, filters?: EventFilters) => {
    loadEvents({ ...filters, search: query }, true);
  }, [loadEvents]);
  const clearEvents = useCallback(() => {
    setState(prev => ({ ...prev, events: [], hasMore: true, error: null }));
  }, []);
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  // Auto-load effect with defensive checks
  useEffect(() => {
    console.log('[useEvents] REBUILT - Auto-load effect triggered, autoLoad:', autoLoad, 'user:', !!user);
    if (autoLoad && user) {
      console.log('[useEvents] REBUILT - Triggering auto-load');
      loadEvents(initialFilters, true);
    }
  }, [autoLoad, user, loadEvents, initialFilters]);
  
  // Simple computed values with defensive programming
  const computed = useMemo(() => {
    console.log('[useEvents] REBUILT - Computing derived values');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Safe event filtering
    const events = state.events || [];
    
    const eventsByType = events.reduce((acc, event) => {
      const type = event.event_type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(event);
      return acc;
    }, {} as Record<string, Event[]>);
    
    const upcomingEvents = events.filter(event => {
      const startDate = event.start_date ? new Date(event.start_date) : null;
      return startDate && startDate >= now;
    });
    
    const pastEvents = events.filter(event => {
      const endDate = event.end_date ? new Date(event.end_date) : null;
      return endDate && endDate < now;
    });
    
    const todayEvents = events.filter(event => {
      const startDate = event.start_date ? new Date(event.start_date) : null;
      if (!startDate) return false;
      const eventDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      return eventDate.getTime() === today.getTime();
    });
    
    const thisWeekEvents = events.filter(event => {
      const startDate = event.start_date ? new Date(event.start_date) : null;
      return startDate && startDate >= now && startDate <= weekFromNow;
    });
    
    return {
      eventsByType,
      upcomingEvents,
      pastEvents,
      todayEvents,
      thisWeekEvents,
      eventCount: events.length,
      isEmpty: events.length === 0,
      isInitialLoad: !state.loading && events.length === 0 && !state.error,
    };
  }, [state.events, state.loading, state.error]);
  
  // Return memoized result to prevent re-renders
  return useMemo(() => {
    console.log('[useEvents] REBUILT - Returning memoized result');
    return {
      // State
      events: state.events,
      loading: state.loading,
      error: state.error,
      hasMore: state.hasMore,
      refreshing: state.refreshing,
      
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
      
      // Computed values
      ...computed,
    };
  }, [
    state.events,
    state.loading,
    state.error,
    state.hasMore,
    state.refreshing,
    createEvent,
    updateEvent,
    deleteEvent,
    loadEvents,
    loadMoreEvents,
    refreshEvents,
    searchEvents,
    clearEvents,
    clearError,
    computed,
  ]);
}
