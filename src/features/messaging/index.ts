// ============================================================================
// MESSAGING FEATURE - PUBLIC API
// ============================================================================

// Services
export { MessageService } from './services/MessageService';
export { ConversationService } from './services/ConversationService';
export { MessageSyncService } from './services/MessageSyncService';

// Hooks
export { useMessaging } from './hooks/useMessaging';
export { useMessageSync } from './hooks/useMessageSync';
export { useMessagingManagement } from './hooks/useMessagingManagement';

// Types and Interfaces
export type {
  // Core message types
  Message,
  MessageAttachment,
  Conversation,
  ConversationParticipant,
  ConversationSummary,
  MessageParticipant,
  NotificationSettings,
  
  // Operation types
  SendMessageRequest,
  MessageOperationResult,
  ConversationOperationResult,
  MessagesResult,
  ConversationsResult,
  
  // Search and filtering
  MessageSearchQuery,
  ConversationFilters,
  
  // Real-time sync types
  MessageSyncEvent,
  TypingIndicator,
  
  // Error handling
  MessageError,
  
  // Analytics
  MessageAnalytics,
  
  // Hook return types
  UseMessagingReturn,
  UseMessageSyncReturn,
  UseMessagingManagementReturn,
} from './types';

// Enums
export {
  MessageType,
  ConversationType,
  ParticipantRole,
  UserStatus,
  MessageStatus,
  MessageSyncEventType,
  MessageSyncState,
} from './types';

// Constants
export {
  MESSAGE_CONSTANTS,
  MESSAGING_CONSTANTS,
} from './types';

// ============================================================================
// FEATURE METADATA
// ============================================================================

