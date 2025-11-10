// src/screens/EditProfileScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N, fallbackT } from '../config/i18nConfig';
import {
  FontSizes,
  Spacing,
  BorderRadius,
} from '../Utils/Responsive';
import { useUser } from '../contexts/UserContext';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };
  const { user, profile, updateProfile, refreshProfile } = useUser();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile into state
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
      setBusinessName(profile.business_name || '');
      setBusinessType(profile.business_type || '');
      setGstNumber(profile.gst_number || '');
      setBusinessAddress(profile.business_address || '');
    }
  }, [profile]);

  // Detect changes
  useEffect(() => {
    if (profile) {
      const changed =
        fullName !== (profile.full_name || '') ||
        phoneNumber !== (profile.phone_number || '') ||
        businessName !== (profile.business_name || '') ||
        businessType !== (profile.business_type || '') ||
        gstNumber !== (profile.gst_number || '') ||
        businessAddress !== (profile.business_address || '');
      setHasChanges(changed);
    }
  }, [fullName, phoneNumber, businessName, businessType, gstNumber, businessAddress, profile]);

  // Save profile handler
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.validation'), t('profile.validationFullName'));
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert(t('common.validation'), t('profile.validationPhoneNumber'));
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert(t('common.validation'), t('profile.validationPhoneNumberValid'));
      return;
    }

    if (!businessName.trim()) {
      Alert.alert(t('common.validation'), t('profile.validationBusinessName'));
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        business_name: businessName.trim(),
        business_type: businessType.trim() || null,
        gst_number: gstNumber.trim() || null,
        business_address: businessAddress.trim() || null,
      });

      if (result.success) {
        Alert.alert(
          t('common.success'),
          t('profile.successUpdate'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(t('common.error'), result.error || t('profile.errorUpdate'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('profile.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  // Discard changes handler
  const handleDiscard = () => {
    if (hasChanges) {
      Alert.alert(
        t('profile.discardChangesTitle'),
        t('profile.discardChangesMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.discard'), style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="person" size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emailText, { color: theme.colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          {/* Personal Info Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('profile.personalInformation')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.fullName')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderFullName')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.phoneNumber')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderPhoneNumber')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* Business Info Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('profile.businessInformation')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.businessName')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="storefront-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderBusinessName')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={businessName}
                  onChangeText={setBusinessName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.businessType')} <Text style={styles.optional}>({t('common.optional')})</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="briefcase-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderBusinessType')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={businessType}
                  onChangeText={setBusinessType}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.gstNumber')} <Text style={styles.optional}>({t('common.optional')})</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderGstNumber')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={gstNumber}
                  onChangeText={(text) => setGstNumber(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={15}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.businessAddress')} <Text style={styles.optional}>({t('common.optional')})</Text>
              </Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIconTop} />
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderBusinessAddress')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: theme.isDarkMode ? '#1e3a5f' : '#eff6ff' }]}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={[styles.infoText, { color: theme.isDarkMode ? '#93c5fd' : '#1e40af' }]}>
              {t('profile.infoCardText')}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Save Button */}
        {hasChanges && (
          <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.saveButtonLarge, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    // Additional styles for save button
  },
  headerTitle: {
    fontSize: FontSizes.xlarge,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emailText: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.tiny,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm,
    letterSpacing: 0.5,
  },

  // Input Groups
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    color: '#94a3b8',
    fontSize: FontSizes.tiny,
  },

  // Input Fields
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    height: 50,
  },
  textAreaWrapper: {
    height: 100,
    alignItems: 'flex-start',
    paddingTop: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  inputIconTop: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.regular,
    fontWeight: '500',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.small,
    fontWeight: '500',
    lineHeight: FontSizes.small * 1.5,
  },

  // Bottom Bar
  bottomBar: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.large,
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FontSizes.regular,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
