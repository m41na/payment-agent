import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Card, SegmentedButtons } from 'react-native-paper';
import { appTheme } from '../../theme';
import SharedMapView from '../../location-services/components/SharedMapView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ListingMode = 'list' | 'map' | 'calendar';

interface ListingPanelProps<Item> {
  title: string;
  items: Item[];
  modes: ListingMode[];
  mode: ListingMode;
  onModeChange: (m: ListingMode) => void;
  renderItem: ({ item }: { item: Item }) => JSX.Element;
  keyExtractor: (item: Item) => string;
  onSelect?: (item: Item) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  // calendar specific
  selectedDate?: string;
  onDateSelect?: (d: string) => void;
  eventsForSelectedDate?: Item[];
  getMarkedDates?: () => any;
  // search handled by parent; this component is purely display
  currentLocation?: { latitude?: number; longitude?: number } | null;
}



function SimpleCalendarPanel({ markedDates, eventsForSelectedDate, onDateSelect, selectedDate, renderEventItem }: any) {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(() => selectedDate ? new Date(selectedDate) : new Date());

  useEffect(() => {
    if (selectedDate) setCurrentDate(new Date(selectedDate));
  }, [selectedDate]);

  const startOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
  const endOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

  const buildMonthGrid = useCallback(() => {
    const grid: Date[] = [];
    const start = new Date(startOfMonth);
    const startWeekDay = start.getDay(); // 0 (Sun) - 6 (Sat)
    // go back to first day in week
    const first = new Date(start);
    first.setDate(start.getDate() - startWeekDay);
    for (let i = 0; i < 42; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      grid.push(d);
    }
    return grid;
  }, [startOfMonth]);

  const monthGrid = useMemo(() => buildMonthGrid(), [buildMonthGrid]);

  const startOfWeek = useMemo(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    const day = d.getDay();
    const first = new Date(d);
    first.setDate(d.getDate() - day);
    return first;
  }, [selectedDate]);

  const buildWeekDays = useCallback(() => {
    const days: Date[] = [];
    const first = new Date(startOfWeek);
    for (let i = 0; i < 7; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      days.push(d);
    }
    return days;
  }, [startOfWeek]);

  const weekDays = useMemo(() => buildWeekDays(), [buildWeekDays]);

  const goPrev = () => {
    if (view === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
  };
  const goNext = () => {
    if (view === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7));
  };

  const isSameDay = (a?: Date, b?: Date) => {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  const formatKey = (d: Date) => d.toISOString().split('T')[0];

  return (
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={goPrev} style={{ padding: 8, borderRadius: 8, backgroundColor: appTheme.colors.surfaceElevated }}>
            <Text style={{ color: appTheme.colors.textPrimary }}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} style={{ padding: 8, borderRadius: 8, backgroundColor: appTheme.colors.surfaceElevated }}>
            <Text style={{ color: appTheme.colors.textPrimary }}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: '800', color: appTheme.colors.textPrimary }}>{currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
          <Text style={{ color: appTheme.colors.textSecondary }}>{view === 'month' ? 'Month view' : 'Week view'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setView('month')} style={{ padding: 8, borderRadius: 8, backgroundColor: view === 'month' ? appTheme.colors.primary : appTheme.colors.surfaceElevated }}>
            <Text style={{ color: view === 'month' ? appTheme.colors.surface : appTheme.colors.textPrimary }}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('week')} style={{ padding: 8, borderRadius: 8, backgroundColor: view === 'week' ? appTheme.colors.primary : appTheme.colors.surfaceElevated }}>
            <Text style={{ color: view === 'week' ? appTheme.colors.surface : appTheme.colors.textPrimary }}>Week</Text>
          </TouchableOpacity>
        </View>
      </View>

      {view === 'month' ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <Text key={d} style={{ width: `${100/7}%`, textAlign: 'center', color: appTheme.colors.textSecondary, fontWeight: '700' }}>{d}</Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {monthGrid.map(d => {
              const key = formatKey(d);
              const marked = markedDates?.[key];
              const active = selectedDate ? isSameDay(new Date(selectedDate), d) : false;
              const inMonth = d.getMonth() === currentDate.getMonth();
              return (
                <TouchableOpacity key={key} onPress={() => onDateSelect(key)} style={{ width: `${100/7}%`, padding: 6 }}>
                  <View style={{ alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: active ? appTheme.colors.primary : (inMonth ? appTheme.colors.surfaceElevated : 'transparent') }}>
                    <Text style={{ color: active ? appTheme.colors.surface : (inMonth ? appTheme.colors.textPrimary : appTheme.colors.textSecondary), fontWeight: active ? '800' : '600' }}>{d.getDate()}</Text>
                    {marked && <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: marked.dotColor, marginTop: 6 }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            {weekDays.map(d => {
              const key = formatKey(d);
              const marked = markedDates?.[key];
              const active = selectedDate ? isSameDay(new Date(selectedDate), d) : false;
              return (
                <TouchableOpacity key={key} onPress={() => onDateSelect(key)} style={{ width: `${100/7}%`, padding: 6 }}>
                  <View style={{ alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: active ? appTheme.colors.primary : appTheme.colors.surfaceElevated }}>
                    <Text style={{ color: active ? appTheme.colors.surface : appTheme.colors.textPrimary, fontWeight: '700' }}>{d.getDate()}</Text>
                    <Text style={{ color: appTheme.colors.textSecondary, fontSize: 11 }}>{d.toLocaleString(undefined, { weekday: 'short' })}</Text>
                    {marked && <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: marked.dotColor, marginTop: 6 }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        {(!eventsForSelectedDate || eventsForSelectedDate.length === 0) ? (
          <Text style={{ color: appTheme.colors.textSecondary }}>No items for selected date.</Text>
        ) : eventsForSelectedDate.map((ev: any) => (
          <Card key={ev.id} style={{ marginBottom: 8 }} onPress={() => renderEventItem?.(ev)}>
            <Card.Content>
              <Text style={{ fontWeight: '700' }}>{ev.name || ev.title}</Text>
              <Text style={{ color: appTheme.colors.textSecondary }}>{ev.start_date ? new Date(ev.start_date).toLocaleString() : ''}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </View>
  );
}

export default function ListingPanel<Item>(props: ListingPanelProps<Item>) {
  const {
    title,
    items,
    modes,
    mode,
    onModeChange,
    renderItem,
    keyExtractor,
    onSelect,
    isLoading,
    isRefreshing,
    onRefresh,
    onLoadMore,
    selectedDate,
    onDateSelect,
    eventsForSelectedDate,
    getMarkedDates,
    currentLocation,
  } = props;

  const titleRight = `${items.length}`;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSubtitle}>{titleRight} results</Text>
        </View>

        <View style={styles.headerControls}>
          <SegmentedButtons
            value={mode}
            onValueChange={(v) => onModeChange(v as ListingMode)}
            buttons={modes.map(m => ({ value: m, label: m[0].toUpperCase() + m.slice(1) }))}
          />
        </View>
      </View>

      <View style={styles.panelBody}>
        {isLoading ? (
          <ActivityIndicator size="large" color={appTheme.colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={{ flex: 1 }}>
            {mode === 'list' && (
              <FlatList
                data={items as any[]}
                renderItem={renderItem as any}
                keyExtractor={keyExtractor as any}
                onEndReached={onLoadMore}
                onRefresh={onRefresh}
                refreshing={!!isRefreshing}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 12 }}
              />
            )}

            {mode === 'map' && (
              <SharedMapView items={items as any[]} onMarkerPress={onSelect} center={currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null} />
            )}

            {mode === 'calendar' && (
              <SimpleCalendarPanel markedDates={getMarkedDates ? getMarkedDates() : {}} eventsForSelectedDate={eventsForSelectedDate} onDateSelect={onDateSelect} selectedDate={selectedDate} renderEventItem={(ev: any) => onSelect && onSelect(ev)} />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: appTheme.colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: appTheme.colors.textPrimary,
  },
  panelSubtitle: {
    fontSize: 12,
    color: appTheme.colors.textSecondary,
    marginTop: 4,
  },
  headerControls: {
    minWidth: 140,
  },
  panelBody: {
    marginTop: 8,
    flex: 1,
  },
});
