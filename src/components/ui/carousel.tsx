import React, { createContext, useContext, useState, useRef, ReactNode, useEffect, Children } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export type CarouselContextType = {
  index: number;
  setIndex: (newIndex: number) => void;
  itemsCount: number;
  setItemsCount: (newItemsCount: number) => void;
  scrollViewRef: React.RefObject<ScrollView>;
  itemWidth: number;
};

const CarouselContext = createContext<CarouselContextType | undefined>(undefined);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) throw new Error('useCarousel must be used within a CarouselProvider');
  return context;
}

export type CarouselProps = {
  children: ReactNode;
  style?: ViewStyle;
  initialIndex?: number;
  onIndexChange?: (newIndex: number) => void;
  itemWidth?: number;
};

export function Carousel({ children, style, initialIndex = 0, onIndexChange, itemWidth = Dimensions.get('window').width * 0.8 }: CarouselProps) {
  const [index, setInternalIndex] = useState(initialIndex);
  const [itemsCount, setItemsCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const setIndex = (newIndex: number) => {
    setInternalIndex(newIndex);
    onIndexChange?.(newIndex);
    scrollViewRef.current?.scrollTo({ x: newIndex * itemWidth, animated: true });
  };

  return (
    <CarouselContext.Provider value={{ index, setIndex, itemsCount, setItemsCount, scrollViewRef, itemWidth }}>
      <View style={[styles.carouselWrapper, style]}>
        {children}
      </View>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { setItemsCount, scrollViewRef, itemWidth, setIndex } = useCarousel();
  const itemsLength = Children.count(children);

  useEffect(() => {
    setItemsCount(itemsLength);
  }, [itemsLength]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / itemWidth);
    setIndex(newIndex);
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled={false}
      snapToInterval={itemWidth}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      contentContainerStyle={[styles.contentContainer, style]}
    >
      {children}
    </ScrollView>
  );
}

export function CarouselItem({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { itemWidth } = useCarousel();
  return (
    <View style={[{ width: itemWidth }, styles.itemWrapper, style]}>
      {children}
    </View>
  );
}

export function CarouselNavigation({ style }: { style?: ViewStyle }) {
  const { index, setIndex, itemsCount } = useCarousel();

  return (
    <View style={[styles.navContainer, style]} pointerEvents="box-none">
      <TouchableOpacity 
        style={[styles.navBtn, index === 0 && styles.navBtnDisabled]} 
        disabled={index === 0} 
        onPress={() => index > 0 && setIndex(index - 1)}
      >
        <ChevronLeft color={index === 0 ? "#666" : "#fff"} size={24} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navBtn, index >= itemsCount - 1 && styles.navBtnDisabled]} 
        disabled={index >= itemsCount - 1} 
        onPress={() => index < itemsCount - 1 && setIndex(index + 1)}
      >
        <ChevronRight color={index >= itemsCount - 1 ? "#666" : "#fff"} size={24} />
      </TouchableOpacity>
    </View>
  );
}

export function CarouselIndicator({ style }: { style?: ViewStyle }) {
  const { index, itemsCount, setIndex } = useCarousel();

  return (
    <View style={[styles.indicatorContainer, style]}>
      {Array.from({ length: itemsCount }, (_, i) => (
        <TouchableOpacity 
          key={i} 
          onPress={() => setIndex(i)} 
          style={[styles.dot, index === i ? styles.dotActive : styles.dotInactive]} 
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  carouselWrapper: { position: 'relative' },
  contentContainer: { alignItems: 'center' },
  itemWrapper: { paddingHorizontal: 4 },
  navContainer: { position: 'absolute', width: '100%', height: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, zIndex: 10 },
  navBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  navBtnDisabled: { opacity: 0.4 },
  indicatorContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: '#8b5cf6' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.2)' }
});
