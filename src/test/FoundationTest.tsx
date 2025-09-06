import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { AppProviders } from '../providers/AppProviders';
import { Button, Input, Card, LoadingSpinner, Modal } from '../components/shared';
import { useEventBus, EVENT_TYPES } from '../events';

/**
 * Foundation Layer Test Component
 * 
 * Quick test to verify all foundation components work together:
 * - Provider hierarchy loads correctly
 * - Event system functions
 * - Shared components render properly
 * - Theme integration works
 */
const FoundationTestContent: React.FC = () => {
  const { emit } = useEventBus();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const testEventSystem = async () => {
    console.log('Testing event system...');
    await emit(EVENT_TYPES.USER_LOGIN, {
      userId: 'test-user',
      email: 'test@example.com',
      timestamp: new Date(),
    });
  };

  const testLoadingState = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Foundation Layer Test
      </Text>

      {/* Test Cards */}
      <Card variant="elevated" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Shared Components Test
        </Text>
        <Text style={{ marginBottom: 16 }}>
          Testing Button, Input, Card, and Modal components
        </Text>
        
        <Input
          label="Test Input"
          placeholder="Enter test text..."
          style={{ marginBottom: 16 }}
        />
        
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Button
            title="Primary"
            onPress={() => console.log('Primary pressed')}
            variant="primary"
            size="small"
          />
          <Button
            title="Secondary"
            onPress={() => console.log('Secondary pressed')}
            variant="secondary"
            size="small"
          />
          <Button
            title="Outline"
            onPress={() => console.log('Outline pressed')}
            variant="outline"
            size="small"
          />
        </View>
      </Card>

      {/* Test Event System */}
      <Card variant="outlined" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Event System Test
        </Text>
        <Text style={{ marginBottom: 16 }}>
          Testing cross-feature event communication
        </Text>
        
        <Button
          title="Test Event Emission"
          onPress={testEventSystem}
          variant="primary"
          fullWidth
        />
      </Card>

      {/* Test Loading States */}
      <Card variant="filled" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Loading States Test
        </Text>
        <Text style={{ marginBottom: 16 }}>
          Testing loading spinner and states
        </Text>
        
        <Button
          title="Test Loading"
          onPress={testLoadingState}
          variant="secondary"
          loading={loading}
          fullWidth
        />
        
        {loading && (
          <LoadingSpinner
            message="Testing loading state..."
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Test Modal */}
      <Card variant="default" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Modal Test
        </Text>
        <Text style={{ marginBottom: 16 }}>
          Testing modal component functionality
        </Text>
        
        <Button
          title="Open Modal"
          onPress={() => setModalVisible(true)}
          variant="outline"
          fullWidth
        />
      </Card>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Test Modal"
        actions={[
          {
            title: 'Cancel',
            onPress: () => setModalVisible(false),
            variant: 'outline',
          },
          {
            title: 'Confirm',
            onPress: () => {
              console.log('Modal confirmed');
              setModalVisible(false);
            },
            variant: 'primary',
          },
        ]}
      >
        <Text>This is a test modal to verify the foundation layer is working correctly.</Text>
      </Modal>

      <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
        ✅ Foundation Layer Test Complete
      </Text>
    </ScrollView>
  );
};

export const FoundationTest: React.FC = () => {
  return (
    <AppProviders>
      <FoundationTestContent />
    </AppProviders>
  );
};

export default FoundationTest;
