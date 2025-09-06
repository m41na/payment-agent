import React, { useState, useEffect, useRef } from 'react';
import { FlatList, View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, Button, LoadingSpinner } from '../../../components/shared';
import { useEventListener, useEventEmitter, EVENT_TYPES } from '../../../events';
import { useMessagingContext } from '../../../providers/MessagingProvider';
import { useAuthContext } from '../../../contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'transaction';
  metadata?: any;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  type: 'direct' | 'merchant' | 'support';
}

/**
 * Integrated Messaging Hub Component
 * 
 * Provides real-time messaging with cross-feature integration:
 * - Event System: Real-time message notifications and updates
 * - Payment Processing: Transaction-related messaging
 * - Merchant Onboarding: Merchant-customer communication
 * - User Profile: Contact management and preferences
 */
export const IntegratedMessagingHub: React.FC = () => {
  const { user } = useAuthContext();
  const { 
    conversations, 
    messages, 
    sendMessage, 
    markAsRead,
    isLoading 
  } = useMessagingContext();
  const emitEvent = useEventEmitter();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Listen for new messages
  useEventListener(EVENT_TYPES.MESSAGE_RECEIVED, (messageData) => {
    console.log('New message received:', messageData);
    // Auto-scroll to bottom if viewing the conversation
    if (messageData.conversationId === selectedConversation) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  });

  // Listen for payment success to send transaction messages
  useEventListener(EVENT_TYPES.PAYMENT_SUCCESS, async (paymentData) => {
    console.log('Payment successful, sending transaction message:', paymentData);
    
    // Send transaction confirmation message to merchant
    const merchantConversation = conversations.find(c => 
      c.participants.includes(paymentData.merchantId) && c.type === 'merchant'
    );

    if (merchantConversation) {
      await sendTransactionMessage(merchantConversation.id, {
        type: 'payment_success',
        transactionId: paymentData.transactionId,
        amount: paymentData.amount,
        currency: paymentData.currency,
      });
    }
  });

  // Listen for merchant onboarding to create welcome conversation
  useEventListener(EVENT_TYPES.MERCHANT_ONBOARDED, async (merchantData) => {
    console.log('Merchant onboarded, creating welcome conversation:', merchantData);
    
    // Create welcome conversation with new merchant
    await createWelcomeConversation(merchantData.merchantId, merchantData.businessName);
  });

  // Listen for referral rewards to send congratulations
  useEventListener(EVENT_TYPES.REFERRAL_REWARD_EARNED, async (referralData) => {
    console.log('Referral reward earned, sending congratulations:', referralData);
    
    // Send system message about referral reward
    await sendSystemMessage('referral_reward', {
      rewardAmount: referralData.rewardAmount,
      rewardType: referralData.rewardType,
    });
  });

  const currentMessages = selectedConversation 
    ? messages[selectedConversation] || []
    : [];

  const selectedConversationData = conversations.find(c => c.id === selectedConversation);

  const sendTransactionMessage = async (conversationId: string, transactionData: any) => {
    const message = {
      content: `Payment of $${transactionData.amount} has been processed successfully. Transaction ID: ${transactionData.transactionId}`,
      type: 'transaction' as const,
      metadata: transactionData,
    };

    await sendMessage(conversationId, message);
    
    await emitEvent(EVENT_TYPES.MESSAGE_SENT, {
      messageId: `msg_${Date.now()}`,
      senderId: user?.id || '',
      recipientId: conversationId,
      conversationId,
      messageType: 'text',
      timestamp: new Date(),
    });
  };

  const createWelcomeConversation = async (merchantId: string, businessName: string) => {
    // This would typically create a new conversation in the backend
    const welcomeMessage = `Welcome to our marketplace, ${businessName}! We're excited to have you on board. Feel free to reach out if you have any questions.`;
    
    // For demo purposes, we'll just log this
    console.log(`Creating welcome conversation with ${businessName}: ${welcomeMessage}`);
  };

  const sendSystemMessage = async (type: string, data: any) => {
    let content = '';
    
    switch (type) {
      case 'referral_reward':
        content = `🎉 Congratulations! You've earned a ${data.rewardType} reward of $${data.rewardAmount}!`;
        break;
      default:
        content = 'System notification';
    }

    // This would send a system message to the user
    console.log(`System message: ${content}`);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await sendMessage(selectedConversation, {
        content: messageText.trim(),
        type: 'text',
      });

      await emitEvent(EVENT_TYPES.MESSAGE_SENT, {
        messageId: `msg_${Date.now()}`,
        senderId: user?.id || '',
        recipientId: selectedConversationData?.participants.find(p => p !== user?.id) || '',
        conversationId: selectedConversation,
        messageType: 'text',
        timestamp: new Date(),
      });

      setMessageText('');
      
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    
    // Mark conversation as read
    await markAsRead(conversationId);
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isOwnMessage = message.senderId === user?.id;
    const isSystemMessage = message.type === 'system';
    const isTransactionMessage = message.type === 'transaction';

    return (
      <View style={{
        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        marginBottom: 12,
        paddingHorizontal: 16,
      }}>
        <View style={{
          maxWidth: '80%',
          backgroundColor: isSystemMessage 
            ? '#f0f0f0' 
            : isTransactionMessage 
              ? '#e3f2fd'
              : isOwnMessage 
                ? '#007AFF' 
                : '#e5e5ea',
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}>
          {!isOwnMessage && !isSystemMessage && (
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#666',
              marginBottom: 4,
            }}>
              {message.senderName}
            </Text>
          )}
          
          <Text style={{
            fontSize: 16,
            color: isOwnMessage && !isSystemMessage ? 'white' : '#000',
          }}>
            {message.content}
          </Text>
          
          {isTransactionMessage && (
            <Text style={{
              fontSize: 12,
              color: '#666',
              marginTop: 4,
              fontStyle: 'italic',
            }}>
              Transaction Message
            </Text>
          )}
          
          <Text style={{
            fontSize: 11,
            color: isOwnMessage && !isSystemMessage ? 'rgba(255,255,255,0.7)' : '#666',
            marginTop: 4,
            textAlign: 'right',
          }}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderConversation = ({ item: conversation }: { item: Conversation }) => (
    <Card
      variant={selectedConversation === conversation.id ? "elevated" : "default"}
      style={{ marginBottom: 8 }}
      onPress={() => handleConversationSelect(conversation.id)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              {conversation.type === 'merchant' ? '🏪' : conversation.type === 'support' ? '🛠️' : '💬'} 
              {' '}Conversation {conversation.id.slice(-4)}
            </Text>
            {conversation.type === 'merchant' && (
              <View style={{
                backgroundColor: '#4CAF50',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                marginLeft: 8,
              }}>
                <Text style={{ fontSize: 10, color: 'white', fontWeight: '500' }}>
                  Merchant
                </Text>
              </View>
            )}
          </View>
          
          {conversation.lastMessage && (
            <Text style={{ fontSize: 14, color: '#666' }} numberOfLines={1}>
              {conversation.lastMessage.content}
            </Text>
          )}
        </View>
        
        {conversation.unreadCount > 0 && (
          <View style={{
            backgroundColor: '#FF3B30',
            borderRadius: 12,
            minWidth: 24,
            height: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <LoadingSpinner 
        message="Loading conversations..." 
        style={{ flex: 1 }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {!selectedConversation ? (
        // Conversation List View
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
            Messages
          </Text>
          
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                  No conversations yet.{'\n'}
                  Start shopping to connect with merchants!
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        // Chat View
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Chat Header */}
          <View style={{
            backgroundColor: 'white',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <Button
              title="← Back"
              onPress={() => setSelectedConversation(null)}
              variant="ghost"
              size="small"
            />
            <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 16 }}>
              {selectedConversationData?.type === 'merchant' ? 'Merchant Chat' : 'Conversation'}
            </Text>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={{ flex: 1, backgroundColor: 'white' }}
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                  Start the conversation!
                </Text>
              </View>
            }
          />

          {/* Message Input */}
          <View style={{
            backgroundColor: 'white',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            flexDirection: 'row',
            alignItems: 'flex-end',
          }}>
            <TextInput
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                maxHeight: 100,
                marginRight: 8,
              }}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              multiline
              textAlignVertical="top"
            />
            
            <Button
              title="Send"
              onPress={handleSendMessage}
              variant="primary"
              size="small"
              disabled={!messageText.trim() || sending}
              loading={sending}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

export default IntegratedMessagingHub;
