import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Centralized haptics service that provides optimized feedback for both iOS and Android.
 * Uses Android's performAndroidHapticsAsync for better feedback on Android devices.
 */
export class HapticsService {
  
  /**
   * Light haptic feedback - for simple interactions like button presses
   */
  static async light(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptics light feedback failed:', error);
    }
  }

  /**
   * Medium haptic feedback - for moderate interactions like theme changes
   */
  static async medium(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.warn('Haptics medium feedback failed:', error);
    }
  }

  /**
   * Heavy haptic feedback - for important interactions like long presses
   */
  static async heavy(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error) {
      console.warn('Haptics heavy feedback failed:', error);
    }
  }

  /**
   * Success haptic feedback - for successful operations
   */
  static async success(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.warn('Haptics success feedback failed:', error);
    }
  }

  /**
   * Warning haptic feedback - for warning situations
   */
  static async warning(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.warn('Haptics warning feedback failed:', error);
    }
  }

  /**
   * Error haptic feedback - for error situations
   */
  static async error(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.warn('Haptics error feedback failed:', error);
    }
  }

  /**
   * Toggle ON haptic feedback - for switches/toggles turning on
   */
  static async toggleOn(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_On);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptics toggle on feedback failed:', error);
    }
  }

  /**
   * Toggle OFF haptic feedback - for switches/toggles turning off
   */
  static async toggleOff(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Toggle_Off);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptics toggle off feedback failed:', error);
    }
  }

  /**
   * Selection haptic feedback - for list/grid item selection
   */
  static async selection(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptics selection feedback failed:', error);
    }
  }

  /**
   * Keyboard press haptic feedback - for text input interactions
   */
  static async keyboardPress(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Press);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.warn('Haptics keyboard press feedback failed:', error);
    }
  }

  /**
   * Drag start haptic feedback - when starting drag operations
   */
  static async dragStart(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Drag_Start);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.warn('Haptics drag start feedback failed:', error);
    }
  }

  /**
   * Generic tap haptic feedback - for most tap interactions
   */
  static async tap(): Promise<void> {
    await this.light();
  }

  /**
   * Generic press haptic feedback - for button presses
   */
  static async press(): Promise<void> {
    await this.medium();
  }

  /**
   * Generic long press haptic feedback - for long press interactions
   */
  static async longPress(): Promise<void> {
    await this.heavy();
  }
}