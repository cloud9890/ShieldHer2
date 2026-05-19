import React from 'react';
import { Pressable, Platform, View } from 'react-native';

/**
 * Hoverable wrapper for React Native Web & Native
 * Automatically applies a 5% scale and 80% opacity when pressed or hovered,
 * complete with CSS transitions and a pointer cursor on Web.
 */
export default function Hoverable({ children, style, onPress, onLongPress, disabled, ...props }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={({ pressed, hovered }) => [
        // Flatten the incoming styles so we can merge them properly
        ...(Array.isArray(style) ? style : [style]),
        {
          transform: [{ scale: (pressed || hovered) && !disabled ? 1.05 : 1 }],
          opacity: (pressed || hovered) && !disabled ? 0.8 : (disabled ? 0.5 : 1),
          ...(Platform.OS === 'web' && {
            transition: 'all 0.2s ease-in-out',
            cursor: disabled ? 'default' : 'pointer',
          }),
        },
      ]}
      {...props}
    >
      {/* If child expects state, we just pass children directly, but normally it's a View */}
      {children}
    </Pressable>
  );
}
