import { supabase } from '../../../shared/data/supabase';
import {
  Event,
  CreateEventData,
  UpdateEventData,
  EventOperationResult,
  EventError,
  EventFilters,
  EventSearchResult,
  EventAnalytics,
  EventInsights,
  EventType,
  EventStatus,
  EVENT_TYPE_CONFIG,
  MAX_EVENT_TITLE_LENGTH,
  MAX_EVENT_DESCRIPTION_LENGTH,
  MAX_EVENT_TAGS,
  DEFAULT_EVENT_RADIUS_KM,
} from '../types';

export class EventService {
  /**
   * Create new event
   */
  async createEvent(organizerId: string, eventData: CreateEventData): Promise<EventOperationResult> {
    try {
      // Validate input data
      this.validateCreateEventData(eventData);

      // Create event record
      const eventRecord = {
        organizer_id: organizerId,
        title: eventData.title,
        description: eventData.description,
        event_type: eventData.event_type,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        location_name: eventData.location_name,
        address: eventData.address,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        contact_info: eventData.contact_info,
        tags: eventData.tags || [],
        max_attendees: eventData.max_attendees,
        current_attendees: 0,
        is_active: true,
        is_featured: eventData.is_featured || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: event, error } = await supabase
        .from('pg_events')
        .insert(eventRecord)
        .select(`
          *,
          organizer:pg_profiles!organizer_id(
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      return {
        success: true,
        event: this.transformEventData(event),
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Update existing event
   */
  async updateEvent(
    organizerId: string,
    eventId: string,
    updates: UpdateEventData
  ): Promise<EventOperationResult> {
    try {
      // Validate update data
      this.validateUpdateEventData(updates);

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data: event, error } = await supabase
        .from('pg_events')
        .update(updateData)
        .eq('id', eventId)
        .eq('organizer_id', organizerId)
        .select(`
          *,
          organizer:pg_profiles!organizer_id(
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      if (!event) {
        throw this.createError('EVENT_NOT_FOUND', 'Event not found or unauthorized');
      }

      return {
        success: true,
        event: this.transformEventData(event),
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string, userId?: string): Promise<Event | null> {
    try {
      let query = supabase
        .from('pg_events')
        .select(`
          *,
          organizer:pg_profiles!organizer_id(
            id,
            full_name,
            avatar_url,
            bio
          ),
          attendees:pg_event_attendees(
            id,
            user_id,
            status,
            rsvp_date,
            notes,
            user:pg_profiles!user_id(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('id', eventId)
        .eq('is_active', true);

      const { data: event, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching event:', error);
        return null;
      }

      if (!event) return null;

      // Calculate distance if user location is available
      let transformedEvent = this.transformEventData(event);
      
      if (userId) {
        // Track event view for analytics
        await this.trackEventView(eventId, userId);
      }

      return transformedEvent;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  /**
   * Search events with filters and pagination
   */
  async searchEvents(
    filters: EventFilters = {},
    limit: number = 20,
    offset: number = 0,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<EventSearchResult> {
    try {
      let query = supabase
        .from('pg_events')
        .select(`
          *,
          organizer:pg_profiles!organizer_id(
            id,
            full_name,
            avatar_url,
            bio
          )
        `, { count: 'exact' })
        .eq('is_active', true);

      // Apply filters
      if (filters.event_types && filters.event_types.length > 0) {
        query = query.in('event_type', filters.event_types);
      }

      if (filters.date_from) {
        query = query.gte('start_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('end_date', filters.date_to);
      }

      if (filters.organizer_id) {
        query = query.eq('organizer_id', filters.organizer_id);
      }

      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }

      if (filters.has_availability) {
        query = query.or('max_attendees.is.null,current_attendees.lt.max_attendees');
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Location-based filtering
      if (filters.location) {
        const { latitude, longitude, radius_km } = filters.location;
        // Use PostGIS for geographic queries if available, otherwise filter in memory
        query = query.gte('latitude', latitude - (radius_km / 111))
                   .lte('latitude', latitude + (radius_km / 111))
                   .gte('longitude', longitude - (radius_km / (111 * Math.cos(latitude * Math.PI / 180))))
                   .lte('longitude', longitude + (radius_km / (111 * Math.cos(latitude * Math.PI / 180))));
      }

      // Apply pagination and ordering
      query = query
        .order('start_date', { ascending: true })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: events, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const transformedEvents = (events || []).map(event => {
        let transformedEvent = this.transformEventData(event);
        
        // Calculate distance if user location provided
        if (userLocation) {
          transformedEvent.distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            event.latitude,
            event.longitude
          );
        }
        
        return transformedEvent;
      });

      return {
        events: transformedEvents,
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error('Error searching events:', error);
      return {
        events: [],
        total_count: 0,
        has_more: false,
      };
    }
  }

  /**
   * Get events by organizer
   */
  async getEventsByOrganizer(
    organizerId: string,
    includeInactive: boolean = false,
    limit: number = 20,
    offset: number = 0
  ): Promise<EventSearchResult> {
    try {
      let query = supabase
        .from('pg_events')
        .select(`
          *,
          organizer:pg_profiles!organizer_id(
            id,
            full_name,
            avatar_url,
            bio
          )
        `, { count: 'exact' })
        .eq('organizer_id', organizerId);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      query = query
        .order('start_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: events, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        events: (events || []).map(event => this.transformEventData(event)),
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      };
    } catch (error) {
      console.error('Error fetching organizer events:', error);
      return {
        events: [],
        total_count: 0,
        has_more: false,
      };
    }
  }

  /**
   * Delete event (soft delete by setting is_active to false)
   */
  async deleteEvent(organizerId: string, eventId: string): Promise<EventOperationResult> {
    try {
      const { data: event, error } = await supabase
        .from('pg_events')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('organizer_id', organizerId)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      if (!event) {
        throw this.createError('EVENT_NOT_FOUND', 'Event not found or unauthorized');
      }

      return {
        success: true,
        event: this.transformEventData(event),
      };
    } catch (error: any) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(eventId: string, organizerId: string): Promise<EventAnalytics | null> {
    try {
      // Get basic event data
      const event = await this.getEventById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        return null;
      }

      // Get analytics data (would typically come from analytics tables)
      const { data: attendees } = await supabase
        .from('pg_event_attendees')
        .select('status')
        .eq('event_id', eventId);

      const attendeeBreakdown = {
        going: attendees?.filter(a => a.status === 'going').length || 0,
        interested: attendees?.filter(a => a.status === 'interested').length || 0,
        maybe: attendees?.filter(a => a.status === 'maybe').length || 0,
      };

      const totalRsvps = attendeeBreakdown.going + attendeeBreakdown.interested + attendeeBreakdown.maybe;

      return {
        event_id: eventId,
        views: 0, // Would come from analytics tracking
        rsvps: totalRsvps,
        attendee_breakdown: attendeeBreakdown,
        geographic_distribution: [],
        peak_interest_times: [],
        conversion_rate: 0,
      };
    } catch (error) {
      console.error('Error fetching event analytics:', error);
      return null;
    }
  }

  /**
   * Track event view for analytics
   */
  private async trackEventView(eventId: string, userId: string): Promise<void> {
    try {
      // Insert view record (would typically go to analytics table)
      await supabase
        .from('pg_event_views')
        .insert({
          event_id: eventId,
          user_id: userId,
          viewed_at: new Date().toISOString(),
        });
    } catch (error) {
      // Don't throw on analytics errors
      console.warn('Failed to track event view:', error);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Transform raw event data from database
   */
  private transformEventData(rawEvent: any): Event {
    return {
      ...rawEvent,
      organizer: rawEvent.organizer ? {
        id: rawEvent.organizer.id,
        full_name: rawEvent.organizer.full_name,
        avatar_url: rawEvent.organizer.avatar_url,
        bio: rawEvent.organizer.bio,
        rating: 0, // Would come from ratings system
        total_events: 0, // Would be calculated
      } : undefined,
    };
  }

  /**
   * Validate create event data
   */
  private validateCreateEventData(data: CreateEventData): void {
    if (!data.title || data.title.trim().length === 0) {
      throw this.createError('INVALID_EVENT_DATA', 'Event title is required');
    }

    if (data.title.length > MAX_EVENT_TITLE_LENGTH) {
      throw this.createError('INVALID_EVENT_DATA', `Event title cannot exceed ${MAX_EVENT_TITLE_LENGTH} characters`);
    }

    if (data.description && data.description.length > MAX_EVENT_DESCRIPTION_LENGTH) {
      throw this.createError('INVALID_EVENT_DATA', `Event description cannot exceed ${MAX_EVENT_DESCRIPTION_LENGTH} characters`);
    }

    if (!data.event_type || !EVENT_TYPE_CONFIG[data.event_type]) {
      throw this.createError('INVALID_EVENT_DATA', 'Valid event type is required');
    }

    if (!data.start_date || !data.end_date) {
      throw this.createError('INVALID_EVENT_DATA', 'Start date and end date are required');
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (endDate <= startDate) {
      throw this.createError('INVALID_EVENT_DATA', 'End date must be after start date');
    }

    if (startDate < new Date()) {
      throw this.createError('INVALID_EVENT_DATA', 'Event cannot start in the past');
    }

    if (!data.latitude || !data.longitude) {
      throw this.createError('LOCATION_ERROR', 'Event location coordinates are required');
    }

    if (data.tags && data.tags.length > MAX_EVENT_TAGS) {
      throw this.createError('INVALID_EVENT_DATA', `Cannot have more than ${MAX_EVENT_TAGS} tags`);
    }

    if (data.max_attendees && data.max_attendees < 1) {
      throw this.createError('INVALID_EVENT_DATA', 'Maximum attendees must be at least 1');
    }
  }

  /**
   * Validate update event data
   */
  private validateUpdateEventData(data: UpdateEventData): void {
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        throw this.createError('INVALID_EVENT_DATA', 'Event title cannot be empty');
      }
      if (data.title.length > MAX_EVENT_TITLE_LENGTH) {
        throw this.createError('INVALID_EVENT_DATA', `Event title cannot exceed ${MAX_EVENT_TITLE_LENGTH} characters`);
      }
    }

    if (data.description !== undefined && data.description && data.description.length > MAX_EVENT_DESCRIPTION_LENGTH) {
      throw this.createError('INVALID_EVENT_DATA', `Event description cannot exceed ${MAX_EVENT_DESCRIPTION_LENGTH} characters`);
    }

    if (data.event_type !== undefined && !EVENT_TYPE_CONFIG[data.event_type]) {
      throw this.createError('INVALID_EVENT_DATA', 'Valid event type is required');
    }

    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (endDate <= startDate) {
        throw this.createError('INVALID_EVENT_DATA', 'End date must be after start date');
      }
    }

    if (data.tags && data.tags.length > MAX_EVENT_TAGS) {
      throw this.createError('INVALID_EVENT_DATA', `Cannot have more than ${MAX_EVENT_TAGS} tags`);
    }

    if (data.max_attendees !== undefined && data.max_attendees < 1) {
      throw this.createError('INVALID_EVENT_DATA', 'Maximum attendees must be at least 1');
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    code: EventError['code'],
    message: string,
    details?: Record<string, any>
  ): EventError {
    return {
      code,
      message,
      details,
    };
  }
}
