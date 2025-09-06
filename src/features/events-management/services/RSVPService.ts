import { supabase } from '../../../shared/data/supabase';
import {
  EventAttendee,
  EventRSVPData,
  RSVPOperationResult,
  EventError,
  AttendeeStatus,
} from '../types';

export class RSVPService {
  /**
   * RSVP to an event
   */
  async rsvpToEvent(userId: string, rsvpData: EventRSVPData): Promise<RSVPOperationResult> {
    try {
      // Check if event exists and has availability
      const { data: event } = await supabase
        .from('pg_events')
        .select('id, max_attendees, current_attendees, start_date')
        .eq('id', rsvpData.event_id)
        .eq('is_active', true)
        .single();

      if (!event) {
        throw this.createError('EVENT_NOT_FOUND', 'Event not found or inactive');
      }

      // Check if event is in the past
      if (new Date(event.start_date) < new Date()) {
        throw this.createError('PAST_EVENT', 'Cannot RSVP to past events');
      }

      // Check availability for "going" status
      if (rsvpData.status === AttendeeStatus.GOING) {
        if (event.max_attendees && event.current_attendees >= event.max_attendees) {
          throw this.createError('EVENT_FULL', 'Event has reached maximum capacity');
        }
      }

      // Check if user already has an RSVP
      const { data: existingRSVP } = await supabase
        .from('pg_event_attendees')
        .select('*')
        .eq('event_id', rsvpData.event_id)
        .eq('user_id', userId)
        .single();

      let attendee: EventAttendee;

      if (existingRSVP) {
        // Update existing RSVP
        const { data: updatedAttendee, error } = await supabase
          .from('pg_event_attendees')
          .update({
            status: rsvpData.status,
            notes: rsvpData.notes,
            rsvp_date: new Date().toISOString(),
          })
          .eq('id', existingRSVP.id)
          .select(`
            *,
            user:pg_profiles!user_id(
              id,
              full_name,
              avatar_url
            )
          `)
          .single();

        if (error) {
          throw this.createError('NETWORK_ERROR', error.message, { error });
        }

        attendee = updatedAttendee;

        // Update attendee count if status changed
        await this.updateAttendeeCount(rsvpData.event_id, existingRSVP.status, rsvpData.status);
      } else {
        // Create new RSVP
        const { data: newAttendee, error } = await supabase
          .from('pg_event_attendees')
          .insert({
            event_id: rsvpData.event_id,
            user_id: userId,
            status: rsvpData.status,
            notes: rsvpData.notes,
            rsvp_date: new Date().toISOString(),
          })
          .select(`
            *,
            user:pg_profiles!user_id(
              id,
              full_name,
              avatar_url
            )
          `)
          .single();

        if (error) {
          throw this.createError('NETWORK_ERROR', error.message, { error });
        }

        attendee = newAttendee;

        // Update attendee count for new RSVP
        await this.updateAttendeeCount(rsvpData.event_id, null, rsvpData.status);
      }

      return {
        success: true,
        attendee: this.transformAttendeeData(attendee),
      };
    } catch (error: any) {
      console.error('Error RSVPing to event:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Remove RSVP from event
   */
  async removeRSVP(userId: string, eventId: string): Promise<RSVPOperationResult> {
    try {
      // Get existing RSVP
      const { data: existingRSVP } = await supabase
        .from('pg_event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (!existingRSVP) {
        throw this.createError('EVENT_NOT_FOUND', 'RSVP not found');
      }

      // Delete RSVP
      const { error } = await supabase
        .from('pg_event_attendees')
        .delete()
        .eq('id', existingRSVP.id);

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      // Update attendee count
      await this.updateAttendeeCount(eventId, existingRSVP.status, null);

      return {
        success: true,
        attendee: this.transformAttendeeData(existingRSVP),
      };
    } catch (error: any) {
      console.error('Error removing RSVP:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Get user's RSVP for an event
   */
  async getUserRSVP(userId: string, eventId: string): Promise<EventAttendee | null> {
    try {
      const { data: attendee, error } = await supabase
        .from('pg_event_attendees')
        .select(`
          *,
          user:pg_profiles!user_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user RSVP:', error);
        return null;
      }

      return attendee ? this.transformAttendeeData(attendee) : null;
    } catch (error) {
      console.error('Error fetching user RSVP:', error);
      return null;
    }
  }

  /**
   * Get all attendees for an event
   */
  async getEventAttendees(
    eventId: string,
    status?: AttendeeStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<EventAttendee[]> {
    try {
      let query = supabase
        .from('pg_event_attendees')
        .select(`
          *,
          user:pg_profiles!user_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query
        .order('rsvp_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: attendees, error } = await query;

      if (error) {
        console.error('Error fetching event attendees:', error);
        return [];
      }

      return (attendees || []).map(attendee => this.transformAttendeeData(attendee));
    } catch (error) {
      console.error('Error fetching event attendees:', error);
      return [];
    }
  }

  /**
   * Get user's RSVPs (events they've RSVP'd to)
   */
  async getUserRSVPs(
    userId: string,
    status?: AttendeeStatus,
    includeUpcoming: boolean = true,
    limit: number = 20,
    offset: number = 0
  ): Promise<EventAttendee[]> {
    try {
      let query = supabase
        .from('pg_event_attendees')
        .select(`
          *,
          event:pg_events!event_id(
            id,
            title,
            description,
            event_type,
            start_date,
            end_date,
            location_name,
            address,
            latitude,
            longitude,
            is_active
          ),
          user:pg_profiles!user_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      if (includeUpcoming) {
        query = query.gte('event.start_date', new Date().toISOString());
      }

      query = query
        .eq('event.is_active', true)
        .order('rsvp_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: rsvps, error } = await query;

      if (error) {
        console.error('Error fetching user RSVPs:', error);
        return [];
      }

      return (rsvps || []).map(rsvp => this.transformAttendeeData(rsvp));
    } catch (error) {
      console.error('Error fetching user RSVPs:', error);
      return [];
    }
  }

  /**
   * Get RSVP statistics for an event
   */
  async getEventRSVPStats(eventId: string): Promise<{
    going: number;
    interested: number;
    maybe: number;
    total: number;
  }> {
    try {
      const { data: attendees } = await supabase
        .from('pg_event_attendees')
        .select('status')
        .eq('event_id', eventId);

      const stats = {
        going: 0,
        interested: 0,
        maybe: 0,
        total: 0,
      };

      if (attendees) {
        attendees.forEach(attendee => {
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
        });
        stats.total = attendees.length;
      }

      return stats;
    } catch (error) {
      console.error('Error fetching RSVP stats:', error);
      return { going: 0, interested: 0, maybe: 0, total: 0 };
    }
  }

  /**
   * Update attendee count for an event
   */
  private async updateAttendeeCount(
    eventId: string,
    oldStatus: AttendeeStatus | null,
    newStatus: AttendeeStatus | null
  ): Promise<void> {
    try {
      // Calculate the change in "going" count
      let countChange = 0;
      
      if (oldStatus === AttendeeStatus.GOING) {
        countChange -= 1;
      }
      
      if (newStatus === AttendeeStatus.GOING) {
        countChange += 1;
      }

      if (countChange !== 0) {
        // Update the current_attendees count
        const { error } = await supabase.rpc('update_event_attendee_count', {
          event_id: eventId,
          count_change: countChange,
        });

        if (error) {
          console.error('Error updating attendee count:', error);
        }
      }
    } catch (error) {
      console.error('Error updating attendee count:', error);
    }
  }

  /**
   * Transform raw attendee data from database
   */
  private transformAttendeeData(rawAttendee: any): EventAttendee {
    return {
      id: rawAttendee.id,
      event_id: rawAttendee.event_id,
      user_id: rawAttendee.user_id,
      status: rawAttendee.status,
      rsvp_date: rawAttendee.rsvp_date,
      notes: rawAttendee.notes,
      user: rawAttendee.user ? {
        id: rawAttendee.user.id,
        full_name: rawAttendee.user.full_name,
        avatar_url: rawAttendee.user.avatar_url,
      } : undefined,
    };
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
