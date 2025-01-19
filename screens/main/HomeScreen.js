import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.90.159:5000/api';

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [activeReminders, setActiveReminders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      
      if (userStr) {
        setUser(JSON.parse(userStr));
      }

      // Fetch recent health records
      const recordsResponse = await axios.get(`${API_URL}/health/records?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentRecords(recordsResponse.data);

      // Fetch active reminders
      const remindersResponse = await axios.get(`${API_URL}/health/reminders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveReminders(remindersResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Halo, {user?.name || 'User'}!</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileInitials}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Health Records')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#2196F3" />
            <Text style={styles.actionText}>Tambah Catatan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reminders')}
          >
            <Ionicons name="notifications-outline" size={24} color="#2196F3" />
            <Text style={styles.actionText}>Pengingat</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catatan Terbaru</Text>
          {recentRecords.length > 0 ? (
            recentRecords.map((record) => (
              <TouchableOpacity 
                key={record._id}
                style={styles.recordItem}
                onPress={() => navigation.navigate('Health Records', { record })}
              >
                <Text style={styles.recordType}>{record.recordType}</Text>
                <Text style={styles.recordDate}>
                  {new Date(record.date).toLocaleDateString('id-ID')}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada catatan</Text>
          )}
        </View>

        {/* Active Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pengingat Aktif</Text>
          {Array.isArray(activeReminders) && activeReminders.length > 0 ? (
            activeReminders.map((reminder) => (
              reminder && reminder._id ? (
                <View key={reminder._id} style={styles.reminderItem}>
                  <Ionicons name="time-outline" size={20} color="#2196F3" />
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderTitle}>{reminder.value || ''}</Text>
                    <Text style={styles.reminderTime}>
                      {Array.isArray(reminder.time) ? reminder.time.join(', ') : ''}
                    </Text>
                  </View>
                </View>
              ) : null
            ))
          ) : (
            <Text style={styles.emptyText}>Tidak ada pengingat aktif</Text>
          )}
        </View>
      </ScrollView>
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
    alignItems: 'center',
  },
  greeting: {
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
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    width: '45%',
  },
  actionText: {
    marginTop: 5,
    color: '#2196F3',
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recordItem: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordType: {
    fontSize: 16,
    fontWeight: '500',
  },
  recordDate: {
    color: '#666',
  },
  reminderItem: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderInfo: {
    marginLeft: 10,
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  reminderTime: {
    color: '#666',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
}); 