/**
 * Cross-Feature Event System
 * 
 * Centralized export for all event system components.
 * Provides a unified interface for cross-feature communication.
 */

// Core event bus
export { EventBus, EventBusImpl } from './EventBus';
export type { EventBusInterface, EventCallback, EventSubscription } from './EventBus';

// Event types and constants
export * from './EventTypes';

// React hooks for event integration
export {
  useEventBus,
  useEventListener,
  useEventEmitter,
  useFeatureEvents,
} from './useEventBus';
export type { UseEventBusReturn } from './useEventBus';

// Event provider for React context
export { EventProvider, useEventContext } from './EventProvider';

// Convenience re-exports
export { EVENT_TYPES } from './EventTypes';
export type { EventType } from './EventTypes';
