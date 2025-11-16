import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import {
  FontSizes,
  Spacing,
  IconSizes,
  BorderRadius,
} from '../Utils/Responsive';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 250;
const BAR_WIDTH = 16;
const BAR_GROUP_WIDTH = 48;
const CHART_MONTHS = 12;
const CHART_SCROLL_WIDTH = BAR_GROUP_WIDTH * CHART_MONTHS;

export default function MonthlyTrendsChart({
  creditData = [],
  paymentData = [],
  selectedYear,
  onYearChange,
  availableYears = [],
}) {
  const { theme, isDarkMode } = useTheme();

  const scrollRef = useRef(null); // 🔥 Added for auto-scroll

  const [activeIndex, setActiveIndex] = useState(null);
  const [activeType, setActiveType] = useState(null);

  const [barHeights, setBarHeights] = useState(
    Array(12).fill({ credit: 0, payment: 0 })
  );

  const animatedValues = useRef(
    Array(12)
      .fill(0)
      .map(() => ({
        credit: new Animated.Value(0),
        payment: new Animated.Value(0),
      }))
  ).current;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const displayMonths = months;

  const maxValue = useMemo(() => {
    const combined = [...creditData, ...paymentData];
    const max = Math.max(...combined, 0);
    return max > 0 ? max : 1000;
  }, [creditData, paymentData]);

  const getBarHeight = (value) =>
    (value / maxValue) * (CHART_HEIGHT - 40);

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${Math.round(amount)}`;
  };

  useEffect(() => {
    displayMonths.forEach((_, index) => {
      Animated.parallel([
        Animated.spring(animatedValues[index].credit, {
          toValue: getBarHeight(creditData[index] || 0),
          useNativeDriver: false,
        }),
        Animated.spring(animatedValues[index].payment, {
          toValue: getBarHeight(paymentData[index] || 0),
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [creditData, paymentData]);

  // 🔥 Auto-scroll to the current month
  useEffect(() => {
    if (!scrollRef.current) return;

    const currentMonthIndex = new Date().getMonth(); // 0 - 11
    const xOffset =
      currentMonthIndex * BAR_GROUP_WIDTH - width / 2 + BAR_GROUP_WIDTH;

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, xOffset),
        animated: true,
      });
    }, 300);
  }, []);

  const onChartTouchOutside = () => {
    setActiveIndex(null);
    setActiveType(null);
  };

  return (
    <View
      style={[
        styles.outerContainer,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.headerIcon}
          >
            <Ionicons name="trending-up" size={IconSizes.medium} color="#fff" />
          </LinearGradient>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            Monthly Trends
          </Text>
        </View>

        {/* Year Controls */}
        <View style={styles.yearSelector}>
          <TouchableOpacity
            onPress={() => onYearChange(selectedYear - 1)}
            disabled={!availableYears.includes(selectedYear - 1)}
            style={[styles.yearButton, { backgroundColor: theme.colors.background }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.yearText, { color: theme.colors.text }]}>
            {selectedYear}
          </Text>

          <TouchableOpacity
            onPress={() => onYearChange(selectedYear + 1)}
            disabled={!availableYears.includes(selectedYear + 1)}
            style={[styles.yearButton, { backgroundColor: theme.colors.background }]}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.legendDot} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Credit Given
          </Text>
        </View>

        <View style={styles.legendItem}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.legendDot} />
          <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
            Payments Received
          </Text>
        </View>
      </View>

      {/* MAIN CHART */}
      <View style={styles.chartRow}>
        {/* Y AXIS */}
        <View style={styles.yAxis}>
          <Text style={[styles.yAxisLabel, { color: theme.colors.textTertiary }]}>
            {formatAmount(maxValue)}
          </Text>
          <Text style={[styles.yAxisLabel, { color: theme.colors.textTertiary }]}>
            {formatAmount(maxValue / 2)}
          </Text>
          <Text style={[styles.yAxisLabel, { color: theme.colors.textTertiary }]}>
            ₹0
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={1}
          onPress={onChartTouchOutside}
          style={styles.scrollTouch}
        >
          <ScrollView
            ref={scrollRef}  // 🔥 added
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: CHART_SCROLL_WIDTH }}
          >
            <View style={[styles.barsContainer, { width: CHART_SCROLL_WIDTH }]}>
              {displayMonths.map((month, index) => (
                <View
                  key={month}
                  style={[styles.barGroup, { width: BAR_GROUP_WIDTH }]}
                >
                  {/* BUBBLE */}
                  {activeIndex === index && (
                    <View
                      key={`bubble-${index}`}
                      style={[
                        styles.valueBubble,
                        {
                          bottom:
                            activeType === 'CREDIT'
                              ? barHeights[index].credit + 25
                              : barHeights[index].payment + 25,
                        },
                      ]}
                    >
                      <Text style={styles.valueText}>
                        {activeType === 'CREDIT'
                          ? formatAmount(creditData[index] || 0)
                          : formatAmount(paymentData[index] || 0)}
                      </Text>

                      <View style={styles.bubbleArrow} />
                    </View>
                  )}

                  {/* TWO BARS */}
                  <View style={styles.bars}>
                    {/* CREDIT */}
                    <TouchableOpacity
                      style={styles.barWrapper}
                      onPress={() => {
                        setActiveIndex(index);
                        setActiveType('CREDIT');
                      }}
                    >
                      <Animated.View
                        onLayout={(e) => {
                          const h = e.nativeEvent.layout.height;
                          setBarHeights((prev) => {
                            const m = [...prev];
                            m[index] = { ...m[index], credit: h };
                            return m;
                          });
                        }}
                        style={[
                          styles.barContainer,
                          { height: animatedValues[index].credit },
                        ]}
                      >
                        <LinearGradient
                          colors={['#f87171', '#ef4444', '#dc2626']}
                          style={styles.barGradient}
                        />
                      </Animated.View>
                    </TouchableOpacity>

                    {/* PAYMENT */}
                    <TouchableOpacity
                      style={styles.barWrapper}
                      onPress={() => {
                        setActiveIndex(index);
                        setActiveType('PAYMENT');
                      }}
                    >
                      <Animated.View
                        onLayout={(e) => {
                          const h = e.nativeEvent.layout.height;
                          setBarHeights((prev) => {
                            const m = [...prev];
                            m[index] = { ...m[index], payment: h };
                            return m;
                          });
                        }}
                        style={[
                          styles.barContainer,
                          { height: animatedValues[index].payment },
                        ]}
                      >
                        <LinearGradient
                          colors={['#34d399', '#10b981', '#059669']}
                          style={styles.barGradient}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.monthLabel, { color: theme.colors.textSecondary }]}>
                    {month}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: BorderRadius.xlarge,
    padding: Spacing.lg,
    borderWidth: 1,
    height: 400,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#1e293b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 5,
      },
    }),
  },

  chartRow: {
  flexDirection: 'row',
  height: CHART_HEIGHT + 30,   // ← extra space for bubble
  paddingTop: 1,              // ← ensures bubble stays inside chart
  marginTop: Spacing.lg,
},


  yAxis: {
    width: 55,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
    paddingTop: 40,
    paddingBottom: 20,
  },

  yAxisLabel: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    textAlign: 'right',
  },

  scrollTouch: { flex: 1 },

  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  barGroup: {
    alignItems: 'center',
    flexShrink: 0,
  },

  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },

  barWrapper: {
    width: BAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  barContainer: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: 'hidden',
    minHeight: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  barGradient: {
    flex: 1,
    width: '100%',
  },

  valueBubble: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -25 }],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 70,
  },

  bubbleArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111827',
  },

  valueText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  headerIcon: {
    width: IconSizes.xlarge,
    height: IconSizes.xlarge,
    borderRadius: IconSizes.xlarge / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: { fontSize: FontSizes.xlarge, fontWeight: '700' },

  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  yearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  yearText: {
    fontSize: FontSizes.large,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },

  legendDot: { width: 14, height: 14, borderRadius: 7 },

  legendText: {
    fontSize: FontSizes.small,
    fontWeight: '600',
  },

  monthLabel: {
    fontSize: FontSizes.small,
    fontWeight: '600',
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
});
