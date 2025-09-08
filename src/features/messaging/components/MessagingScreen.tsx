import React from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { 
  Text, 
  Card, 
  TextInput, 
  IconButton, 
  Avatar, 
  Divider,
  ActivityIndicator,
  Badge,
  Surface,
  Chip
} from 'react-native-paper';
import { MessagingProps, Message, Conversation } from '../containers/MessagingContainer';

const MessagingScreen: React.FC<MessagingProps> = ({
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
  onSelectConversation,
  onBackToConversations,
  onNewMessageChange,
  onSendMessage,
  onRefreshConversations,
  onRefreshMessages,
  onStartNewConversation,
  onDeleteConversation,
  onMarkAsRead,
}) => {

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <Card 
      style={styles.conversationCard} 
      onPress={() => onSelectConversation(item.participant_id)}
      onLongPress={() => onDeleteConversation(item.participant_id)}
    >
      <Card.Content style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Avatar.Text 
            size={48} 
            label={item.participant_name.charAt(0).toUpperCase()}
            style={styles.avatar}
          />
          {item.is_online && <View style={styles.onlineIndicator} />}
          
          <View style={styles.conversationInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.participantName}>
                {item.participant_name}
              </Text>
              <Text variant="bodySmall" style={styles.messageTime}>
                {formatMessageTime(item.last_message_time)}
              </Text>
            </View>
            
            <View style={styles.messageRow}>
              <Text 
                variant="bodyMedium" 
                style={[
                  styles.lastMessage,
                  item.unread_count > 0 && styles.unreadMessage
                ]}
                numberOfLines={1}
              >
                {item.last_message || 'No messages yet'}
              </Text>
              {item.unread_count > 0 && (
                <Badge style={styles.unreadBadge}>
                  {item.unread_count}
                </Badge>
              )}
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === selectedConversation;
    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== item.sender_id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwnMessage && showAvatar && (
          <Avatar.Text 
            size={32} 
            label={(item.sender_name || 'U').charAt(0).toUpperCase()}
            style={styles.messageAvatar}
          />
        )}
        
        <Surface style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          !isOwnMessage && !showAvatar && styles.messageBubbleWithoutAvatar
        ]}>
          <Text variant="bodyMedium" style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text variant="bodySmall" style={[
              styles.messageTimestamp,
              isOwnMessage ? styles.ownMessageTimestamp : styles.otherMessageTimestamp
            ]}>
              {formatMessageTime(item.created_at)}
            </Text>
            
            {isOwnMessage && (
              <Text variant="bodySmall" style={styles.readStatus}>
                {item.is_read ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </Surface>
      </View>
    );
  };

  const ConversationsList = () => (
    <View style={styles.conversationsContainer}>
      <View style={styles.conversationsHeader}>
        <Text variant="headlineSmall" style={styles.conversationsTitle}>
          Messages
        </Text>
        {totalUnreadCount > 0 && (
          <Chip mode="flat" style={styles.totalUnreadChip}>
            {totalUnreadCount} unread
          </Chip>
        )}
        <IconButton
          icon="refresh"
          onPress={onRefreshConversations}
          disabled={loading}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading conversations...
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <Card style={styles.emptyState}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.emptyStateText}>
              💬 No conversations yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
              Start chatting with merchants and other users
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefreshConversations}
        />
      )}
    </View>
  );

  const ChatInterface = () => {
    const currentConversation = conversations.find(
      conv => conv.participant_id === selectedConversation
    );

    return (
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Header */}
        <Surface style={styles.chatHeader} elevation={2}>
          <IconButton
            icon="arrow-left"
            onPress={onBackToConversations}
          />
          <Avatar.Text 
            size={40} 
            label={(currentConversation?.participant_name || 'U').charAt(0).toUpperCase()}
          />
          <View style={styles.chatHeaderInfo}>
            <Text variant="titleMedium" style={styles.chatHeaderName}>
              {currentConversation?.participant_name || 'Unknown User'}
            </Text>
            {currentConversation?.is_online && (
              <Text variant="bodySmall" style={styles.onlineStatus}>
                Online
              </Text>
            )}
          </View>
          <IconButton
            icon="dots-vertical"
            onPress={() => currentConversation && onMarkAsRead(currentConversation.participant_id)}
          />
        </Surface>

        {/* Messages List */}
        <FlatList
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefreshMessages}
          inverted={false}
          style={styles.messagesContainer}
        />

        {/* Message Input */}
        <Surface style={styles.messageInputContainer} elevation={4}>
          <TextInput
            mode="outlined"
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={onNewMessageChange}
            multiline
            maxLength={1000}
            style={styles.messageInput}
            contentStyle={styles.messageInputContent}
            onSubmitEditing={onSendMessage}
            blurOnSubmit={false}
          />
          <IconButton
            icon="send"
            mode="contained"
            onPress={onSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            loading={sendingMessage}
            style={styles.sendButton}
          />
        </Surface>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.container}>
      {selectedConversation ? <ChatInterface /> : <ConversationsList />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  conversationsContainer: {
    flex: 1,
  },
  conversationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  conversationsTitle: {
    fontWeight: '600',
  },
  totalUnreadChip: {
    backgroundColor: '#e3f2fd',
  },
  conversationsList: {
    padding: 8,
  },
  conversationCard: {
    marginHorizontal: 8,
    marginVertical: 4,
    elevation: 1,
  },
  conversationContent: {
    paddingVertical: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4caf50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontWeight: '600',
  },
  messageTime: {
    color: '#666',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#6200ee',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyState: {
    margin: 16,
    marginTop: 60,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  emptyStateSubtext: {
    textAlign: 'center',
    color: '#999',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 8,
  },
  chatHeaderName: {
    fontWeight: '600',
  },
  onlineStatus: {
    color: '#4caf50',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 1,
  },
  ownMessageBubble: {
    backgroundColor: '#6200ee',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageBubbleWithoutAvatar: {
    marginLeft: 40,
  },
  messageText: {
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTimestamp: {
    fontSize: 11,
  },
  ownMessageTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTimestamp: {
    color: '#666',
  },
  readStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  messageInput: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  messageInputContent: {
    paddingHorizontal: 12,
  },
  sendButton: {
    backgroundColor: '#6200ee',
  },
});

export default MessagingScreen;
