import React from 'react';
import { View, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { TamilText } from './TamilText';
import { Colors, Spacing, Radius, Typography } from '../theme/tokens';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  error?: string;
  maxLength?: number;
  multiline?: boolean;
}

export function TextField({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, error, maxLength, multiline }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <TamilText variant="body2" color={Colors.textSecondary} style={styles.label}>
        {label}
      </TamilText>
      <TextInput
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        multiline={multiline}
      />
      {error ? (
        <TamilText variant="caption" color={Colors.error} style={styles.errorText}>
          {error}
        </TamilText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs },
  input: {
    ...Typography.body1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    minHeight: 48,
    color: Colors.textPrimary,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: Colors.error },
  errorText: { marginTop: Spacing.xs },
});
