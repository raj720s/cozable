import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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
import { AnimatedLogo } from '../components/AnimatedLogo';
import { colors, fonts } from '../theme/scanner';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('Rahul Sharma');
  const [email, setEmail] = useState('rahul@company.com');
  const [mobile, setMobile] = useState('+91 98765 43210');
  const [empId, setEmpId] = useState('EMP-40291');
  const [password, setPassword] = useState('password123');
  const [confirmPassword, setConfirmPassword] = useState('password123');
  const [agreed, setAgreed] = useState(true);

  const handleSignup = () => {
    // Usually we would handle signup here
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <AnimatedLogo size={32} />
              <Text style={styles.logoText1}>COLOR</Text>
              <Text style={styles.logoText2}>SWEEP</Text>
            </View>
            <View style={styles.headerRight} />
          </View>

          {/* Titles */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Enroll as kitchen or warehouse operator</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
              />
            </View>

            {/* Work Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WORK EMAIL</Text>
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

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
              />
            </View>

            {/* Employee ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMPLOYEE ID</Text>
              <TextInput
                style={styles.input}
                value={empId}
                onChangeText={setEmpId}
                autoCapitalize="characters"
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>PASSWORD</Text>
                <Text style={styles.hintText}>Min 8 characters</Text>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <Text style={styles.successHintText}>Matches ✓</Text>
              </View>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor={colors.muted}
                selectionColor={colors.primary}
              />
            </View>

            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                {agreed && <Text style={styles.checkIcon}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and HACCP Food Safety Protocols
              </Text>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity onPress={handleSignup} activeOpacity={0.9} style={styles.buttonWrapper}>
              <LinearGradient
                colors={['#10B981', '#3B82F6', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.gradientBtnText}>CREATE ACCOUNT →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.linkText} onPress={() => router.replace('/')}>Login</Text>
            </Text>
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 34,
    fontFamily: fonts.sansMd,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981', // Green dot
  },
  logoText1: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  logoText2: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: '#3B82F6', // Blue
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#9CA3AF',
  },
  form: {
    gap: 20,
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
    color: '#D1D5DB', // Lighter grey for labels
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hintText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: '#9CA3AF',
  },
  successHintText: {
    fontFamily: fonts.sansMd,
    fontSize: 11,
    color: '#10B981', // Green
  },
  input: {
    backgroundColor: '#161A23',
    borderWidth: 1,
    borderColor: '#262A36',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
    color: '#FFFFFF',
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
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
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  linkText: {
    color: '#06B6D4', // Cyan/blue
    fontFamily: fonts.sansMd,
  },
  buttonWrapper: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden', // to clip gradient to rounded corners
  },
  gradientBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#262A36',
    paddingTop: 24,
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#9CA3AF',
  },
});
