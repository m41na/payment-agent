// =============================================================================
// Events Management Feature - Public API
// =============================================================================

// Main Hooks
export { useEventsManagement } from './hooks/useEventsManagement';
export { useEvents } from './hooks/useEvents';
export { useRSVP, useUserRSVPs } from './hooks/useRSVP';
export { useEventSync, useEventSyncSingle } from './hooks/useEventSync';

// Services
export { EventService } from './services/EventService';
export { RSVPService } from './services/RSVPService';
export { EventSyncService } from './services/EventSyncService';

// Types - Core Domain Types
export type {
  Event,
  EventOrganizer,
  EventContactInfo,
  EventAttendee,
} from './types';

// Types - Data Transfer Objects
export type {
  EventCreateData,
  EventUpdateData,
  EventRSVPData,
} from './types';

// Types - Operation Results
export type {
  EventOperationResult,
  RSVPOperationResult,
  EventAnalytics,
} from './types';

// Types - Filtering and Sorting
export type {
  EventFilters,
  EventSortBy,
  EventDateRange,
  EventLocationFilter,
} from './types';

// Types - Real-time Sync
export type {
  EventSyncEvent,
  EventSyncEventType,
  ConnectionState,
} from './types';

// Types - Error Handling
export type {
  EventError,
} from './types';

// Enums
export {
  EventType,
  AttendeeStatus,
  EventSortBy,
  ConnectionState,
  EventSyncEventType,
} from './types';

// Constants
export {
  EVENT_CONSTANTS,
  ATTENDEE_CONSTANTS,
  SYNC_CONSTANTS,
} from './types';

// =============================================================================
// Feature Metadata
// =============================================================================

export const EVENTS_MANAGEMENT_FEATURE = {
  name: 'Events Management',
  version: '1.0.0',
  description: 'Complete events management system with RSVP functionality and real-time synchronization',
  
  // Dependencies
  dependencies: {
    required: [
      '@supabase/supabase-js',
      '@react-native-async-storage/async-storage',
      'react',
      'react-native',
    ],
    contexts: [
      'AuthContext',
    ],
    external: [
      'expo-location',
    ],
  },
  
  // Database Requirements
  database: {
    tables: [
      'pg_events',
      'pg_event_attendees',
      'pg_profiles',
    ],
    functions: [
      'update_event_attendee_count',
    ],
    policies: [
      'Events are viewable by everyone',
      'Users can only modify their own events',
      'Users can only modify their own RSVPs',
    ],
  },
  
  // Feature Capabilities
  capabilities: {
    events: [
      'Create, read, update, delete events',
      'Event search and filtering',
      'Geographic filtering by distance',
      'Event analytics and view tracking',
      'Soft delete with data preservation',
      'Event type categorization',
      'Date and time management',
      'Location and address handling',
      'Contact information management',
    ],
    rsvp: [
      'RSVP to events with status (going, interested, maybe)',
      'Add notes to RSVPs',
      'View event attendees',
      'Track RSVP statistics',
      'Manage user RSVP history',
      'Attendee capacity management',
      'RSVP status updates',
    ],
    realtime: [
      'Real-time event updates',
      'Real-time RSVP changes',
      'Connection state monitoring',
      'Offline event caching',
      'Automatic reconnection with exponential backoff',
      'Event synchronization across devices',
    ],
    analytics: [
      'Event view tracking',
      'RSVP statistics',
      'Event discovery metrics',
      'Geographic analytics',
    ],
  },
  
  // Integration Points
  integration: {
    ui: {
      screens: [
        'EventListScreen',
        'EventDetailScreen',
        'EventCreationScreen',
        'EventEditScreen',
        'AttendeesScreen',
      ],
      components: [
        'EventCard',
        'EventCreationModal',
        'RSVPButton',
        'AttendeesList',
        'EventFilters',
      ],
    },
    features: {
      'location-services': 'Geographic filtering and distance calculations',
      'user-profile': 'Event organizer and attendee profiles',
      'messaging': 'Event-related communications',
      'payment-processing': 'Paid event ticketing (future)',
    },
  },
  
  // Configuration Options
  configuration: {
    events: {
      defaultPageSize: 20,
      maxSearchRadius: 50, // kilometers
      maxEventDuration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      allowPastEventRSVP: false,
    },
    sync: {
      maxSyncEvents: 50,
      reconnectAttempts: 5,
      reconnectDelay: 1000, // milliseconds
      maxReconnectDelay: 30000, // milliseconds
    },
    rsvp: {
      allowMultipleStatuses: false,
      requireNotesForMaybe: false,
      maxNotesLength: 500,
    },
  },
  
  // Performance Characteristics
  performance: {
    caching: {
      events: 'In-memory with AsyncStorage persistence',
      rsvps: 'In-memory with real-time sync',
      sync: 'Event queue with size limits',
    },
    optimization: {
      pagination: 'Cursor-based with configurable page sizes',
      search: 'Full-text search with geographic filtering',
      realtime: 'Selective subscriptions with connection pooling',
    },
  },
  
  // Security Model
  security: {
    authentication: 'Required for all operations',
    authorization: [
      'Users can only modify their own events',
      'Users can RSVP to any active event',
      'Event visibility controlled by is_active flag',
      'Soft delete preserves data integrity',
    ],
    dataProtection: [
      'Row Level Security (RLS) on all tables',
      'User-scoped real-time subscriptions',
      'Input validation and sanitization',
      'Error messages avoid information leakage',
    ],
  },
  
  // Testing Strategy
  testing: {
    unit: [
      'Service layer business logic',
      'Hook state management',
      'Type validation',
      'Error handling',
    ],
    integration: [
      'Supabase database operations',
      'Real-time subscription handling',
      'Cross-hook data synchronization',
    ],
    e2e: [
      'Complete event lifecycle',
      'RSVP workflows',
      'Real-time sync scenarios',
      'Offline/online transitions',
    ],
  },
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a new Events Management instance with default configuration
 */
export function createEventsManagement(config?: Partial<typeof EVENTS_MANAGEMENT_FEATURE.configuration>) {
  return {
    ...EVENTS_MANAGEMENT_FEATURE,
    configuration: {
      ...EVENTS_MANAGEMENT_FEATURE.configuration,
      ...config,
    },
  };
}

/**
 * Validate Events Management feature dependencies
 */
export function validateEventsManagementDependencies(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required dependencies
  try {
    require('@supabase/supabase-js');
  } catch {
    missing.push('@supabase/supabase-js');
  }
  
  try {
    require('@react-native-async-storage/async-storage');
  } catch {
    missing.push('@react-native-async-storage/async-storage');
  }
  
  try {
    require('react');
  } catch {
    missing.push('react');
  }
  
  try {
    require('react-native');
  } catch {
    missing.push('react-native');
  }
  
  // Check optional dependencies
  try {
    require('expo-location');
  } catch {
    warnings.push('expo-location is recommended for enhanced location features');
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

// =============================================================================
// Export Default
// =============================================================================

export default EVENTS_MANAGEMENT_FEATURE;
