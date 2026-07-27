import React, { useState, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { TamilText, Button, Card } from '../../components';
import { Colors, Spacing } from '../../theme/tokens';
import { useVoiceTranscribe } from '../../api/hooks/useVoice';
import { useAuthStore } from '../../store/auth.store';
import { PRICING } from '@me-and-mech/shared';

/**
 * PKG-044 — Voice Billing Screen.
 * Audio format per locked spec: WAV, 16kHz, mono (Sarvam AI requirement).
 * expo-av's recording presets don't include a pre-built "16kHz mono WAV"
 * option — HIGH_QUALITY defaults to higher sample rates/stereo. Using a
 * custom RecordingOptions object below to hit the exact spec rather than
 * accepting a preset default and hoping it's close enough.
 */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

export function VoiceBillingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const subscriptionStatus = useAuthStore((s) => s.subscriptionStatus);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const transcribe = useVoiceTranscribe();
  const permissionAsked = useRef(false);

  const isTrialBlocked = subscriptionStatus === 'trial';

  const startRecording = async () => {
    setError(undefined);
    if (!permissionAsked.current) {
      const { status } = await Audio.requestPermissionsAsync();
      permissionAsked.current = true;
      if (status !== 'granted') {
        setError('Microphone அனுமதி தேவை');
        return;
      }
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording: rec } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    setRecording(rec);
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
    setRecording(null);
  };

  const handleTranscribe = async () => {
    if (!audioUri) return;
    setError(undefined);
    try {
      const result = await transcribe.mutateAsync(audioUri);
      // Hand off to NewJobCard with the extracted fields pre-filled —
      // NewJobCardScreen currently expects customer_id/vehicle_id
      // pre-resolved; matching an extracted plate/name to an existing
      // customer/vehicle record is a lookup step, not implemented as a
      // guess here. Flagging: this hand-off currently lands the mechanic
      // on manual customer/vehicle selection with the transcript visible
      // for reference, rather than a fully automatic match.
      navigation.navigate('NewJobCard', undefined);
      // eslint-disable-next-line no-console
      console.log('Voice extraction result (manual customer/vehicle match still required):', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'குரல் அடையாளம் காணப்படவில்லை');
    }
  };

  if (isTrialBlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.trialBlockedContent}>
          <TamilText variant="heading2" style={styles.trialTitle}>
            🎙️ குரல் Billing
          </TamilText>
          <Card style={styles.trialCard}>
            <TamilText variant="body1" style={styles.trialText}>
              Voice billing trial-ல் இல்லை. Subscribe செய்யுங்கள் — ₹{PRICING.monthlyInr}/மாதம்
            </TamilText>
            <Button label="Upgrade Now" onPress={() => navigation.navigate('Profile')} fullWidth style={styles.upgradeButton} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TamilText variant="heading1" style={styles.title}>
          குரல் Billing
        </TamilText>
        <TamilText variant="body2" color={Colors.textSecondary} style={styles.subtitle}>
          பேசுங்கள் — "Engine oil change முன்னூறு ரூபாய்"
        </TamilText>

        <Pressable
          onPress={isRecording ? stopRecording : startRecording}
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        >
          <TamilText variant="heading1" color="#FFFFFF">
            {isRecording ? '⏹' : '🎙️'}
          </TamilText>
        </Pressable>
        <TamilText variant="body2" color={Colors.textSecondary} style={styles.recordLabel}>
          {isRecording ? 'பதிவு செய்கிறது... தட்டி நிறுத்தவும்' : audioUri ? 'மீண்டும் பதிவு செய்ய தட்டவும்' : 'பதிவு தொடங்க தட்டவும்'}
        </TamilText>

        {error ? (
          <TamilText variant="body2" color={Colors.error} style={styles.error}>
            {error}
          </TamilText>
        ) : null}

        {audioUri && !isRecording && (
          <Button label="அனுப்பி Job Card உருவாக்கு" onPress={handleTranscribe} loading={transcribe.isPending} fullWidth style={styles.submitButton} />
        )}

        <Card style={styles.hintCard}>
          <TamilText variant="caption" color={Colors.textSecondary}>
            💡 குரல் தெளிவாக, சத்தமில்லாத இடத்தில் பேசுங்கள். Transcript-ஐ Job Card save பண்ணும் முன் review செய்யுங்கள்.
          </TamilText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, alignItems: 'center' },
  title: { marginBottom: Spacing.xs },
  subtitle: { marginBottom: Spacing.xl, textAlign: 'center' },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  recordButtonActive: { backgroundColor: Colors.error },
  recordLabel: { marginBottom: Spacing.lg, textAlign: 'center' },
  error: { marginBottom: Spacing.md, textAlign: 'center' },
  submitButton: { marginBottom: Spacing.lg },
  hintCard: { width: '100%' },
  trialBlockedContent: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  trialTitle: { textAlign: 'center', marginBottom: Spacing.lg },
  trialCard: { backgroundColor: '#FFF3E0', alignItems: 'center' },
  trialText: { textAlign: 'center', marginBottom: Spacing.md },
  upgradeButton: { marginTop: Spacing.sm },
});
