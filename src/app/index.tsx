import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScanStore } from '../store/scanStore';
import { formatBytes, sumGalleryBytes } from '../utils/galleryStorage';

export default function Index() {
  const [error, setError] = useState<string | null>(null);
  const [expectedCount, setExpectedCountInput] = useState<string>('');
  const setExpectedCount = useScanStore((s) => s.setExpectedCount);
  const gallery = useScanStore((s) => s.gallery);
  const bytesUsed = sumGalleryBytes(gallery);

  const handleStart = () => {
    const count = parseInt(expectedCount, 10);
    if (Number.isNaN(count) || count < 1 || count > 99) {
      setError('Enter a number between 1 and 99');
      return;
    }
    setExpectedCount(count);
    router.push({
      pathname: '/camera',
      params: { expectedCount: String(count) },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={() => router.push('/gallery')}
            activeOpacity={0.8}
          >
            <Text style={styles.galleryBtnText}>
              Gallery{gallery.length > 0 ? ` (${gallery.length})` : ''}
            </Text>
            {gallery.length > 0 ? (
              <Text style={styles.galleryHint}>{formatBytes(bytesUsed)} saved</Text>
            ) : null}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Rack Configuration</Text>
            <Text style={styles.infoText}>
              Enter the expected number of physical food trays in the current rack to verify
              structural scanning coverage.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Expected Tray Count</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              keyboardType="number-pad"
              maxLength={2}
              value={expectedCount}
              onChangeText={(text) => {
                setError(null);
                setExpectedCountInput(text);
              }}
              placeholder="e.g. 9"
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleStart} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Start Recording Sweep</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  galleryBtn: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'flex-end',
  },
  galleryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  galleryHint: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
