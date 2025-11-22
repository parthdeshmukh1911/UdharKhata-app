/**
 * GoogleBackupScreen.js
 * Screen for managing Google Drive photo backup
 * Handles sign-in, sign-out, and displays backup status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GoogleAuthService from '../services/GoogleAuthService';

export default function GoogleBackupScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    checkSignInStatus();
  }, []);

  // Check if user is already signed in
  const checkSignInStatus = async () => {
    try {
      const currentUser = await GoogleAuthService.getCurrentUser();
      if (currentUser) {
        setUserInfo(currentUser);
        setIsSignedIn(true);
      }
    } catch (error) {
      console.log('No user signed in', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleSignIn = async () => {
    try {
      setIsSigning(true);
      
      // Use service to sign in
      const userData = await GoogleAuthService.signIn();
      
      setUserInfo(userData);
      setIsSignedIn(true);
      Alert.alert('Success', 'Signed in successfully! Your photos will now backup to Google Drive.');
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Handle specific error messages from service
      if (error.message === 'CANCELLED') {
        console.log('User cancelled the sign-in flow');
      } else if (error.message === 'IN_PROGRESS') {
        Alert.alert('Error', 'Sign in is already in progress');
      } else if (error.message === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Error', 'Google Play Services not available or outdated');
      } else {
        Alert.alert('Error', 'Something went wrong with sign in');
      }
    } finally {
      setIsSigning(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to disconnect Google Drive backup? Your existing backups will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await GoogleAuthService.signOut();
              setUserInfo(null);
              setIsSignedIn(false);
              Alert.alert('Signed Out', 'Google Drive backup has been disconnected');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Icon name="cloud-upload" size={60} color="#1e90ff" />
          <Text style={styles.title}>Google Drive Backup</Text>
          <Text style={styles.subtitle}>
            Automatically backup your transaction photos to your Google Drive
          </Text>
        </View>

        {/* Not Signed In State */}
        {!isSignedIn && (
          <View style={styles.signInSection}>
            <View style={styles.featuresList}>
              <FeatureItem 
                icon="check-circle" 
                text="Never lose your transaction photos" 
              />
              <FeatureItem 
                icon="check-circle" 
                text="Access photos from any device" 
              />
              <FeatureItem 
                icon="check-circle" 
                text="Automatic background sync" 
              />
              <FeatureItem 
                icon="check-circle" 
                text="Free 15GB storage with Google" 
              />
            </View>

            {/* Google Sign-In Button */}
            <View style={styles.buttonContainer}>
              <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={handleSignIn}
                disabled={isSigning}
                style={styles.googleButton}
              />
              {isSigning && (
                <ActivityIndicator 
                  size="small" 
                  color="#1e90ff" 
                  style={styles.buttonLoader} 
                />
              )}
            </View>

            <Text style={styles.privacyNote}>
              <Icon name="lock" size={14} /> Your photos are stored privately in your Google Drive
            </Text>
          </View>
        )}

        {/* Signed In State */}
        {isSignedIn && userInfo && (
          <View style={styles.signedInSection}>
            {/* User Info Card */}
            <View style={styles.userCard}>
              <View style={styles.statusBadge}>
                <Icon name="check-circle" size={20} color="#4CAF50" />
                <Text style={styles.statusText}>Connected</Text>
              </View>
              
              <View style={styles.userInfo}>
                <Icon name="account-circle" size={50} color="#666" />
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{userInfo.user?.name || 'User'}</Text>
                  <Text style={styles.userEmail}>{userInfo.user?.email}</Text>
                </View>
              </View>
            </View>

            {/* Backup Status */}
            <View style={styles.statusCard}>
              <Text style={styles.statusCardTitle}>Backup Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Auto-backup:</Text>
                <Text style={styles.statusValue}>Enabled ✓</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last backup:</Text>
                <Text style={styles.statusValue}>Not yet started</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Photos backed up:</Text>
                <Text style={styles.statusValue}>0 photos</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Coming Soon', 'Manual backup will be available soon')}
            >
              <Icon name="backup" size={24} color="#1e90ff" />
              <Text style={styles.actionButtonText}>Backup Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <Icon name="logout" size={24} color="#f44336" />
              <Text style={[styles.actionButtonText, styles.signOutText]}>
                Disconnect Google Drive
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            • Photos are uploaded to your private Google Drive folder{'\n'}
            • Only you can access your backed-up photos{'\n'}
            • Backups happen automatically in the background{'\n'}
            • Works even when switching devices
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Feature Item Component
const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Icon name={icon} size={24} color="#4CAF50" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  signInSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresList: {
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  googleButton: {
    width: 312,
    height: 48,
  },
  buttonLoader: {
    marginTop: 10,
  },
  privacyNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  signedInSection: {
    marginBottom: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 15,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1e90ff',
    fontWeight: '600',
    marginLeft: 10,
  },
  signOutButton: {
    borderColor: '#f44336',
    marginTop: 5,
  },
  signOutText: {
    color: '#f44336',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
