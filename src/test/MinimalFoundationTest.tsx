import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ThemeProvider } from '../providers/ThemeProvider';
import { EventProvider } from '../events/EventProvider';
import { Button, Card } from '../components/shared';
import { useTheme } from '../providers/ThemeProvider';

/**
 * Minimal Foundation Test Component
 * 
 * Tests only essential components without external dependencies.
 * Includes its own minimal provider setup inline to avoid creating
 * non-production provider files.
 */
const MinimalFoundationTestContent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
      <Text style={{ 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 20,
        color: theme.colors.text 
      }}>
        Minimal Foundation Test
      </Text>

      <Card variant="elevated" style={{ marginBottom: 16 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: '600', 
          marginBottom: 8,
          color: theme.colors.text 
        }}>
          Basic Components Test
        </Text>
        <Text style={{ 
          marginBottom: 16,
          color: theme.colors.textSecondary 
        }}>
          Testing Button and Card components with theme integration
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Button
            title="Primary"
            onPress={() => console.log('Primary pressed')}
            variant="primary"
            size="sm"
          />
          <Button
            title="Secondary"
            onPress={() => console.log('Secondary pressed')}
            variant="secondary"
            size="sm"
          />
        </View>
      </Card>

      <Card variant="outlined" style={{ marginBottom: 16 }}>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: '600', 
          marginBottom: 8,
          color: theme.colors.text 
        }}>
          Theme System Test
        </Text>
        <Text style={{ 
          marginBottom: 16,
          color: theme.colors.textSecondary 
        }}>
          Theme colors and spacing are working correctly
        </Text>
        
        <View style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.primary,
          borderRadius: theme.borderRadius.md,
          marginBottom: 8
        }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>
            Primary Color
          </Text>
        </View>
        
        <View style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.secondary,
          borderRadius: theme.borderRadius.md,
        }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>
            Secondary Color
          </Text>
        </View>
      </Card>

      <Text style={{ 
        textAlign: 'center', 
        marginTop: 20, 
        color: theme.colors.textSecondary 
      }}>
        Minimal Foundation Test Complete
      </Text>
    </ScrollView>
  );
};

/**
 * Minimal Foundation Test with inline providers
 * 
 * Self-contained test component that includes only the essential
 * providers needed for basic functionality testing.
 */
export const MinimalFoundationTest: React.FC = () => {
  return (
    <ThemeProvider>
      <EventProvider>
        <MinimalFoundationTestContent />
      </EventProvider>
    </ThemeProvider>
  );
};

export default MinimalFoundationTest;
