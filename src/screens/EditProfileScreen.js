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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N, fallbackT } from '../config/i18nConfig';
import { FontSizes, Spacing, BorderRadius } from '../Utils/Responsive';
import { useUser } from '../contexts/UserContext';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();

  // Unconditional hook usage with safe fallback to avoid invalid hook call
  const ctx = useContext(SimpleLanguageContext);
  const t = ENABLE_I18N && ctx?.t ? ctx.t : fallbackT;

  const { user, profile, updateProfile } = useUser();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [merchantUpiId, setMerchantUpiId] = useState('');
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
      setMerchantUpiId(profile.merchant_upi_id || '');
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
        businessAddress !== (profile.business_address || '') ||
        merchantUpiId !== (profile.merchant_upi_id || '');
      setHasChanges(changed);
    }
  }, [fullName, phoneNumber, businessName, businessType, gstNumber, businessAddress, merchantUpiId, profile]);

  const handleSave = async () => {
    // Validation (mirrors AuthScreen tone)
    if (!fullName.trim()) {
      showError(t('common.validation'), t('profile.validationFullName'));
      return;
    }
    if (!phoneNumber.trim()) {
      showError(t('common.validation'), t('profile.validationPhoneNumber'));
      return;
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      showError(t('common.validation'), t('profile.validationPhoneNumberValid'));
      return;
    }
    if (!businessName.trim()) {
      showError(t('common.validation'), t('profile.validationBusinessName'));
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
        merchant_upi_id: merchantUpiId.trim() || null,
      });

      if (result.success) {
        showSuccess(t('common.success'), t('profile.successUpdate'), () => navigation.goBack());
      } else {
        showError(t('common.error'), result.error || t('profile.errorUpdate'));
      }
    } catch (error) {
      showError(t('common.error'), error?.message || t('profile.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    if (hasChanges) {
      showConfirm(t('profile.discardChangesTitle'), t('profile.discardChangesMessage'), () => navigation.goBack());
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
          {/* Branded Header (matches AuthScreen visual language) */}
          <View style={styles.headerBlock}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="wallet" size={56} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('profile.editProfileTitle') || 'Edit Profile'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {t('profile.editProfileSubtitle') || 'Update your business details'}
            </Text>
          </View>

          {/* Personal Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('profile.personalInformation')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.fullName')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="person" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="call" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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

          {/* Business Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t('profile.businessInformation')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.businessName')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="storefront" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="briefcase" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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

            {/* Payment Info (Merchant UPI ID) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.merchantUpiId') || 'Merchant UPI ID'} <Text style={styles.optional}>({t('common.optional')})</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="card" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder={t('profile.placeholderMerchantUpiId') || 'e.g., merchant@upi'}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={merchantUpiId}
                  onChangeText={setMerchantUpiId}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('profile.gstNumber')} <Text style={styles.optional}>({t('common.optional')})</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="document-text" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name="location" size={20} color={theme.colors.textSecondary} style={styles.inputIconTop} />
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

          {/* Info Card (matches AuthScreen info tone) */}
          <View style={[styles.infoCard, { backgroundColor: theme.isDarkMode ? '#1e3a5f' : '#eff6ff' }]}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={[styles.infoText, { color: theme.isDarkMode ? '#93c5fd' : '#1e40af' }]}>
              {t('profile.infoCardText')}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Save Bar (Auth-like primary CTA) */}
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              onPress={handleDiscard}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButtonLarge, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  // Header block (mirrors AuthScreen)
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, textAlign: 'center', fontWeight: '500' },

  // Sections
  section: { marginBottom: Spacing.l },
  sectionTitle: {
    fontSize: FontSizes.medium,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm,
    letterSpacing: 0.5,
  },

  // Inputs (match AuthScreen)
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.medium, fontWeight: '600', marginBottom: Spacing.sm, marginLeft: Spacing.sm },
  required: { color: '#ef4444' },
  optional: { color: '#94a3b8', fontSize: FontSizes.tiny },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.large,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    height: 50,
  },
  textAreaWrapper: { height: 100, alignItems: 'flex-start', paddingTop: Spacing.md },
  inputIcon: { marginRight: Spacing.sm },
  inputIconTop: { marginRight: Spacing.sm, marginTop: 2 },
  input: { flex: 1, fontSize: FontSizes.regular, fontWeight: '500' },
  textArea: { height: 70, textAlignVertical: 'top' },

  // Info Card (AuthScreen tone)
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  infoText: { flex: 1, fontSize: FontSizes.small, fontWeight: '500', lineHeight: FontSizes.small * 1.5 },

  // Bottom Bar with primary CTA
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
      android: { elevation: 8 },
    }),
  },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.large,
    borderWidth: 1.5,
  },
  cancelText: { marginLeft: 6, fontSize: FontSizes.regular, fontWeight: '700' },
  saveButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.large,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#1e40af',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  saveButtonText: { color: '#fff', fontSize: FontSizes.regular, fontWeight: '700', letterSpacing: 0.3 },
});
