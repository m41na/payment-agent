// Attendee status enum
export enum AttendeeStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
}

// Connection state enum for real-time sync
export enum ConnectionState {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

// Event type enum
export enum EventType {
  SOCIAL = 'social',
  BUSINESS = 'business',
  EDUCATIONAL = 'educational',
  ENTERTAINMENT = 'entertainment',
  SPORTS = 'sports',
  OTHER = 'other',
}

// Error interface for events management
export interface EventError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Core domain types
export interface Event {
  id: string;
  title: string;
  description: string;
  organizer_id: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  location: string;
  latitude: number;
  longitude: number;
  max_attendees?: number;
  current_attendees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  distance?: number;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Data transfer objects
export interface CreateEventData {
  title: string;
  description: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  location: string;
  latitude: number;
  longitude: number;
  max_attendees?: number;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  max_attendees?: number;
}

export interface EventRSVPData {
  event_id: string;
  status: AttendeeStatus;
  notes?: string;
}

// Filtering and search types
export interface EventFilters {
  event_type?: EventType;
  date_range?: {
    start: string;
    end: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  max_attendees?: number;
  has_availability?: boolean;
}

// Operation result interfaces
export interface EventOperationResult {
  success: boolean;
  event?: Event;
  error?: EventError;
}

export interface RSVPOperationResult {
  success: boolean;
  attendee?: EventAttendee;
  error?: EventError;
}

// Context Type for Provider
export interface EventsManagementContextType {
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
  createEvent: (eventData: CreateEventData) => Promise<EventOperationResult>;
  updateEvent: (eventId: string, updates: UpdateEventData) => Promise<EventOperationResult>;
  deleteEvent: (eventId: string) => Promise<EventOperationResult>;
  loadEvents: (filters?: EventFilters) => Promise<void>;
  loadMoreEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  searchEvents: (query: string, filters?: EventFilters) => Promise<void>;
  clearEvents: () => void;
  
  // RSVP state and actions
  userRSVPs: EventAttendee[];
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
