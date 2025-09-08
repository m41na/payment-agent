import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../shared/auth/AuthContext';
import { supabase } from '../../../services/supabase';
import MessagingScreen from '../components/MessagingScreen';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  receiver_name?: string;
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online?: boolean;
}

export interface MessagingProps {
  // View state
  selectedConversation: string | null;
  newMessage: string;
  loading: boolean;
  sendingMessage: boolean;
  
  // Data
  conversations: Conversation[];
  messages: Message[];
  totalUnreadCount: number;
  
  // Actions
  onSelectConversation: (participantId: string) => void;
  onBackToConversations: () => void;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onRefreshConversations: () => void;
  onRefreshMessages: () => void;
  onStartNewConversation: (participantId: string, participantName: string) => void;
  onDeleteConversation: (participantId: string) => void;
  onMarkAsRead: (participantId: string) => void;
}

const MessagingContainer: React.FC = () => {
  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Auth context
  const { user } = useAuth();
  
  // Business logic: Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pg_messages')
        .select(`
          *,
          sender:pg_profiles!sender_id(full_name, avatar_url),
          receiver:pg_profiles!receiver_id(full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();
      
      (data || []).forEach((message) => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            participant_id: otherUserId,
            participant_name: otherUser?.full_name || 'Unknown User',
            participant_avatar: otherUser?.avatar_url,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0,
            is_online: false, // Would integrate with presence system
          });
        }
        
        // Count unread messages
        if (message.receiver_id === user.id && !message.is_read) {
          const conv = conversationMap.get(otherUserId);
          if (conv) {
            conv.unread_count += 1;
          }
        }
      });
      
      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Business logic: Load messages for selected conversation
  const loadMessages = useCallback(async (participantId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pg_messages')
        .select(`
          *,
          sender:pg_profiles!sender_id(full_name),
          receiver:pg_profiles!receiver_id(full_name)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        created_at: msg.created_at,
        is_read: msg.is_read,
        sender_name: msg.sender?.full_name,
        receiver_name: msg.receiver?.full_name,
      }));
      
      setMessages(formattedMessages);
      
      // Mark messages as read
      await supabase
        .from('pg_messages')
        .update({ is_read: true })
        .eq('sender_id', participantId)
        .eq('receiver_id', user.id);
        
      // Refresh conversations to update unread count
      loadConversations();
        
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  }, [user, loadConversations]);

  // Business logic: Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('pg_messages')
        .insert([{
          sender_id: user.id,
          receiver_id: selectedConversation,
          content: newMessage.trim(),
          is_read: false,
        }]);

      if (error) throw error;
      
      setNewMessage('');
      await loadMessages(selectedConversation);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedConversation, user, loadMessages]);

  // Business logic: Start new conversation
  const startNewConversation = useCallback((participantId: string, participantName: string) => {
    // Check if conversation already exists
    const existingConv = conversations.find(conv => conv.participant_id === participantId);
    if (existingConv) {
      setSelectedConversation(participantId);
      loadMessages(participantId);
      return;
    }
    
    // Create new conversation entry
    const newConv: Conversation = {
      id: participantId,
      participant_id: participantId,
      participant_name: participantName,
      last_message: '',
      last_message_time: new Date().toISOString(),
      unread_count: 0,
    };
    
    setConversations(prev => [newConv, ...prev]);
    setSelectedConversation(participantId);
    setMessages([]);
  }, [conversations, loadMessages]);

  // Business logic: Delete conversation
  const deleteConversation = useCallback(async (participantId: string) => {
    if (!user) return;
    
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all messages in conversation
              const { error } = await supabase
                .from('pg_messages')
                .delete()
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`);
              
              if (error) throw error;
              
              // Remove from local state
              setConversations(prev => prev.filter(conv => conv.participant_id !== participantId));
              
              // Clear selection if this conversation was selected
              if (selectedConversation === participantId) {
                setSelectedConversation(null);
                setMessages([]);
              }
              
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  }, [user, selectedConversation]);

  // Business logic: Mark conversation as read
  const markAsRead = useCallback(async (participantId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('pg_messages')
        .update({ is_read: true })
        .eq('sender_id', participantId)
        .eq('receiver_id', user.id);
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.participant_id === participantId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
      
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  // Business logic: Calculate total unread count
  const totalUnreadCount = React.useMemo(() => {
    return conversations.reduce((total, conv) => total + conv.unread_count, 0);
  }, [conversations]);

  // Business logic: Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pg_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Refresh conversations and messages when new message arrives
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [user, selectedConversation, loadConversations, loadMessages]);

  // Event handlers
  const handleSelectConversation = (participantId: string) => {
    setSelectedConversation(participantId);
    loadMessages(participantId);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleNewMessageChange = (message: string) => {
    setNewMessage(message);
  };

  const handleRefreshConversations = () => {
    loadConversations();
  };

  const handleRefreshMessages = () => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  };

  // Effects
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Props for dumb component
  const messagingProps: MessagingProps = {
    // View state
    selectedConversation,
    newMessage,
    loading,
    sendingMessage,
    
    // Data
    conversations,
    messages,
    totalUnreadCount,
    
    // Actions
    onSelectConversation: handleSelectConversation,
    onBackToConversations: handleBackToConversations,
    onNewMessageChange: handleNewMessageChange,
    onSendMessage: sendMessage,
    onRefreshConversations: handleRefreshConversations,
    onRefreshMessages: handleRefreshMessages,
    onStartNewConversation: startNewConversation,
    onDeleteConversation: deleteConversation,
    onMarkAsRead: markAsRead,
  };

  return <MessagingScreen {...messagingProps} />;
};

export default MessagingContainer;
