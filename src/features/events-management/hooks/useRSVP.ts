import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { RSVPService } from '../services/RSVPService';
import {
  EventAttendee,
  EventRSVPData,
  RSVPOperationResult,
  EventError,
  AttendeeStatus,
} from '../types';

interface UseRSVPState {
  attendees: EventAttendee[];
  userRSVP: EventAttendee | null;
  loading: boolean;
  error: EventError | null;
  rsvpLoading: boolean;
  attendeesLoading: boolean;
}

interface UseRSVPActions {
  rsvpToEvent: (eventId: string, status: AttendeeStatus, notes?: string) => Promise<RSVPOperationResult>;
  removeRSVP: (eventId: string) => Promise<RSVPOperationResult>;
  loadUserRSVP: (eventId: string) => Promise<void>;
  loadEventAttendees: (eventId: string, status?: AttendeeStatus) => Promise<void>;
  refreshAttendees: (eventId: string) => Promise<void>;
  clearError: () => void;
}

interface UseRSVPComputed {
  rsvpStats: {
    going: number;
    interested: number;
    maybe: number;
    total: number;
  };
  attendeesByStatus: Record<AttendeeStatus, EventAttendee[]>;
  hasUserRSVP: boolean;
  userRSVPStatus: AttendeeStatus | null;
  canRSVP: boolean;
}

interface UseRSVPReturn extends UseRSVPState, UseRSVPActions, UseRSVPComputed {}

interface UseRSVPOptions {
  eventId?: string;
  autoLoadUserRSVP?: boolean;
  autoLoadAttendees?: boolean;
}

const rsvpService = new RSVPService();