export const MESSAGING_FEATURE_METADATA = {
  name: 'Messaging',
  version: '1.0.0',
  description: 'Real-time messaging system with direct conversations, typing indicators, read receipts, and offline support',
  
  // Core capabilities
  capabilities: {
    messaging: {
      directMessaging: true,
      groupMessaging: false, // Future enhancement
      messageTypes: ['text', 'image', 'file', 'system', 'product_inquiry', 'order_update', 'payment_request'],
      attachments: true,
      messageSearch: true,
      messageDeletion: true,
      draftMessages: true,
      offlineMessaging: true,
    },
    
    conversations: {
      conversationListing: true,
      conversationSearch: true,
      conversationArchiving: true,
      unreadCounts: true,
      conversationFiltering: true,
      participantManagement: true,
    },
    
    realTimeSync: {
      messageSync: true,
      typingIndicators: true,
      readReceipts: true,
      onlineStatus: false, // Future enhancement
      connectionHealthMonitoring: true,
      offlineEventQueuing: true,
      automaticReconnection: true,
    },
    
    notifications: {
      pushNotifications: false, // Future enhancement
      emailNotifications: false, // Future enhancement
      soundNotifications: false, // Future enhancement
      customNotificationSettings: true,
    },
  },

  // Dependencies
  dependencies: {
    external: {
      supabase: '^2.0.0',
      '@react-native-async-storage/async-storage': '^1.19.0',
    },
    internal: {
      contexts: ['AuthContext'],
      shared: ['supabase client configuration'],
    },
  },

  // Integration points
  integrations: {
    authentication: {
      required: true,
      description: 'User authentication required for all messaging operations',
      dependencies: ['AuthContext'],
    },
    
    userProfiles: {
      required: true,
      description: 'User profile data for participant information and avatars',
      tables: ['pg_profiles'],
    },
    
    productInquiries: {
      optional: true,
      description: 'Integration with product listings for product-related messages',
      messageTypes: ['product_inquiry'],
    },
    
    orderUpdates: {
      optional: true,
      description: 'Integration with order management for order-related messages',
      messageTypes: ['order_update'],
    },
    
    paymentRequests: {
      optional: true,
      description: 'Integration with payment processing for payment-related messages',
      messageTypes: ['payment_request'],
    },
  },

  // Database schema requirements
  database: {
    tables: {
      pg_messages: {
        required: true,
        description: 'Core messages table with sender, receiver, content, and metadata',
        columns: [
          'id', 'sender_id', 'receiver_id', 'content', 'message_type',
          'created_at', 'updated_at', 'is_read', 'read_at', 'is_deleted',
          'deleted_at', 'reply_to_id', 'metadata'
        ],
      },
      
      pg_message_attachments: {
        required: false,
        description: 'Message attachments with file metadata',
        columns: [
          'id', 'message_id', 'file_name', 'file_url', 'file_type',
          'file_size', 'thumbnail_url', 'created_at'
        ],
      },
      
      pg_profiles: {
        required: true,
        description: 'User profiles for participant information',
        columns: ['id', 'full_name', 'avatar_url'],
      },
    },
    
    realTimeSubscriptions: {
      required: true,
      description: 'Supabase real-time subscriptions for message sync',
      channels: ['messages', 'user_messages'],
    },
  },

  // Configuration options
  configuration: {
    messageLength: {
      max: 4000,
      description: 'Maximum message content length in characters',
    },
    
    attachments: {
      maxSize: 10485760, // 10MB
      maxCount: 5,
      supportedTypes: ['image/*', 'application/pdf', 'text/*'],
    },
    
    pagination: {
      defaultPageSize: 50,
      maxPageSize: 100,
    },
    
    realTime: {
      typingTimeout: 3000,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
    },
    
    offline: {
      maxOfflineMessages: 1000,
      messageRetryAttempts: 3,
    },
  },

  // Performance characteristics
  performance: {
    messageLoading: {
      strategy: 'cursor-based pagination',
      caching: 'local AsyncStorage cache',
      prefetching: false,
    },
    
    realTimeSync: {
      connectionPooling: true,
      eventBatching: false,
      compressionEnabled: false,
    },
    
    search: {
      indexing: 'database full-text search',
      caching: false,
      debouncing: 300,
    },
    
    offlineSupport: {
      messageQueuing: true,
      localCaching: true,
      syncOnReconnect: true,
    },
  },

  // Security model
  security: {
    authentication: {
      required: true,
      method: 'Supabase Auth',
    },
    
    authorization: {
      messageAccess: 'sender/receiver only',
      conversationAccess: 'participants only',
      rowLevelSecurity: true,
    },
    
    dataProtection: {
      encryption: 'in-transit via HTTPS',
      messageRetention: 'indefinite (soft delete)',
      attachmentSecurity: 'signed URLs',
    },
    
    inputValidation: {
      contentSanitization: true,
      attachmentValidation: true,
      rateLimiting: false, // Future enhancement
    },
  },

  // Error handling strategy
  errorHandling: {
    networkErrors: {
      strategy: 'retry with exponential backoff',
      fallback: 'offline queue',
      userFeedback: 'error states in UI',
    },
    
    validationErrors: {
      strategy: 'immediate user feedback',
      prevention: 'client-side validation',
    },
    
    syncErrors: {
      strategy: 'automatic reconnection',
      fallback: 'manual reconnect option',
      monitoring: 'connection health tracking',
    },
    
    serviceErrors: {
      strategy: 'graceful degradation',
      fallback: 'cached data where available',
      logging: 'console logging for debugging',
    },
  },

  // Testing strategy
  testing: {
    unitTests: {
      services: 'Jest with mocked Supabase client',
      hooks: 'React Testing Library with custom providers',
      utilities: 'Jest for pure functions',
    },
    
    integrationTests: {
      realTimeSync: 'Supabase test environment',
      messageFlow: 'end-to-end conversation scenarios',
      offlineSupport: 'network simulation testing',
    },
    
    e2eTests: {
      messaging: 'complete message send/receive flows',
      conversations: 'conversation management workflows',
      sync: 'real-time synchronization scenarios',
    },
  },

  // Deployment considerations
  deployment: {
    environmentVariables: {
      SUPABASE_URL: 'required',
      SUPABASE_ANON_KEY: 'required',
    },
    
    databaseMigrations: {
      required: true,
      files: ['messages_table.sql', 'message_attachments_table.sql', 'rls_policies.sql'],
    },
    
    realTimeConfiguration: {
      supabaseRealTime: 'enabled',
      channelLimits: 'monitor concurrent connections',
    },
    
    monitoring: {
      messageVolume: 'track message send/receive rates',
      connectionHealth: 'monitor sync service health',
      errorRates: 'track failed operations',
    },
  },

  // Future roadmap
  roadmap: {
    v1_1: {
      features: ['group messaging', 'message reactions', 'message forwarding'],
      timeline: 'Q2 2024',
    },
    
    v1_2: {
      features: ['voice messages', 'video calls', 'screen sharing'],
      timeline: 'Q3 2024',
    },
    
    v2_0: {
      features: ['end-to-end encryption', 'message scheduling', 'chatbots'],
      timeline: 'Q4 2024',
    },
  },

  // Documentation and examples
  documentation: {
    quickStart: {
      description: 'Basic messaging setup and usage',
      example: `
        import { useMessagingManagement } from '@/features/messaging';
        
        function MessagingScreen() {
          const messaging = useMessagingManagement();
          
          const handleSendMessage = async (content: string) => {
            await messaging.sendMessageToActive(content);
          };
          
          return (
            <MessagingUI 
              messages={messaging.messages}
              onSendMessage={handleSendMessage}
              typing={messaging.conversationTyping}
            />
          );
        }
      `,
    },
    
    advancedUsage: {
      description: 'Real-time sync and conversation management',
      example: `
        import { useMessageSync, MessageSyncEventType } from '@/features/messaging';
        
        function useConversationSync(conversationId: string) {
          const sync = useMessageSync();
          
          useEffect(() => {
            const handleEvent = (event) => {
              if (event.type === MessageSyncEventType.MESSAGE_RECEIVED) {
                // Handle new message
              }
            };
            
            sync.subscribeToConversation(conversationId, handleEvent);
            return () => sync.unsubscribeFromConversation(conversationId);
          }, [conversationId]);
        }
      `,
    },
    
    serviceUsage: {
      description: 'Direct service usage for custom implementations',
      example: `
        import { MessageService } from '@/features/messaging';
        
        const messageService = new MessageService();
        
        const sendMessage = async (receiverId: string, content: string) => {
          const result = await messageService.sendMessage({
            receiver_id: receiverId,
            content,
            message_type: MessageType.TEXT,
          }, currentUserId);
          
          return result;
        };
      `,
    },
  },
} as const;

// ============================================================================
// FEATURE EXPORTS SUMMARY
// ============================================================================

/**
 * Messaging Feature - Complete real-time messaging system
 * 
 * This feature provides:
 * - Direct messaging between users
 * - Real-time message synchronization
 * - Typing indicators and read receipts
 * - Conversation management and search
 * - Offline support with message queuing
 * - File attachments and message types
 * - Draft message persistence
 * 
 * Key Components:
 * - MessageService: Core messaging operations
 * - ConversationService: Conversation management
 * - MessageSyncService: Real-time synchronization
 * - useMessaging: Basic messaging hook
 * - useMessageSync: Real-time sync hook
 * - useMessagingManagement: Comprehensive messaging management
 * 
 * Usage:
 * ```typescript
 * import { useMessagingManagement } from '@/features/messaging';
 * 
 * const messaging = useMessagingManagement();
 * await messaging.openConversation(userId);
 * await messaging.sendMessageToActive('Hello!');
 * ```
 */
