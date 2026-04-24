import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavigation,
  CarouselIndicator
} from './carousel';

export function CarouselCustomSizes() {
  return (
    <View style={styles.container}>
      <Carousel>
        <CarouselContent>
          {[1,2,3,4,5,6,7].map(num => (
            <CarouselItem key={num}>
              <View style={styles.slideBox}>
                <Text style={styles.slideText}>{num}</Text>
              </View>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNavigation />
        <CarouselIndicator />
      </Carousel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginVertical: 20
  },
  slideBox: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1e1b4b',
    borderRadius: 16
  },
  slideText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700'
  }
});
