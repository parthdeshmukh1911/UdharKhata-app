// src/components/CustomerSelectModal.js

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  FontSizes,
  Spacing,
  IconSizes,
  BorderRadius,
} from '../Utils/Responsive';

export default function CustomerSelectModal({
  visible,
  customers,
  onSelect,
  onClose,
  title = 'Select Customer',
  subtitle,
}) {
  const { theme } = useTheme();

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.itemRow,
        { borderBottomColor: theme.colors.borderLight },
      ]}
      activeOpacity={0.7}
      onPress={() => onSelect?.(item)}
    >
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: theme.colors.primaryLight },
          ]}
        >
          <Text
            style={[styles.avatarText, { color: theme.colors.primary }]}
            numberOfLines={1}
          >
            {(item['Customer Name'] || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.itemTextContainer}>
          <Text
            style={[styles.customerName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {item['Customer Name'] || 'Unknown'}
          </Text>
          {item['Phone Number'] ? (
            <Text
              style={[
                styles.customerPhone,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item['Phone Number']}
            </Text>
          ) : null}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={IconSizes.medium}
        color={theme.colors.textTertiary}
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <View style={styles.headerTextContainer}>
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close"
                size={IconSizes.large}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={customers}
            keyExtractor={(item, index) =>
              item['Customer ID']?.toString() || `${item['Customer Name']}-${index}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />

          {/* Footer / Cancel */}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              { borderTopColor: theme.colors.border },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.cancelText, { color: theme.colors.textSecondary }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const SHEET_MAX_HEIGHT = 0.7; // 70% of screen height

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: `${SHEET_MAX_HEIGHT * 100}%`,
    borderTopLeftRadius: BorderRadius.xlarge,
    borderTopRightRadius: BorderRadius.xlarge,
    paddingBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: FontSizes.small,
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: IconSizes.xxlarge * 0.9,
    height: IconSizes.xxlarge * 0.9,
    borderRadius: (IconSizes.xxlarge * 0.9) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSizes.large,
    fontWeight: '700',
  },
  itemTextContainer: {
    flex: 1,
  },
  customerName: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
  },
  customerPhone: {
    fontSize: FontSizes.small,
    fontWeight: '500',
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  cancelText: {
    fontSize: FontSizes.regular,
    fontWeight: '600',
  },
});
