// src/components/SubscriptionModal.js

import React, { useState, useContext, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SimpleLanguageContext } from '../contexts/SimpleLanguageContext';
import { ENABLE_I18N, fallbackT } from '../config/i18nConfig';
import { supabase } from '../config/SupabaseConfig'; // ✅ Import supabase

const { height: windowHeight } = Dimensions.get('window');
const MODAL_PERCENT = 0.92;
const modalHeight = Math.round(windowHeight * MODAL_PERCENT);

const SubscriptionModal = ({ visible, onClose, currentSubscription }) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = ENABLE_I18N ? useContext(SimpleLanguageContext) : { t: fallbackT };
  const [selectedPlan, setSelectedPlan] = useState('growth');
  
  // ✅ NEW: User details state
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    phone: '',
    userId: '',
  });
  const [loadingUser, setLoadingUser] = useState(true);

  const SUPPORT_WHATSAPP = '918080740867';

  // ✅ NEW: Fetch user details when modal opens
  useEffect(() => {
    if (visible) {
      fetchUserDetails();
    }
  }, [visible]);

  const fetchUserDetails = async () => {
    try {
      setLoadingUser(true);

      // Get current user from Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Error fetching user:', authError);
        setLoadingUser(false);
        return;
      }

      // Extract user details
      const userData = {
        userId: user.id,
        email: user.email || '',
        phone: user.phone || user.user_metadata?.phone || user.user_metadata?.phoneNumber || '',
        name: user.user_metadata?.name || 
              user.user_metadata?.full_name || 
              user.user_metadata?.display_name ||
              user.email?.split('@')[0] || 
              'Customer',
      };

      console.log('📋 User Details:', userData);
      setUserDetails(userData);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const plans = {
    starter: {
      name: t('subscription.plans.starter.name') || 'Starter',
      emoji: '💎',
      duration: 6,
      price: 799,
      monthlyEquivalent: 133,
      discount: 0,
      tagline: t('subscription.plans.starter.tagline') || 'Kickstart your journey — perfect for exploring all features',
      color: '#34C759',
      features: [
        t('subscription.features.cloudSync') || 'Cloud sync enabled',
        t('subscription.features.multiDevice') || 'Multi-device support (up to 2)',
        t('subscription.features.autoBackup') || 'Automatic backup',
        t('subscription.features.prioritySupport') || 'Priority support',
      ],
    },
    growth: {
      name: t('subscription.plans.growth.name') || 'Growth',
      emoji: '🌟',
      duration: 12,
      price: 1299,
      monthlyEquivalent: 108,
      discount: 18.7,
      tagline: t('subscription.plans.growth.tagline') || 'Most popular — double duration, save almost 20%!',
      color: '#007AFF',
      popular: true,
      features: [
        t('subscription.features.cloudSync') || 'Cloud sync enabled',
        t('subscription.features.unlimitedDevices') || 'Unlimited devices',
        t('subscription.features.autoBackup') || 'Automatic backup',
        t('subscription.features.advancedReports') || 'Advanced reports',
        t('subscription.features.prioritySupport') || 'Priority support',
      ],
    },
    trust: {
      name: t('subscription.plans.trust.name') || 'Trust',
      emoji: '⚡',
      duration: 18,
      price: 1799,
      monthlyEquivalent: 100,
      discount: 24.9,
      tagline: t('subscription.plans.trust.tagline') || 'For dedicated users — go longer, save more',
      color: '#FF9500',
      features: [
        t('subscription.features.cloudSync') || 'Cloud sync enabled',
        t('subscription.features.unlimitedDevices') || 'Unlimited devices',
        t('subscription.features.autoBackup') || 'Automatic backup',
        t('subscription.features.advancedReports') || 'Advanced reports',
        t('subscription.features.premiumSupport') || 'Premium support',
        t('subscription.features.earlyAccess') || 'Early access to new features',
      ],
    },
  };

  const handleContactSupport = () => {
    const plan = plans[selectedPlan];
    
    // ✅ ENHANCED: Include user details in message
    const message = `${t('subscription.whatsapp.greeting') || 'Hi! I want to upgrade to Premium'}

📋 *CUSTOMER DETAILS*
👤 Name: ${userDetails.name}
📧 Email: ${userDetails.email}
📱 Phone: ${userDetails.phone || 'Not provided'}
🆔 User ID: ${userDetails.userId.substring(0, 8)}...

💎 *SUBSCRIPTION REQUEST*
${plan.emoji} Plan: ${plan.name}
⏰ Duration: ${plan.duration} ${t('subscription.months') || 'months'}
💰 Amount: ₹${plan.price}
${plan.discount > 0 ? `💵 Savings: ${plan.discount.toFixed(1)}%` : ''}

${t('subscription.whatsapp.request') || 'Please send me payment details. Thank you!'}`;

    const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
          onClose();
        } else {
          Alert.alert(
            t('subscription.alert.noWhatsApp') || 'WhatsApp Not Installed',
            t('subscription.alert.installWhatsApp') || 'Please install WhatsApp or contact support',
            [{ text: t('common.ok') || 'OK' }]
          );
        }
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert(
          t('common.error') || 'Error',
          t('subscription.alert.whatsappError') || 'Could not open WhatsApp',
          [{ text: t('common.ok') || 'OK' }]
        );
      });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background, height: modalHeight }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {t('subscription.chooseYourPlan') || 'Choose Your Plan'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* ✅ Loading State */}
          {loadingUser ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {t('subscription.loadingDetails') || 'Loading your details...'}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
            >
              {/* ✅ NEW: User Info Card
              <View style={[styles.userInfoCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff' }]}>
                <View style={styles.userInfoRow}>
                  <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
                  <View style={styles.userInfoContent}>
                    <Text style={[styles.userInfoLabel, { color: theme.colors.textSecondary }]}>
                      {t('subscription.accountHolder') || 'Account Holder'}
                    </Text>
                    <Text style={[styles.userInfoValue, { color: theme.colors.text }]}>
                      {userDetails.name}
                    </Text>
                  </View>
                </View>
                {userDetails.email && (
                  <View style={styles.userInfoRow}>
                    <Ionicons name="mail" size={20} color={theme.colors.primary} />
                    <Text style={[styles.userInfoText, { color: theme.colors.text }]}>
                      {userDetails.email}
                    </Text>
                  </View>
                )}
                {userDetails.phone && (
                  <View style={styles.userInfoRow}>
                    <Ionicons name="call" size={20} color={theme.colors.primary} />
                    <Text style={[styles.userInfoText, { color: theme.colors.text }]}>
                      {userDetails.phone}
                    </Text>
                  </View>
                )}
              </View> */}

              {/* Current Status */}
              {currentSubscription && (
                <View style={[styles.currentStatus, { backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff' }]}>
                  <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                  <Text style={[styles.currentStatusText, { color: theme.colors.text }]}>
                    {currentSubscription.isLifetime 
                      ? t('subscription.currentLifetime') || 'You have Lifetime Premium'
                      : currentSubscription.isExpired
                      ? t('subscription.currentExpired') || 'Your subscription has expired'
                      : `${t('subscription.currentActive') || 'Active until'}: ${new Date(currentSubscription.endDate).toLocaleDateString()}`
                    }
                  </Text>
                </View>
              )}

              {/* Plans */}
              <View style={styles.plansContainer}>
                {Object.keys(plans).map((planKey) => {
                  const plan = plans[planKey];
                  const isSelected = selectedPlan === planKey;

                  return (
                    <TouchableOpacity
                      key={planKey}
                      style={[
                        styles.planCard,
                        { 
                          backgroundColor: theme.colors.surface,
                          borderColor: isSelected ? plan.color : theme.colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => setSelectedPlan(planKey)}
                      activeOpacity={0.8}
                    >
                      {/* Popular Badge */}
                      {plan.popular && (
                        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                          <Text style={styles.popularText}>
                            {t('subscription.mostPopular') || 'MOST POPULAR'}
                          </Text>
                        </View>
                      )}

                      {/* Plan Header */}
                      <View style={styles.planHeader}>
                        <Text style={styles.planEmoji}>{plan.emoji}</Text>
                        <View style={styles.planTitleContainer}>
                          <Text style={[styles.planName, { color: theme.colors.text }]}>
                            {plan.name}
                          </Text>
                          <Text style={[styles.planDuration, { color: theme.colors.textSecondary }]}>
                            {plan.duration} {t('subscription.months') || 'Months'}
                          </Text>
                        </View>
                      </View>

                      {/* Price */}
                      <View style={styles.priceContainer}>
                        <Text style={[styles.price, { color: plan.color }]}>
                          ₹{plan.price}
                        </Text>
                        <Text style={[styles.priceDetails, { color: theme.colors.textSecondary }]}>
                          ₹{plan.monthlyEquivalent}/{t('subscription.month') || 'month'}
                        </Text>
                      </View>

                      {/* Discount Badge */}
                      {plan.discount > 0 && (
                        <View style={[styles.discountBadge, { backgroundColor: isDarkMode ? '#065f46' : '#d1fae5' }]}>
                          <Text style={[styles.discountText, { color: isDarkMode ? '#34d399' : '#047857' }]}>
                            {t('subscription.save') || 'Save'} {plan.discount.toFixed(1)}%
                          </Text>
                        </View>
                      )}

                      {/* Tagline */}
                      <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                        {plan.tagline}
                      </Text>

                      {/* Features */}
                      <View style={styles.featuresContainer}>
                        {plan.features.map((feature, index) => (
                          <View key={index} style={styles.featureRow}>
                            <Ionicons 
                              name="checkmark-circle" 
                              size={16} 
                              color={plan.color} 
                            />
                            <Text style={[styles.featureText, { color: theme.colors.text }]}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={28} color={plan.color} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                  {t('subscription.orderSummary') || 'Order Summary'}
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    {t('subscription.selectedPlan') || 'Selected Plan'}:
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {plans[selectedPlan].emoji} {plans[selectedPlan].name}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                    {t('subscription.duration') || 'Duration'}:
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {plans[selectedPlan].duration} {t('subscription.months') || 'months'}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryTotalLabel, { color: theme.colors.text }]}>
                    {t('subscription.totalAmount') || 'Total Amount'}:
                  </Text>
                  <Text style={[styles.summaryTotalValue, { color: plans[selectedPlan].color }]}>
                    ₹{plans[selectedPlan].price}
                  </Text>
                </View>
              </View>

              {/* Contact Button */}
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: plans[selectedPlan].color }]}
                onPress={handleContactSupport}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                <Text style={styles.contactButtonText}>
                  {t('subscription.contactSupport') || 'Contact Support to Upgrade'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  // ✅ NEW: Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  // ✅ NEW: User info card styles
  userInfoCard: {
    margin: 15,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfoContent: {
    flex: 1,
  },
  userInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  userInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfoText: {
    fontSize: 14,
    flex: 1,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  plansContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  planEmoji: {
    fontSize: 36,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  planDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
  },
  priceDetails: {
    fontSize: 14,
    fontWeight: '600',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  discountText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  featuresContainer: {
    gap: 10,
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  summaryCard: {
    margin: 15,
    padding: 18,
    borderRadius: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    padding: 18,
    borderRadius: 16,
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportNote: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 12,
    marginHorizontal: 30,
    lineHeight: 18,
  },
});

export default SubscriptionModal;
