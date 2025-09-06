// Core domain types
export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  location_name?: string;
  address?: string;
  latitude: number;
  longitude: number;
  contact_info: ContactInfo;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  max_attendees?: number;
  current_attendees: number;
  created_at: string;
  updated_at: string;
  organizer?: EventOrganizer;
  distance?: number;
  products?: EventProduct[];
  attendees?: EventAttendee[];
}

export interface EventOrganizer {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  rating?: number;
  total_events: number;
}

export interface EventProduct {
  id: string;
  event_id: string;
  product_id: string;
  title: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  rsvp_date: string;
  notes?: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

// Event types and enums
export type EventType = 
  | 'garage_sale' 
  | 'auction' 
  | 'farmers_market' 
  | 'flea_market' 
  | 'estate_sale' 
  | 'country_fair' 
  | 'craft_fair' 
  | 'food_truck' 
  | 'pop_up_shop' 
  | 'community_event'
  | 'other';

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AttendeeStatus {
  INTERESTED = 'interested',
  GOING = 'going',
  MAYBE = 'maybe',
  NOT_GOING = 'not_going',
}

// Operation types
export interface CreateEventData {
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  location_name?: string;
  address?: string;
  latitude: number;
  longitude: number;
  contact_info: ContactInfo;
  tags?: string[];
  max_attendees?: number;
  is_featured?: boolean;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  location_name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contact_info?: Partial<ContactInfo>;
  tags?: string[];
  max_attendees?: number;
  is_active?: boolean;
  is_featured?: boolean;
}

export interface EventRSVPData {
  event_id: string;
  status: AttendeeStatus;
  notes?: string;
}

// Search and filtering types
export interface EventFilters {
  event_types?: EventType[];
  date_from?: string;
  date_to?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };
  organizer_id?: string;
  tags?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  has_availability?: boolean;
  price_range?: {
    min?: number;
    max?: number;
  };
}

export interface EventSearchResult {
  events: Event[];
  total_count: number;
  has_more: boolean;
  facets?: {
    event_types: { type: EventType; count: number }[];
    locations: { city: string; count: number }[];
    date_ranges: { range: string; count: number }[];
  };
}

export interface EventSuggestion {
  event: Event;
  reason: 'location' | 'interests' | 'past_attendance' | 'trending';
  score: number;
}

// Analytics types
export interface EventAnalytics {
  event_id: string;
  views: number;
  rsvps: number;
  attendee_breakdown: {
    going: number;
    interested: number;
    maybe: number;
  };
  geographic_distribution: {
    city: string;
    count: number;
  }[];
  peak_interest_times: {
    hour: number;
    views: number;
  }[];
  conversion_rate: number; // views to RSVPs
}

export interface EventInsights {
  total_events: number;
  active_events: number;
  total_attendees: number;
  average_attendance: number;
  popular_event_types: {
    type: EventType;
    count: number;
    growth: number;
  }[];
  upcoming_events: Event[];
  trending_events: Event[];
}

// Error types
export interface EventError {
  code: 'EVENT_NOT_FOUND' | 'INVALID_EVENT_DATA' | 'UNAUTHORIZED' | 'EVENT_FULL' | 'PAST_EVENT' | 'NETWORK_ERROR' | 'LOCATION_ERROR';
  message: string;
  details?: Record<string, any>;
}

// Service operation results
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

// Real-time event types
export interface EventUpdateEvent {
  type: 'event_created' | 'event_updated' | 'event_cancelled' | 'rsvp_added' | 'rsvp_updated';
  event_id: string;
  organizer_id: string;
  changes?: Partial<Event>;
  timestamp: string;
}

export interface EventSubscriptionEvent extends EventUpdateEvent {}

// Event type metadata
export const EVENT_TYPE_CONFIG: Record<EventType, {
  label: string;
  color: string;
  icon: string;
  description: string;
  typical_duration_hours: number;
}> = {
  garage_sale: {
    label: 'Garage Sale',
    color: '#ff9800',
    icon: 'home-variant',
    description: 'Household items and personal belongings',
    typical_duration_hours: 8,
  },
  auction: {
    label: 'Auction',
    color: '#e91e63',
    icon: 'gavel',
    description: 'Bidding on various items',
    typical_duration_hours: 4,
  },
  farmers_market: {
    label: 'Farmers Market',
    color: '#4caf50',
    icon: 'sprout',
    description: 'Fresh produce and local goods',
    typical_duration_hours: 6,
  },
  flea_market: {
    label: 'Flea Market',
    color: '#9c27b0',
    icon: 'store',
    description: 'Antiques, collectibles, and unique finds',
    typical_duration_hours: 8,
  },
  estate_sale: {
    label: 'Estate Sale',
    color: '#795548',
    icon: 'home-city',
    description: 'Complete household contents sale',
    typical_duration_hours: 12,
  },
  country_fair: {
    label: 'Country Fair',
    color: '#ffeb3b',
    icon: 'ferris-wheel',
    description: 'Rural community celebration',
    typical_duration_hours: 10,
  },
  craft_fair: {
    label: 'Craft Fair',
    color: '#00bcd4',
    icon: 'palette',
    description: 'Handmade crafts and artisan goods',
    typical_duration_hours: 8,
  },
  food_truck: {
    label: 'Food Truck',
    color: '#ff5722',
    icon: 'truck',
    description: 'Mobile food service',
    typical_duration_hours: 6,
  },
  pop_up_shop: {
    label: 'Pop-up Shop',
    color: '#3f51b5',
    icon: 'shopping',
    description: 'Temporary retail experience',
    typical_duration_hours: 8,
  },
  community_event: {
    label: 'Community Event',
    color: '#2196f3',
    icon: 'account-group',
    description: 'Local community gathering',
    typical_duration_hours: 4,
  },
  other: {
    label: 'Other',
    color: '#607d8b',
    icon: 'calendar',
    description: 'Custom event type',
    typical_duration_hours: 4,
  },
};

// Constants
export const MAX_EVENT_TITLE_LENGTH = 100;
export const MAX_EVENT_DESCRIPTION_LENGTH = 2000;
export const MAX_EVENT_TAGS = 10;
export const DEFAULT_EVENT_RADIUS_KM = 50;
export const EVENT_STORAGE_KEY = '@events_cache';
export const RSVP_STORAGE_KEY = '@rsvp_cache';
