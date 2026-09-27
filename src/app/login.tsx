import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, images } from '../theme/scanner';

export default function LoginScreen() {
  const [email, setEmail] = useState('demo.operator@colorsweep.io');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  const handleLogin = () => {
    router.replace('/home');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={images.logo} style={styles.logoImage} resizeMode="contain" />
          </View>

          {/* Titles */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.welcomeText}>
              Welcome to Color<Text style={styles.sweepText}>Sweep</Text>
            </Text>
            <Text style={styles.subtitle}>Sign in to start scanning labels</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.inputPassword}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.primary}
                />
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setKeepLoggedIn(!keepLoggedIn)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, keepLoggedIn && styles.checkboxActive]}>
                  {keepLoggedIn && <Text style={styles.checkIcon}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Keep terminal logged in</Text>
              </TouchableOpacity>
              <View style={styles.terminalStatus}>
                <View style={styles.terminalDot} />
                <Text style={styles.terminalText}>Terminal #04</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.signInBtn} onPress={handleLogin} activeOpacity={0.9}>
              <Text style={styles.signInBtnText}>Sign in →</Text>
            </TouchableOpacity>

            <View style={styles.quickAccessRow}>
              <Text style={styles.quickAccessLabel}>Quick Operator Access:</Text>
              <TouchableOpacity style={styles.quickAccessBtn}>
                <Text style={styles.quickAccessBtnIcon}>👆</Text>
                <Text style={styles.quickAccessBtnText}>Touch ID</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAccessBtn}>
                <Text style={styles.quickAccessBtnIcon}>🙂</Text>
                <Text style={styles.quickAccessBtnText}>Face ID</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: '#9CA3AF', marginBottom: 12 }}>
              Don't have an account? <Text style={{ color: '#06B6D4', fontFamily: fonts.sansMd }} onPress={() => router.push('/signup')}>Sign up</Text>
            </Text>
            <Text style={styles.demoText}>
              Demo mode: any valid email and 6+ character password works.
            </Text>
            <View style={styles.footerLinksRow}>
              <TouchableOpacity><Text style={styles.footerLink}>Register Scanner</Text></TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity><Text style={styles.footerLink}>Sensor Calibration</Text></TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity><Text style={styles.footerLink}>Support</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0D14', // Very dark background matching the design
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  // Custom logo recreation using concentric borders
  logoOuterRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: '#3B82F6', // Using solid blue as fallback for gradient ring
    borderTopColor: '#F59E0B',
    borderRightColor: '#EF4444',
    borderBottomColor: '#8B5CF6',
    borderLeftColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDotIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0A0D14',
  },
  logoInnerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sweepText: {
    color: '#3B82F6', // Bright blue
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  card: {
    width: '100%',
    backgroundColor: '#161A23', // Dark navy/grey card
    borderRadius: 16,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: '#262A36',
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  forgotText: {
    fontFamily: fonts.sansMd,
    fontSize: 12,
    color: '#3B82F6',
  },
  input: {
    backgroundColor: '#0A0D14',
    borderWidth: 1,
    borderColor: '#262A36',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
    color: '#FFFFFF',
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0D14',
    borderWidth: 1,
    borderColor: '#262A36',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
  },
  inputPassword: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  showBtn: {
    padding: 8,
  },
  showBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: '#3B82F6',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: '#D1D5DB',
  },
  terminalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  terminalText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.primary,
  },
  signInBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer, // Use theme primary green for login
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  signInBtnText: {
    fontFamily: fonts.sansMd,
    fontSize: 16,
    color: '#003824',
  },
  quickAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  quickAccessLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 4,
  },
  quickAccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0D14',
    borderWidth: 1,
    borderColor: '#262A36',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  quickAccessBtnIcon: {
    fontSize: 14,
  },
  quickAccessBtnText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#D1D5DB',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 20,
  },
  demoText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  footerLink: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#9CA3AF',
  },
  footerDot: {
    color: '#4B5563',
    fontSize: 16,
  },
});
