/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    EXPO_PUBLIC_CLERK_DEBUG?: string;
  }
}
