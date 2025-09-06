import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useInventory, CreateProductData } from '../contexts/InventoryContext';
import { useLocation } from '../contexts/LocationContext';
import { usePreferences } from '../contexts/PreferencesContext';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ visible, onClose }) => {
  const { createProduct } = useInventory();
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateProductData>({
    title: '',
    description: '',
    price: 0,
    category: '',
    condition: 'good',
    latitude: preferences?.storefront_location?.latitude || location?.latitude || 0,
    longitude: preferences?.storefront_location?.longitude || location?.longitude || 0,
    location_name: '',
    address: '',
    tags: [],
  });

  const [priceText, setPriceText] = useState('');
  const [tagsText, setTagsText] = useState('');

  const categories = [
    'Electronics',
    'Clothing & Accessories',
    'Home & Garden',
    'Sports & Recreation',
    'Books & Media',
    'Toys & Games',
    'Automotive',
    'Health & Beauty',
    'Collectibles',
    'Art & Crafts',
    'Other',
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a product title');
      return;
    }

    if (formData.price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    // Use storefront location if available, otherwise require current location
    const hasStorefrontLocation = preferences?.storefront_location?.latitude && preferences?.storefront_location?.longitude;
    if (!hasStorefrontLocation && !location) {
      Alert.alert('Error', 'Location is required. Please enable location services or set a storefront location in business preferences.');
      return;
    }

    setLoading(true);
    try {
      const productData: CreateProductData = {
        ...formData,
        price: formData.price,
        latitude: formData.latitude,
        longitude: formData.longitude,
        tags: tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      };

      await createProduct(productData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: 0,
        category: '',
        condition: 'good',
        latitude: preferences?.storefront_location?.latitude || location?.latitude || 0,
        longitude: preferences?.storefront_location?.longitude || location?.longitude || 0,
        location_name: '',
        address: '',
        tags: [],
      });
      setPriceText('');
      setTagsText('');
      
      onClose();
      Alert.alert('Success', 'Product added successfully!');
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (text: string) => {
    setPriceText(text);
    const price = parseFloat(text) || 0;
    setFormData(prev => ({ ...prev, price }));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Product</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>Product Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter product title"
              maxLength={255}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Describe your product..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Price (USD) *</Text>
            <TextInput
              style={styles.input}
              value={priceText}
              onChangeText={handlePriceChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Select a category" value="" />
                {categories.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Condition *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.condition}
                onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as any }))}
                style={styles.picker}
              >
                {conditions.map((condition) => (
                  <Picker.Item key={condition.value} label={condition.label} value={condition.value} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Location Name</Text>
            <TextInput
              style={styles.input}
              value={formData.location_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location_name: text }))}
              placeholder="e.g., Downtown Store, My Garage"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Street address (optional)"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.input}
              value={tagsText}
              onChangeText={setTagsText}
              placeholder="vintage, handmade, collectible (comma separated)"
            />
            <Text style={styles.helpText}>Separate tags with commas</Text>
          </View>

          {(location || (preferences?.storefront_location?.latitude && preferences?.storefront_location?.longitude)) && (
            <View style={styles.section}>
              <Text style={styles.label}>Product Location</Text>
              {preferences?.storefront_location?.latitude && preferences?.storefront_location?.longitude ? (
                <View>
                  <Text style={styles.locationText}>
                    Storefront: {preferences.storefront_location.latitude.toFixed(6)}, {preferences.storefront_location.longitude.toFixed(6)}
                  </Text>
                  {location && (
                    <Text style={styles.helpText}>
                      Current: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                  )}
                </View>
              ) : location ? (
                <Text style={styles.locationText}>
                  Current: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default AddProductModal;
