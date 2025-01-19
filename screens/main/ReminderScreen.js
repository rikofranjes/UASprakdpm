import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const API_URL = 'http://192.168.90.159:5000/api';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReminderScreen() {
  const [reminders, setReminders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [value, setValue] = useState('');
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [isActive, setIsActive] = useState(true);
  const [editingReminder, setEditingReminder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReminders().finally(() => setRefreshing(false));
  }, []);

  const fetchReminders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/health/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminders(response.data);
    } catch (error) {
      Alert.alert('Error', 'Gagal mengambil data pengingat');
    }
  };

  const handleSubmit = async () => {
    if (!value || selectedTimes.length === 0) {
      Alert.alert('Error', 'Mohon isi semua field yang diperlukan');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint = editingReminder 
        ? `${API_URL}/health/reminders/${editingReminder._id}`
        : `${API_URL}/health/reminders`;
      
      const method = editingReminder ? 'put' : 'post';
      
      const formattedTimes = selectedTimes.map(date => 
        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      );
      
      const reminderData = {
        value,
        time: formattedTimes,
        isActive
      };
      
      await axios[method](
        endpoint,
        reminderData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      Alert.alert(
        'Sukses', 
        editingReminder 
          ? 'Pengingat berhasil diperbarui'
          : 'Pengingat berhasil ditambahkan'
      );
      
      setModalVisible(false);
      resetForm();
      fetchReminders();
    } catch (error) {
      Alert.alert(
        'Error',
        editingReminder 
          ? 'Gagal memperbarui pengingat'
          : 'Gagal menambahkan pengingat'
      );
    }
  };

  const handleEditReminder = (reminder) => {
    if (!reminder) return;
    
    setEditingReminder(reminder);
    setValue(reminder.value || '');

    const times = reminder.time.map(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours || 0);
      date.setMinutes(minutes || 0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date;
    });
    
    setSelectedTimes(times.sort((a, b) => a - b));
    setIsActive(reminder.isActive || false);
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingReminder(null);
    setValue('');
    setSelectedTimes([]);
    setIsActive(true);
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      const normalizedDate = new Date(selectedDate);
      normalizedDate.setSeconds(0);
      normalizedDate.setMilliseconds(0);

      const timeExists = selectedTimes.some(time => 
        time.getHours() === normalizedDate.getHours() && 
        time.getMinutes() === normalizedDate.getMinutes()
      );

      if (!timeExists) {
        setSelectedTimes(prev => {
          const newTimes = [...prev, normalizedDate];
          return newTimes.sort((a, b) => {
            if (a.getHours() === b.getHours()) {
              return a.getMinutes() - b.getMinutes();
            }
            return a.getHours() - b.getHours();
          });
        });
      } else {
        Alert.alert('Info', 'Waktu ini sudah ditambahkan');
      }
    }
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const showTimePickerModal = () => {
    if (Platform.OS === 'android') {
      setTempTime(new Date());
      setShowTimePicker(true);
    } else {
      setTempTime(new Date());
      setShowTimePicker(true);
    }
  };

  const removeTime = (index) => {
    setSelectedTimes(prev => prev.filter((_, i) => i !== index));
  };

  const toggleReminderStatus = async (reminder) => {
    if (!reminder) return;

    try {
      const token = await AsyncStorage.getItem('token');
      const updatedData = {
        value: reminder.value || '',
        time: Array.isArray(reminder.time) ? reminder.time : [],
        isActive: !reminder.isActive
      };
      
      await axios.put(
        `${API_URL}/health/reminders/${reminder._id}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchReminders();
    } catch (error) {
      Alert.alert('Error', 'Gagal mengubah status pengingat');
    }
  };

  const handleDelete = async (reminderId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${API_URL}/health/reminders/${reminderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Sukses', 'Pengingat berhasil dihapus');
      fetchReminders();
    } catch (error) {
      Alert.alert('Error', 'Gagal menghapus pengingat');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Pengingat</Text>
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
          {/* Reminders List */}
          {Array.isArray(reminders) && reminders.map((reminder) => (
            reminder && reminder._id ? (
              <View key={reminder._id} style={styles.reminderCard}>
                <TouchableOpacity
                  style={styles.reminderContent}
                  onPress={() => handleEditReminder(reminder)}
                >
                  <View style={styles.reminderHeader}>
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderTitle}>{reminder.value || ''}</Text>
                      <Text style={styles.reminderTime}>
                        {Array.isArray(reminder.time) ? reminder.time.join(', ') : ''}
                      </Text>
                    </View>
                    <View style={styles.reminderActions}>
                      <Switch
                        value={reminder.isActive || false}
                        onValueChange={() => toggleReminderStatus(reminder)}
                        trackColor={{ false: '#ddd', true: '#81b0ff' }}
                        thumbColor={reminder.isActive ? '#2196F3' : '#f4f3f4'}
                      />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Konfirmasi',
                            'Apakah Anda yakin ingin menghapus pengingat ini?',
                            [
                              {
                                text: 'Batal',
                                style: 'cancel',
                              },
                              {
                                text: 'Hapus',
                                onPress: () => handleDelete(reminder._id),
                                style: 'destructive',
                              },
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null
          ))}
        </ScrollView>

        {/* Modal */}
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
                  {editingReminder ? 'Edit Pengingat' : 'Tambah Pengingat'}
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
                    <Text style={styles.label}>Jenis Suplemen</Text>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={setValue}
                      placeholder="Contoh: Kafein, Whey Protein, dll "
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Waktu Pengingat</Text>
                    <View style={styles.timeContainer}>
                      {selectedTimes.map((time, index) => (
                        <View key={index} style={styles.timeChip}>
                          <Text style={styles.timeText}>
                            {`${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`}
                          </Text>
                          <TouchableOpacity
                            onPress={() => removeTime(index)}
                            style={styles.removeTimeButton}
                          >
                            <Ionicons name="close-circle" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.addTimeButton}
                        onPress={showTimePickerModal}
                      >
                        <Ionicons name="add-circle-outline" size={24} color="#2196F3" />
                        <Text style={styles.addTimeText}>Waktu komsumsi</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.switchContainer}>
                      <Text style={styles.label}>Status Aktif</Text>
                      <Switch
                        value={isActive}
                        onValueChange={setIsActive}
                        trackColor={{ false: '#ddd', true: '#81b0ff' }}
                        thumbColor={isActive ? '#2196F3' : '#f4f3f4'}
                      />
                    </View>
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
                        {editingReminder ? 'Simpan' : 'Tambah'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Time Picker for iOS */}
              {Platform.OS === 'ios' && showTimePicker && (
                <View style={styles.iosTimePickerContainer}>
                  <View style={styles.iosTimePickerHeader}>
                    <TouchableOpacity 
                      onPress={() => setShowTimePicker(false)}
                      style={styles.iosTimePickerButton}
                    >
                      <Text style={styles.iosTimePickerCancel}>Batal</Text>
                    </TouchableOpacity>
                    <Text style={styles.iosTimePickerTitle}>Pilih Waktu</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        handleTimeChange(null, tempTime);
                        setShowTimePicker(false);
                      }}
                      style={styles.iosTimePickerButton}
                    >
                      <Text style={styles.iosTimePickerDone}>Selesai</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={(event, date) => setTempTime(date || tempTime)}
                    style={styles.iosTimePicker}
                    textColor="#2196F3"
                    minuteInterval={1}
                  />
                  <View style={styles.iosTimePreview}>
                    <Text style={styles.iosTimePreviewText}>
                      {formatTime(tempTime)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Time Picker Modal for Android */}
        <Modal
          isVisible={Platform.OS === 'android' && showTimePicker}
          onBackdropPress={() => setShowTimePicker(false)}
          backdropOpacity={0.5}
          style={styles.timePickerModal}
          useNativeDriver={true}
          useNativeDriverForBackdrop={true}
        >
          <View style={styles.androidTimePickerContainer}>
            <View style={styles.androidTimePickerHeader}>
              <Text style={styles.androidTimePickerTitle}>Pilih Waktu</Text>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleTimeChange}
              textColor="#2196F3"
              minuteInterval={1}
              style={styles.androidTimePicker}
            />
            <View style={styles.androidTimePickerButtons}>
              <TouchableOpacity
                style={[styles.androidTimePickerButton, styles.androidTimePickerButtonCancel]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.androidTimePickerButtonTextCancel}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.androidTimePickerButton, styles.androidTimePickerButtonConfirm]}
                onPress={() => handleTimeChange(null, tempTime)}
              >
                <Text style={styles.androidTimePickerButtonTextConfirm}>Pilih</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  reminderCard: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  reminderTime: {
    color: '#666',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
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
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 50,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 15,
    color: '#2196F3',
    fontWeight: '600',
    marginRight: 5,
  },
  removeTimeButton: {
    padding: 2,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  addTimeText: {
    color: '#2196F3',
    marginLeft: 5,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  iosTimePickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  iosTimePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  iosTimePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  iosTimePickerButton: {
    padding: 8,
  },
  iosTimePickerCancel: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '500',
  },
  iosTimePickerDone: {
    color: '#2196F3',
    fontSize: 17,
    fontWeight: '600',
  },
  iosTimePicker: {
    height: 200,
    backgroundColor: '#fff',
  },
  iosTimePreview: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  iosTimePreviewText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2196F3',
  },
  timePickerModal: {
    justifyContent: 'center',
    margin: 20,
  },
  androidTimePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  androidTimePickerHeader: {
    padding: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  androidTimePickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  androidTimePicker: {
    height: 200,
    backgroundColor: '#fff',
  },
  androidTimePickerButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  androidTimePickerButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidTimePickerButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderRightWidth: 0.5,
    borderRightColor: '#eee',
  },
  androidTimePickerButtonConfirm: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 0.5,
    borderLeftColor: '#eee',
  },
  androidTimePickerButtonTextCancel: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  androidTimePickerButtonTextConfirm: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
}); 