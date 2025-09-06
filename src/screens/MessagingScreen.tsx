import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Avatar,
  Divider,
  Surface,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const MessagingScreen = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pg_messages')
        .select(`
          *,
          sender:pg_profiles!sender_id(full_name),
          receiver:pg_profiles!receiver_id(full_name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const conversationMap = new Map();
      
      (data || []).forEach((message) => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        const otherUserName = message.sender_id === user.id ? message.receiver?.full_name : message.sender?.full_name;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            participant_id: otherUserId,
            participant_name: otherUserName || 'Unknown User',
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0,
          });
        }
        
        // Count unread messages
        if (message.receiver_id === user.id && !message.is_read) {
          const conv = conversationMap.get(otherUserId);
          conv.unread_count += 1;
        }
      });
      
      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (participantId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('pg_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark messages as read
      await supabase
        .from('pg_messages')
        .update({ is_read: true })
        .eq('sender_id', participantId)
        .eq('receiver_id', user.id);
        
    } catch (error) {
      Alert.alert('Error', 'Failed to load messages');
    }
  }, [user]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    
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
      loadMessages(selectedConversation);
      loadConversations();
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  // Set up real-time subscription for messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('💬 New message:', payload);
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation, loadConversations, loadMessages]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Card 
      style={[
        styles.conversationCard,
        selectedConversation === item.participant_id && styles.selectedConversation
      ]}
      onPress={() => {
        setSelectedConversation(item.participant_id);
        loadMessages(item.participant_id);
      }}
    >
      <Card.Content style={styles.conversationContent}>
        <Avatar.Text size={40} label={item.participant_name.charAt(0)} />
        <View style={styles.conversationInfo}>
          <Text style={styles.participantName}>{item.participant_name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          <Text style={styles.messageTime}>
            {new Date(item.last_message_time).toLocaleDateString()}
          </Text>
          {item.unread_count > 0 && (
            <Surface style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </Surface>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <Surface style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
        </Surface>
      </View>
    );
  };

  if (!selectedConversation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Messages</Title>
        </View>
        
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
        />
        
        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start a conversation by contacting a seller or buyer
            </Text>
          </View>
        )}
      </View>
    );
  }

  const selectedConv = conversations.find(c => c.participant_id === selectedConversation);

  return (
    <View style={styles.container}>
      <View style={styles.chatHeader}>
        <IconButton 
          icon="arrow-left" 
          onPress={() => setSelectedConversation(null)}
        />
        <Avatar.Text size={32} label={selectedConv?.participant_name.charAt(0) || 'U'} />
        <Text style={styles.chatTitle}>{selectedConv?.participant_name || 'Unknown'}</Text>
      </View>
      
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.messageInput}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          style={styles.textInput}
          mode="outlined"
          multiline
          right={
            <TextInput.Icon 
              icon="send" 
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  conversationsList: {
    flex: 1,
    padding: 16,
  },
  conversationCard: {
    marginBottom: 8,
    elevation: 1,
  },
  selectedConversation: {
    backgroundColor: '#e3f2fd',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#6200ea',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    color: '#1a1a1a',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
  },
  myMessageBubble: {
    backgroundColor: '#6200ea',
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#1a1a1a',
  },
  messageInput: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    maxHeight: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default MessagingScreen;
