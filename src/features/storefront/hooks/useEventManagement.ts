// ============================================================================
// EVENT MANAGEMENT HOOK - Event CRUD Operations
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { EventManagementService } from '../services/EventManagementService';
import { 
  Event, 
  CreateEventData, 
  EventFilter, 
  EventError 
} from '../types';

interface EventManagementState {
  events: Event[];
  isLoading: boolean;
  error: EventError | null;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

interface EventManagementActions {
  // Event CRUD Operations
  fetchEvents: (filter?: EventFilter) => Promise<void>;
  createEvent: (eventData: CreateEventData) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<CreateEventData>) => Promise<Event>;
  deleteEvent: (eventId: string) => Promise<void>;
  toggleEventStatus: (eventId: string) => Promise<void>;
  
  // Utility Actions
  refreshEvents: () => Promise<void>;
  clearError: () => void;
}

export interface UseEventManagementReturn extends EventManagementState, EventManagementActions {
  // Computed Values
  activeEvents: Event[];
  inactiveEvents: Event[];
  totalEvents: number;
  hasEvents: boolean;
}

export const useEventManagement = (sellerId: string): UseEventManagementReturn => {
  const [state, setState] = useState<EventManagementState>({
    events: [],
    isLoading: false,
    error: null,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  });

  const eventService = EventManagementService.getInstance();

  // ============================================================================
  // EVENT OPERATIONS
  // ============================================================================

  const fetchEvents = useCallback(async (filter?: EventFilter): Promise<void> => {
    if (!sellerId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const events = await eventService.getEvents(sellerId, filter);
      setState(prev => ({ 
        ...prev, 
        events, 
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as EventError, 
        isLoading: false 
      }));
    }
  }, [sellerId, eventService]);

  const createEvent = useCallback(async (eventData: CreateEventData): Promise<Event> => {
    if (!sellerId) throw new Error('Seller ID is required');

    setState(prev => ({ ...prev, isCreating: true, error: null }));
    
    try {
      const newEvent = await eventService.createEvent(sellerId, eventData);
      setState(prev => ({ 
        ...prev, 
        events: [newEvent, ...prev.events],
        isCreating: false 
      }));
      return newEvent;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as EventError, 
        isCreating: false 
      }));
      throw error;
    }
  }, [sellerId, eventService]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CreateEventData>): Promise<Event> => {
    if (!sellerId) throw new Error('Seller ID is required');

    setState(prev => ({ ...prev, isUpdating: true, error: null }));
    
    try {
      const updatedEvent = await eventService.updateEvent(eventId, sellerId, updates);
      setState(prev => ({ 
        ...prev, 
        events: prev.events.map(e => e.id === eventId ? updatedEvent : e),
        isUpdating: false 
      }));
      return updatedEvent;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as EventError, 
        isUpdating: false 
      }));
      throw error;
    }
  }, [sellerId, eventService]);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    if (!sellerId) throw new Error('Seller ID is required');

    setState(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      await eventService.deleteEvent(eventId, sellerId);
      setState(prev => ({ 
        ...prev, 
        events: prev.events.filter(e => e.id !== eventId),
        isDeleting: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as EventError, 
        isDeleting: false 
      }));
      throw error;
    }
  }, [sellerId, eventService]);

  const toggleEventStatus = useCallback(async (eventId: string): Promise<void> => {
    if (!sellerId) throw new Error('Seller ID is required');

    setState(prev => ({ ...prev, isUpdating: true, error: null }));
    
    try {
      const updatedEvent = await eventService.toggleEventStatus(eventId, sellerId);
      setState(prev => ({ 
        ...prev, 
        events: prev.events.map(e => e.id === eventId ? updatedEvent : e),
        isUpdating: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as EventError, 
        isUpdating: false 
      }));
      throw error;
    }
  }, [sellerId, eventService]);

  // ============================================================================
  // UTILITY ACTIONS
  // ============================================================================

  const refreshEvents = useCallback(async (): Promise<void> => {
    await fetchEvents();
  }, [fetchEvents]);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time subscription
  useEffect(() => {
    if (!sellerId) return;

    const channel = eventService.createEventSubscription(sellerId, () => {
      fetchEvents();
    });

    return () => {
      eventService.removeEventSubscription(channel);
    };
  }, [sellerId, eventService, fetchEvents]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const activeEvents = state.events.filter(event => event.is_active);
  const inactiveEvents = state.events.filter(event => !event.is_active);
  const totalEvents = state.events.length;
  const hasEvents = totalEvents > 0;

  return {
    // State
    ...state,
    
    // Actions
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleEventStatus,
    refreshEvents,
    clearError,
    
    // Computed Values
    activeEvents,
    inactiveEvents,
    totalEvents,
    hasEvents,
  };
};
