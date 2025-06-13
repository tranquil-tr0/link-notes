import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SPACING, COLORS } from '../theme';

interface MasonryItem {
  id: string;
  estimatedHeight?: number;
  component: React.ReactElement;
}

interface MasonryGridProps {
  items: MasonryItem[];
  numColumns?: number;
  spacing?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function MasonryGrid({
  items,
  numColumns = 2,
  spacing = SPACING.padding
}: MasonryGridProps) {
  
  // Calculate column width based on screen width, number of columns, and spacing
  const columnWidth = useMemo(() => {
    const totalSpacing = spacing * (numColumns + 1); // spacing between columns + margins
    return (screenWidth - totalSpacing) / numColumns;
  }, [numColumns, spacing]);

  // Distribute items across columns using a simple height-based balancing algorithm
  const columns = useMemo(() => {
    const columnItems: MasonryItem[][] = Array(numColumns).fill(null).map(() => []);
    const columnHeights: number[] = Array(numColumns).fill(0);
    
    items.forEach(item => {
      // Find the column with the least total height
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Add item to the shortest column
      columnItems[shortestColumnIndex].push(item);
      
      // Update column height (use estimated height if provided, otherwise use default)
      const estimatedHeight = item.estimatedHeight || 150; // default height fallback
      columnHeights[shortestColumnIndex] += estimatedHeight + spacing;
    });
    
    return columnItems;
  }, [items, numColumns, spacing]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingHorizontal: spacing }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.grid, { gap: spacing }]}>
        {columns.map((columnItems, columnIndex) => (
          <View
            key={columnIndex}
            style={[styles.column, { width: columnWidth }]}
          >
            {columnItems.map((item, itemIndex) => (
              <View
                key={item.id}
                style={[
                  styles.itemContainer,
                  { marginBottom: itemIndex < columnItems.length - 1 ? spacing : 0 }
                ]}
              >
                {item.component}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: SPACING.bottom,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  itemContainer: {
    width: '100%',
  },
});