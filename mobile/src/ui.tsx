import { Pressable, StyleSheet, Text } from 'react-native';
export const ink = '#193b39';
export const accent = '#126454';
export function Button({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primary,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text style={{ color: primary ? '#fff' : ink, fontWeight: '600', textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bfd1c9',
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  primary: { backgroundColor: accent, borderColor: accent },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '700', color: ink },
  body: { fontSize: 14, lineHeight: 20, color: '#4f635e' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#adbfba',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: ink,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
