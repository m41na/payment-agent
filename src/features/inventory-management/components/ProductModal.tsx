import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Title,
  Button,
  IconButton,
  Chip,
  HelperText,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';

interface ProductModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (productData: any) => void;
  initialData?: any;
  location?: any;
}

const ProductModal: React.FC<ProductModalProps> = ({
  visible,
  onDismiss,
  onSubmit,
  initialData,
  location,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    category: initialData?.category || 'electronics',
    condition: initialData?.condition || 'new',
    quantity: initialData?.quantity?.toString() || '1',
    tags: initialData?.tags || [],
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');

  const categories = [
    'electronics',
    'clothing',
    'home_garden',
    'sports_outdoors',
    'books_media',
    'toys_games',
    'automotive',
    'health_beauty',
    'collectibles',
    'other',
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.quantity || isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity),
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || 'Current Location',
      } : null,
    };

    onSubmit(productData);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove),
    }));
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Title style={styles.title}>
                {initialData ? 'Edit Product' : 'Add Product'}
              </Title>
              <IconButton
                icon="close"
                size={24}
                onPress={onDismiss}
              />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="Enter product title"
                />
                {errors.title && <HelperText type="error">{errors.title}</HelperText>}
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Describe your product"
                  multiline
                  numberOfLines={4}
                />
                {errors.description && <HelperText type="error">{errors.description}</HelperText>}
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price ($) *</Text>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
                {errors.price && <HelperText type="error">{errors.price}</HelperText>}
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    style={styles.picker}
                  >
                    {categories.map((category) => (
                      <Picker.Item
                        key={category}
                        label={category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        value={category}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Condition */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condition</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.condition}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
                    style={styles.picker}
                  >
                    {conditions.map((condition) => (
                      <Picker.Item
                        key={condition.value}
                        label={condition.label}
                        value={condition.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Quantity */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                  style={[styles.input, errors.quantity && styles.inputError]}
                  value={formData.quantity}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                  placeholder="1"
                  keyboardType="numeric"
                />
                {errors.quantity && <HelperText type="error">{errors.quantity}</HelperText>}
              </View>

              {/* Tags */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tags</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Add a tag"
                    onSubmitEditing={addTag}
                  />
                  <Button mode="outlined" onPress={addTag} compact>
                    Add
                  </Button>
                </View>
                <View style={styles.tagsContainer}>
                  {formData.tags.map((tag: string, index: number) => (
                    <Chip
                      key={index}
                      mode="flat"
                      onClose={() => removeTag(tag)}
                      style={styles.tag}
                    >
                      {tag}
                    </Chip>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
              >
                {initialData ? 'Update' : 'Create'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
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
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#f44336',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e3f2fd',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2196F3',
  },
});

export default ProductModal;
