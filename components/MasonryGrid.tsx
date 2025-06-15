import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SPACING } from '../theme';

interface MasonryGridProps {
  items: React.ReactElement[];
  numColumns?: number;
  spacing?: number;
}

interface ItemLayout {
  index: number;
  height: number;
  component: React.ReactElement;
}

export default function MasonryGrid({
  items,
  numColumns = 2,
  spacing = 0
}: MasonryGridProps) {
  const [itemLayouts, setItemLayouts] = useState<ItemLayout[]>([]);
  const [columns, setColumns] = useState<ItemLayout[][]>([]);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Update screen width on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  // Calculate column width accounting for horizontal margins
  // Total horizontal space needed: left margin + (numColumns-1) * between margins + right margin
  const totalHorizontalMargins = SPACING.margin * (numColumns + 1);
  const availableWidth = screenWidth - totalHorizontalMargins;
  const columnWidth = availableWidth / numColumns;

  // Handle layout measurement for each item
  const handleItemLayout = useCallback((index: number, height: number) => {
    setItemLayouts(prev => {
      const existing = prev.find(item => item.index === index);
      if (existing && existing.height === height) {
        return prev; // No change needed
      }

      if (index >= items.length) return prev;

      const newLayout: ItemLayout = {
        index,
        height,
        component: items[index]
      };

      // Update or add the layout
      const updated = prev.filter(item => item.index !== index);
      return [...updated, newLayout];
    });
  }, [items]);

  // Arrange items into columns when layouts change
  useEffect(() => {
    if (itemLayouts.length === 0) {
      setColumns([]);
      return;
    }

    // Initialize columns
    const newColumns: ItemLayout[][] = Array(numColumns).fill(null).map(() => []);
    const columnHeights: number[] = Array(numColumns).fill(0);

    // Sort items by their original order (maintain the order from items array)
    const sortedLayouts = items
      .map((_, index) => itemLayouts.find(layout => layout.index === index))
      .filter((layout): layout is ItemLayout => layout !== undefined);

    // Place each item in the shortest column
    sortedLayouts.forEach(layout => {
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      newColumns[shortestColumnIndex].push(layout);
      columnHeights[shortestColumnIndex] += layout.height;
    });

    setColumns(newColumns);
  }, [itemLayouts, items, numColumns, spacing]);

  // Wrapper component to measure item height
  const MeasurableItem = React.memo(({ component, index }: { component: React.ReactElement; index: number }) => (
    <View
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        handleItemLayout(index, height);
      }}
      style={{ width: columnWidth }}
    >
      {component}
    </View>
  ));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Render invisible items for measurement */}
      <View style={styles.measurementContainer}>
        {items.map((item, idx) => (
          // @ts-ignore: Allow key on View for list items
          <MeasurableItem key={`measure-${idx}`} component={item} index={idx} />
        ))}
      </View>

      {/* Render visible columns */}
      {columns.length > 0 && (
        <View style={styles.columnsContainer}>
          {columns.map((column, colIdx) => (
            <View
              // @ts-ignore: Allow key on View for list items
              key={`column-${colIdx}`}
              style={[
                styles.column,
                {
                  width: columnWidth,
                  marginLeft: SPACING.margin
                }
              ]}
            >
              {column.map((layout, itemIdx) => (
                <View
                  // @ts-ignore: Allow key on View for list items
                  key={`item-${layout.index}`}
                  style={{
                    marginTop: itemIdx === 0 ? SPACING.margin : 0,
                    marginBottom: SPACING.margin
                  }}
                >
                  {items[layout.index]}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: SPACING.margin,
  },
  measurementContainer: {
    position: 'absolute',
    left: -9999, // Move off-screen for measurement
    top: 0,
    opacity: 0,
  },
  columnsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: SPACING.margin, // Add right margin
  },
  column: {
    flex: 0,
  },
});