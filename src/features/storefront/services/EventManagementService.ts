// ============================================================================
// EVENT MANAGEMENT SERVICE - Event CRUD Operations
// ============================================================================

import { supabase } from '../../../services/supabase';
import { 
  Event, 
  CreateEventData, 
  EventFilter, 
  EventError, 
  EventErrorCode 
} from '../types';

export class EventManagementService {
  private static instance: EventManagementService;

  public static getInstance(): EventManagementService {
    if (!EventManagementService.instance) {
      EventManagementService.instance = new EventManagementService();
    }
    return EventManagementService.instance;
  }

  // ============================================================================
  // EVENT CRUD OPERATIONS
  // ============================================================================

  async getEvents(sellerId: string, filter?: EventFilter): Promise<Event[]> {
    try {
      let query = supabase
        .from('pg_events')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter?.event_type) {
        query = query.eq('event_type', filter.event_type);
      }

      if (filter?.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active);
      }

      if (filter?.date_range) {
        query = query
          .gte('date', filter.date_range.start)
          .lte('date', filter.date_range.end);
      }

      const { data, error } = await query;

      if (error) {
        throw this.createError(EventErrorCode.EVENT_CREATION_FAILED, error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error instanceof Error ? error : this.createError(
        EventErrorCode.EVENT_CREATION_FAILED,
        'Failed to fetch events'
      );
    }
  }

  async createEvent(sellerId: string, eventData: CreateEventData): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('pg_events')
        .insert([{
          ...eventData,
          seller_id: sellerId,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        throw this.createError(EventErrorCode.EVENT_CREATION_FAILED, error.message);
      }

      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error instanceof Error ? error : this.createError(
        EventErrorCode.EVENT_CREATION_FAILED,
        'Failed to create event'
      );
    }
  }

  async updateEvent(eventId: string, sellerId: string, updates: Partial<CreateEventData>): Promise<Event> {
    try {
      const { data, error } = await supabase
        .from('pg_events')
        .update(updates)
        .eq('id', eventId)
        .eq('seller_id', sellerId)
        .select()
        .single();

      if (error) {
        throw this.createError(EventErrorCode.EVENT_UPDATE_FAILED, error.message);
      }

      if (!data) {
        throw this.createError(EventErrorCode.EVENT_NOT_FOUND, 'Event not found');
      }

      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error instanceof Error ? error : this.createError(
        EventErrorCode.EVENT_UPDATE_FAILED,
        'Failed to update event'
      );
    }
  }

  async deleteEvent(eventId: string, sellerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pg_events')
        .delete()
        .eq('id', eventId)
        .eq('seller_id', sellerId);

      if (error) {
        throw this.createError(EventErrorCode.EVENT_DELETE_FAILED, error.message);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error instanceof Error ? error : this.createError(
        EventErrorCode.EVENT_DELETE_FAILED,
        'Failed to delete event'
      );
    }
  }

  async toggleEventStatus(eventId: string, sellerId: string): Promise<Event> {
    try {
      // First get the current event
      const { data: currentEvent, error: fetchError } = await supabase
        .from('pg_events')
        .select('is_active')
        .eq('id', eventId)
        .eq('seller_id', sellerId)
        .single();

      if (fetchError || !currentEvent) {
        throw this.createError(EventErrorCode.EVENT_NOT_FOUND, 'Event not found');
      }

      // Toggle the status
      return await this.updateEvent(eventId, sellerId, {
        is_active: !currentEvent.is_active
      });
    } catch (error) {
      console.error('Error toggling event status:', error);
      throw error instanceof Error ? error : this.createError(
        EventErrorCode.EVENT_UPDATE_FAILED,
        'Failed to toggle event status'
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private createError(code: EventErrorCode, message: string, details?: Record<string, any>): EventError {
    return {
      code,
      message,
      details
    };
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTION HELPERS
  // ============================================================================

  createEventSubscription(sellerId: string, callback: () => void) {
    return supabase
      .channel('events_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pg_events',
        filter: `seller_id=eq.${sellerId}`,
      }, callback)
      .subscribe();
  }

  removeEventSubscription(channel: any) {
    return supabase.removeChannel(channel);
  }
}
