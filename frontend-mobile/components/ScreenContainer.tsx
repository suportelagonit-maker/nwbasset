import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

export default function ScreenContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={[styles.inner, style]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f4efe8',
  },
  content: {
    paddingBottom: 32,
  },
  inner: {
    gap: 16,
    padding: 16,
  },
});
