import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Keyboard,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

const API_URL = 'http://192.168.90.159:5000/api';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -80;

const SwipeableItem = ({ children, onDelete }) => {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(70);

  const panGesture = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.x = translateX.value;
    },
    onActive: (event, context) => {
      const newValue = Math.min(0, Math.max(-100, context.x + event.translationX));
      translateX.value = newValue;
    },
    onEnd: () => {
      const shouldBeDismissed = translateX.value < SWIPE_THRESHOLD;
      if (shouldBeDismissed) {
        translateX.value = withSpring(-100);
        runOnJS(onDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rIconContainerStyle = useAnimatedStyle(() => {
    const opacity = withSpring(translateX.value < -20 ? 1 : 0);
    return { opacity };
  });

  return (
    <View style={styles.swipeableContainer}>
      <Animated.View style={[styles.deleteIconContainer, rIconContainerStyle]}>
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </Animated.View>
      <PanGestureHandler onGestureEvent={panGesture}>
        <Animated.View style={[styles.swipeableItem, rStyle]}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default function HealthRecordScreen() {
  const [records, setRecords] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [recordType, setRecordType] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    fetchRecords();

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchRecords().finally(() => setRefreshing(false));
  }, []);

  const fetchRecords = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/health/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      Alert.alert('Error', 'Gagal mengambil data catatan kesehatan');
    }
  };

  const handleSubmit = async () => {
    if (!recordType || !value) {
      Alert.alert('Error', 'Mohon isi semua field yang diperlukan');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint = editingRecord 
        ? `${API_URL}/health/records/${editingRecord._id}`
        : `${API_URL}/health/records`;
      
      const method = editingRecord ? 'put' : 'post';
      
      const recordData = {
        recordType,
        value,
        notes: notes || '',
        date: new Date()
      };
      
      await axios[method](
        endpoint,
        recordData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      Alert.alert(
        'Sukses', 
        editingRecord 
          ? 'Catatan berhasil diperbarui'
          : 'Catatan berhasil ditambahkan'
      );
      
      setModalVisible(false);
      resetForm();
      fetchRecords();
    } catch (error) {
      Alert.alert(
        'Error',
        editingRecord 
          ? 'Gagal memperbarui catatan'
          : 'Gagal menambahkan catatan'
      );
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setRecordType(record.recordType);
    setValue(record.value);
    setNotes(record.notes || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingRecord(null);
    setRecordType('');
    setValue('');
    setNotes('');
  };

  const handleDelete = async (recordId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${API_URL}/health/records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Sukses', 'Catatan berhasil dihapus');
      fetchRecords();
    } catch (error) {
      Alert.alert('Error', 'Gagal menghapus catatan');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Catatan Penjulan</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Records List */}
          {records.map((record) => (
            <View key={record._id} style={styles.recordCard}>
              <TouchableOpacity
                style={styles.recordContent}
                onPress={() => handleEditRecord(record)}
              >
                <View style={styles.recordHeader}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordType}>{record.recordType}</Text>
                    <Text style={styles.recordDate}>
                      {new Date(record.date).toLocaleDateString('id-ID')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Konfirmasi',
                        'Apakah Anda yakin ingin menghapus catatan ini?',
                        [
                          {
                            text: 'Batal',
                            style: 'cancel',
                          },
                          {
                            text: 'Hapus',
                            onPress: () => handleDelete(record._id),
                            style: 'destructive',
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.recordValue}>{record.value}</Text>
                <Text style={styles.recordNotes}>{record.notes}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Custom Modal with react-native-modal */}
        <Modal
          isVisible={modalVisible}
          onBackdropPress={() => setModalVisible(false)}
          onBackButtonPress={() => setModalVisible(false)}
          onSwipeComplete={() => setModalVisible(false)}
          swipeDirection={['down']}
          propagateSwipe={true}
          style={styles.modal}
          avoidKeyboard={true}
          backdropOpacity={0.5}
          useNativeDriver={true}
          useNativeDriverForBackdrop={true}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingRecord ? 'Edit Catatan' : 'Tambah Catatan'}
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Jenis Latihan</Text>
                    <TextInput
                      style={styles.input}
                      value={recordType}
                      onChangeText={setRecordType}
                      placeholder="Contoh:  Latihan Kardio, Bodyweight, DLL"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Durasi/Set</Text>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={setValue}
                      placeholder="Masukkan waktu"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Catatan Tambahan</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Tambahkan catatan (opsional)"
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.buttonText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSubmit}
                    >
                      <Text style={[styles.buttonText, styles.saveButtonText]}>
                        {editingRecord ? 'Simpan' : 'Tambah'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  date: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  recordCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordDate: {
    color: '#666',
  },
  recordValue: {
    fontSize: 18,
    marginBottom: 5,
  },
  recordNotes: {
    color: '#666',
    fontStyle: 'italic',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  formContent: {
    padding: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
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
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  swipeableContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  swipeableItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  deleteIconContainer: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: 80,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordContent: {
    flex: 1,
  },
  recordInfo: {
    flex: 1,
  },
}); 