export function useRSVP(options: UseRSVPOptions = {}): UseRSVPReturn {
  const { user } = useAuth();
  const {
    eventId,
    autoLoadUserRSVP = true,
    autoLoadAttendees = false,
  } = options;

  const [state, setState] = useState<UseRSVPState>({
    attendees: [],
    userRSVP: null,
    loading: false,
    error: null,
    rsvpLoading: false,
    attendeesLoading: false,
  });

  // RSVP to event
  const rsvpToEvent = useCallback(async (
    targetEventId: string,
    status: AttendeeStatus,
    notes?: string
  ): Promise<RSVPOperationResult> => {
    if (!user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
    }

    try {
      setState(prev => ({ 
        ...prev, 
        rsvpLoading: true, 
        error: null 
      }));

      const rsvpData: EventRSVPData = {
        event_id: targetEventId,
        status,
        notes,
      };

      const result = await rsvpService.rsvpToEvent(user.id, rsvpData);

      if (result.success && result.attendee) {
        // Update user RSVP
        setState(prev => ({
          ...prev,
          userRSVP: result.attendee!,
          rsvpLoading: false,
        }));

        // Update attendees list if it's loaded
        setState(prev => {
          const existingIndex = prev.attendees.findIndex(
            attendee => attendee.user_id === user.id
          );

          let updatedAttendees = [...prev.attendees];
          
          if (existingIndex >= 0) {
            updatedAttendees[existingIndex] = result.attendee!;
          } else {
            updatedAttendees.push(result.attendee!);
          }

          return {
            ...prev,
            attendees: updatedAttendees,
          };
        });
      } else {
        setState(prev => ({ 
          ...prev, 
          rsvpLoading: false,
          error: result.error || null,
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

      setState(prev => ({ 
        ...prev, 
        rsvpLoading: false,
        error: errorResult.error,
      }));

      return errorResult;
    }
  }, [user]);

  // Remove RSVP
  const removeRSVP = useCallback(async (targetEventId: string): Promise<RSVPOperationResult> => {
    if (!user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
    }

    try {
      setState(prev => ({ 
        ...prev, 
        rsvpLoading: true, 
        error: null 
      }));

      const result = await rsvpService.removeRSVP(user.id, targetEventId);

      if (result.success) {
        // Clear user RSVP
        setState(prev => ({
          ...prev,
          userRSVP: null,
          rsvpLoading: false,
        }));

        // Remove from attendees list
        setState(prev => ({
          ...prev,
          attendees: prev.attendees.filter(attendee => attendee.user_id !== user.id),
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          rsvpLoading: false,
          error: result.error || null,
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

      setState(prev => ({ 
        ...prev, 
        rsvpLoading: false,
        error: errorResult.error,
      }));

      return errorResult;
    }
  }, [user]);

  // Load user's RSVP for an event
  const loadUserRSVP = useCallback(async (targetEventId: string) => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const userRSVP = await rsvpService.getUserRSVP(user.id, targetEventId);

      setState(prev => ({
        ...prev,
        userRSVP,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR', message: error.message }
          : error,
      }));
    }
  }, [user]);

  // Load event attendees
  const loadEventAttendees = useCallback(async (
    targetEventId: string,
    status?: AttendeeStatus
  ) => {
    try {
      setState(prev => ({ 
        ...prev, 
        attendeesLoading: true, 
        error: null 
      }));

      const attendees = await rsvpService.getEventAttendees(targetEventId, status);

      setState(prev => ({
        ...prev,
        attendees,
        attendeesLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        attendeesLoading: false,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR', message: error.message }
          : error,
      }));
    }
  }, []);

  // Refresh attendees
  const refreshAttendees = useCallback(async (targetEventId: string) => {
    await loadEventAttendees(targetEventId);
  }, [loadEventAttendees]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Computed values
  const computed = useMemo<UseRSVPComputed>(() => {
    // Calculate RSVP statistics
    const rsvpStats = state.attendees.reduce(
      (stats, attendee) => {
        switch (attendee.status) {
          case AttendeeStatus.GOING:
            stats.going++;
            break;
          case AttendeeStatus.INTERESTED:
            stats.interested++;
            break;
          case AttendeeStatus.MAYBE:
            stats.maybe++;
            break;
        }
        stats.total++;
        return stats;
      },
      { going: 0, interested: 0, maybe: 0, total: 0 }
    );

    // Group attendees by status
    const attendeesByStatus = state.attendees.reduce(
      (groups, attendee) => {
        if (!groups[attendee.status]) {
          groups[attendee.status] = [];
        }
        groups[attendee.status].push(attendee);
        return groups;
      },
      {} as Record<AttendeeStatus, EventAttendee[]>
    );

    // Ensure all status groups exist
    Object.values(AttendeeStatus).forEach(status => {
      if (!attendeesByStatus[status]) {
        attendeesByStatus[status] = [];
      }
    });

    const hasUserRSVP = state.userRSVP !== null;
    const userRSVPStatus = state.userRSVP?.status || null;
    const canRSVP = user !== null && !state.rsvpLoading;

    return {
      rsvpStats,
      attendeesByStatus,
      hasUserRSVP,
      userRSVPStatus,
      canRSVP,
    };
  }, [state.attendees, state.userRSVP, user, state.rsvpLoading]);

  // Auto-load user RSVP on mount or eventId change
  useEffect(() => {
    if (autoLoadUserRSVP && user && eventId) {
      loadUserRSVP(eventId);
    }
  }, [autoLoadUserRSVP, user, eventId, loadUserRSVP]);

  // Auto-load attendees on mount or eventId change
  useEffect(() => {
    if (autoLoadAttendees && eventId) {
      loadEventAttendees(eventId);
    }
  }, [autoLoadAttendees, eventId, loadEventAttendees]);

  return {
    // State
    ...state,
    
    // Actions
    rsvpToEvent,
    removeRSVP,
    loadUserRSVP,
    loadEventAttendees,
    refreshAttendees,
    clearError,
    
    // Computed
    ...computed,
  };
}

// Hook for managing user's RSVPs across all events
export function useUserRSVPs() {
  const { user } = useAuth();
  const [state, setState] = useState<{
    rsvps: EventAttendee[];
    loading: boolean;
    error: EventError | null;
  }>({
    rsvps: [],
    loading: false,
    error: null,
  });

  const loadUserRSVPs = useCallback(async (
    status?: AttendeeStatus,
    includeUpcoming: boolean = true
  ) => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const rsvps = await rsvpService.getUserRSVPs(
        user.id,
        status,
        includeUpcoming
      );

      setState(prev => ({
        ...prev,
        rsvps,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error 
          ? { code: 'NETWORK_ERROR', message: error.message }
          : error,
      }));
    }
  }, [user]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (user) {
      loadUserRSVPs();
    }
  }, [user, loadUserRSVPs]);

  return {
    ...state,
    loadUserRSVPs,
    clearError,
  };
}
