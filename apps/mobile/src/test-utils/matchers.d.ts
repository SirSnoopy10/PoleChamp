// Matchery Reanimated rejestrowane przez `setUpTests()` w jest.setup.ts.
declare namespace jest {
  interface Matchers<R> {
    toHaveAnimatedStyle(style: Record<string, unknown>, config?: { shouldMatchAllProps?: boolean }): R;
  }
}
