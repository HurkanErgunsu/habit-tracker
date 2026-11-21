import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppColors } from '@/hooks/use-app-colors';
import { useAppStrings } from '@/hooks/use-app-strings';

export function isValidTimeString(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false;
  }

  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

type ProfileTimeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  inputAccessoryViewID?: string;
};

export function ProfileTimeEditor({
  value,
  onChange,
  inputAccessoryViewID,
}: ProfileTimeEditorProps) {
  const colors = useAppColors();
  const t = useAppStrings();
  const [draftText, setDraftText] = useState(value);

  useEffect(() => {
    setDraftText(value);
  }, [value]);

  function handleTextChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;

    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }

    setDraftText(formatted);

    if (isValidTimeString(formatted)) {
      onChange(formatted);
    }
  }

  return (
    <View style={styles.keyboardEditor}>
      <TextInput
        value={draftText}
        onChangeText={handleTextChange}
        placeholder={t.screens.profile.timePlaceholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        autoFocus
        maxLength={5}
        inputAccessoryViewID={inputAccessoryViewID}
        style={[styles.timeInput, { color: colors.text }]}
      />
      <Text style={[styles.keyboardHint, { color: colors.textMuted }]}>{t.screens.profile.timeHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardEditor: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  timeInput: {
    minWidth: 140,
    fontSize: 40,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 1,
  },
  keyboardHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
});
