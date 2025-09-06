// ============================================================================
// CORE MESSAGE TYPES
// ============================================================================

export interface Message {
  id: string;
  conversation_id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  updated_at?: string;
  is_read: boolean;
  read_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  reply_to_id?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  conversation_type: ConversationType;
  title?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  last_message_id?: string;
  last_message?: Message;
  last_activity_at: string;
  is_archived: boolean;
  archived_at?: string;
  metadata?: Record<string, any>;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  unread_count: number;
  last_read_at?: string;
  notification_settings: NotificationSettings;
}

export interface ConversationSummary {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  last_message_type: MessageType;
  unread_count: number;
  is_online?: boolean;
  conversation_type: ConversationType;
  is_archived: boolean;
}

// ============================================================================
// PARTICIPANT & USER TYPES
// ============================================================================

export interface MessageParticipant {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen_at?: string;
  status: UserStatus;
  role?: ParticipantRole;
}

export interface NotificationSettings {
  push_notifications: boolean;
  email_notifications: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  mute_until?: string;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  PRODUCT_INQUIRY = 'product_inquiry',
  ORDER_UPDATE = 'order_update',
  PAYMENT_REQUEST = 'payment_request',
}

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  SUPPORT = 'support',
  BUSINESS = 'business',
}

export enum ParticipantRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

// ============================================================================
// OPERATION TYPES
// ============================================================================

export interface SendMessageRequest {
  receiver_id?: string;
  conversation_id?: string;
  content: string;
  message_type: MessageType;
  reply_to_id?: string;
  attachments?: Omit<MessageAttachment, 'id' | 'message_id' | 'created_at'>[];
  metadata?: Record<string, any>;
}

export interface MessageOperationResult {
  success: boolean;
  message?: Message;
  error?: MessageError;
}

export interface ConversationOperationResult {
  success: boolean;
  conversation?: Conversation;
  error?: MessageError;
}

export interface MessagesResult {
  messages: Message[];
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
}

export interface ConversationsResult {
  conversations: ConversationSummary[];
  total_count: number;
  has_more: boolean;
}

// ============================================================================
// SEARCH & FILTERING
// ============================================================================

export interface MessageSearchQuery {
  query?: string;
  conversation_id?: string;
  sender_id?: string;
  message_type?: MessageType;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
  is_unread?: boolean;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface ConversationFilters {
  conversation_type?: ConversationType;
  has_unread?: boolean;
  is_archived?: boolean;
  participant_id?: string;
  last_activity_from?: string;
  last_activity_to?: string;
}

// ============================================================================
// REAL-TIME SYNC TYPES
// ============================================================================

export interface MessageSyncEvent {
  id: string;
  type: MessageSyncEventType;
  timestamp: string;
  conversation_id?: string;
  message_id?: string;
  user_id?: string;
  message?: Message;
  conversation?: Conversation;
  participant?: ConversationParticipant;
  metadata?: Record<string, any>;
}

export enum MessageSyncEventType {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_READ = 'message_read',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_UPDATED = 'message_updated',
  CONVERSATION_CREATED = 'conversation_created',
  CONVERSATION_UPDATED = 'conversation_updated',
  CONVERSATION_ARCHIVED = 'conversation_archived',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  USER_TYPING = 'user_typing',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  SYNC_STATE_CHANGED = 'sync_state_changed',
}

export enum MessageSyncState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// ============================================================================
// TYPING INDICATORS
// ============================================================================

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  user_name: string;
  started_at: string;
  expires_at: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface MessageError {
  code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 
        'MESSAGE_TOO_LONG' | 'ATTACHMENT_TOO_LARGE' | 'CONVERSATION_ARCHIVED' |
        'USER_BLOCKED' | 'RATE_LIMITED' | 'SYNC_ERROR' | 'SEND_FAILED';
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// ANALYTICS & INSIGHTS
// ============================================================================

export interface MessageAnalytics {
  total_messages: number;
  total_conversations: number;
  unread_messages: number;
  active_conversations: number;
  messages_sent_today: number;
  messages_received_today: number;
  average_response_time: number;
  most_active_conversations: ConversationSummary[];
  message_types_distribution: Record<MessageType, number>;
  hourly_activity: Array<{ hour: number; count: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MESSAGE_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENTS_PER_MESSAGE: 5,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  TYPING_INDICATOR_TIMEOUT: 3000, // 3 seconds
  MESSAGE_RETRY_ATTEMPTS: 3,
  MESSAGE_RETRY_DELAY: 1000, // 1 second
} as const;

export const MESSAGING_CONSTANTS = {
  CONVERSATION_LOAD_LIMIT: 20,
  MESSAGE_LOAD_LIMIT: 50,
  SEARCH_DEBOUNCE_MS: 300,
  TYPING_DEBOUNCE_MS: 1000,
  ONLINE_STATUS_TIMEOUT: 30000, // 30 seconds
  MAX_OFFLINE_MESSAGES: 1000,
  SYNC_RETRY_ATTEMPTS: 5,
  SYNC_RETRY_DELAY_BASE: 1000,
} as const;
