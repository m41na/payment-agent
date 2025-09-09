import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
} from 'react-native';
import { Portal, Modal, Card, TextInput, Button, HelperText, Chip, Surface, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import PrimaryButton from '../../shared/PrimaryButton';
import { appTheme } from '../../theme';

interface ProductModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (productData: any) => void;
  initialData?: any;
  location?: any;
}

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

const ProductModal: React.FC<ProductModalProps> = ({ visible, onDismiss, onSubmit, initialData, location }) => {
  const [formData, setFormData] = useState(() => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    category: initialData?.category || categories[0],
    condition: initialData?.condition || 'new',
    quantity: initialData?.quantity?.toString() || '1',
    tags: initialData?.tags || [],
    ...initialData,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setFormData({
      title: initialData?.title || '',
      description: initialData?.description || '',
      price: initialData?.price?.toString() || '',
      category: initialData?.category || categories[0],
      condition: initialData?.condition || 'new',
      quantity: initialData?.quantity?.toString() || '1',
      tags: initialData?.tags || [],
      ...initialData,
    });
    setErrors({});
  }, [initialData, visible]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.title || !formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description || !formData.description.trim()) newErrors.description = 'Description is required';
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) newErrors.price = 'Valid price is required';
    const qty = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(qty) || qty <= 0) newErrors.quantity = 'Valid quantity is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity, 10),
      location: location
        ? { latitude: location.latitude, longitude: location.longitude, address: location.address || 'Current Location' }
        : null,
    };
    onSubmit(payload);
  }, [formData, validateForm, onSubmit, location]);

  const addTag = useCallback(() => {
    const tag = newTag.trim();
    if (!tag) return;
    if (formData.tags.includes(tag)) {
      setNewTag('');
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...(prev.tags || []), tag] }));
    setNewTag('');
  }, [newTag, formData.tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setFormData((prev) => ({ ...prev, tags: (prev.tags || []).filter((t: string) => t !== tagToRemove) }));
  }, []);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <Card style={styles.card}>
          <Card.Title
            title={initialData ? 'Edit Product' : 'Add Product'}
            subtitle={initialData ? 'Update product details' : 'Create a new product listing'}
            right={(props) => <IconButton {...props} icon="close" onPress={onDismiss} />}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flexGrow: 1 }}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

              <TextInput
                label="Title"
                value={formData.title}
                onChangeText={(t) => setFormData((p) => ({ ...p, title: t }))}
                mode="outlined"
                style={styles.input}
                error={!!errors.title}
              />
              <HelperText type="error" visible={!!errors.title}>{errors.title}</HelperText>

              <TextInput
                label="Description"
                value={formData.description}
                onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textArea]}
                error={!!errors.description}
              />
              <HelperText type="error" visible={!!errors.description}>{errors.description}</HelperText>

              <View style={styles.row}>
                <TextInput
                  label="Price ($)"
                  value={formData.price}
                  onChangeText={(t) => setFormData((p) => ({ ...p, price: t }))}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  error={!!errors.price}
                />

                <TextInput
                  label="Quantity"
                  value={formData.quantity}
                  onChangeText={(t) => setFormData((p) => ({ ...p, quantity: t }))}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, { width: 100 }]}
                  error={!!errors.quantity}
                />
              </View>
              <HelperText type="error" visible={!!errors.price}>{errors.price}</HelperText>
              <HelperText type="error" visible={!!errors.quantity}>{errors.quantity}</HelperText>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <Surface style={styles.pickerSurface}>
                  <Picker selectedValue={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                    {categories.map((c) => (
                      <Picker.Item key={c} label={c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} value={c} />
                    ))}
                  </Picker>
                </Surface>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Condition</Text>
                <View style={styles.conditionRow}>
                  {conditions.map((c) => (
                    <Chip key={c.value} mode={formData.condition === c.value ? 'flat' : 'outlined'} onPress={() => setFormData((p) => ({ ...p, condition: c.value }))} style={styles.conditionChip}>{c.label}</Chip>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tags</Text>
                <View style={styles.tagInputRow}>
                  <TextInput
                    placeholder="Add tag"
                    value={newTag}
                    onChangeText={setNewTag}
                    mode="outlined"
                    style={styles.tagInput}
                    onSubmitEditing={addTag}
                  />
                  <Button mode="outlined" onPress={addTag} compact style={{ marginLeft: 8 }}>Add</Button>
                </View>
                <View style={styles.tagsContainer}>
                  {(formData.tags || []).map((t: string) => (
                    <Chip key={t} onClose={() => removeTag(t)} style={styles.tagChip}>{t}</Chip>
                  ))}
                </View>
              </View>

              <View style={{ height: 24 }} />

              <View style={styles.actionsRow}>
                <Button mode="outlined" onPress={onDismiss} style={{ flex: 1, marginRight: 8 }}>Cancel</Button>
                <PrimaryButton onPress={handleSubmit} style={{ flex: 1 }}> {initialData ? 'Update' : 'Create'}</PrimaryButton>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { maxHeight: '90%', borderRadius: 12, overflow: 'hidden' },
  content: { padding: 16 },
  input: { marginBottom: 12, backgroundColor: appTheme.colors.surface },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, color: appTheme.colors.textSecondary, marginBottom: 8 },
  pickerSurface: { borderRadius: 8, overflow: 'hidden' },
  conditionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  conditionChip: { marginRight: 8, marginBottom: 8 },
  tagInputRow: { flexDirection: 'row', alignItems: 'center' },
  tagInput: { flex: 1, backgroundColor: appTheme.colors.surface },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tagChip: { marginRight: 8, marginBottom: 8, backgroundColor: appTheme.colors.surfaceElevated },
  actionsRow: { flexDirection: 'row', marginTop: 12 },
});

export default ProductModal;
