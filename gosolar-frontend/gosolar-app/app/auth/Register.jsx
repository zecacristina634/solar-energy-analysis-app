import { use, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView, Alert, Image,TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { register} from '../../services/authService';
import { colors } from '../../constants/colors';

export default function Register() {
    const router = useRouter();
    const {login: loginStore} = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () =>{
        if(!name || !email || !password || !confirmPassword){
            Alert.alert('Error', 'All fields are required');
            return;
        }

        if(password !== confirmPassword){
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if(password.length < 8){
            Alert.alert('Error',  'Password must be al least 8 characters');
            return;
        }
    
        try{
            setLoading(true);
            const data = await register(name, email, password);
            await loginStore(data.token, data.user);
        } catch (err){
            Alert.alert('Error', err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding': 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoArea}>
                    <Image 
                        source={require('../../assets/images/logo-gosolar2.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appSub}>Solar Energy Monitor</Text>
                </View>

                <View style={styles.headerArea}>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Start monitoring your solar energy system</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>NAME</Text>
                        <View style={[styles.inputBox, name && styles.inputBoxFilled]}>
                            <TextInput
                                style={styles.input}
                                placeholder="Your name"
                                placeholderTextColor={colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize='words'
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL</Text>
                        <View style={[styles.inputBox, email && styles.inputBoxFilled]}>
                            <TextInput
                                style={styles.input}
                                placeholder="email@example.com"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize='none'
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <View style={[styles.inputBox, password && styles.inputBoxFilled]}>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={()=> setShowPassword(!showPassword)}>
                                <Text style={styles.showBtn}>{showPassword ? 'Hide' : 'Show'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CONFIRM PASSWORD</Text>
                        <View style={[
                            styles.inputBox, 
                            confirmPassword && confirmPassword === password && styles.inputBoxFilled,
                            confirmPassword && confirmPassword !== password && styles.inputBoxError
                        ]}>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                            {confirmPassword.length > 0 && (
                                <Text style={confirmPassword === password ? styles.matchOk : styles.matchErr}>
                                    {confirmPassword === password ? '✓' : '✗'}
                                </Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.btnPrimary, loading && styles.btnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading 
                        ? <ActivityIndicator color={colors.primaryDark}/>
                        : <Text style={styles.btnText}>Create account</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={()=> router.push('/auth/Login')}>
                        <Text style={styles.loginLink}>
                            Already have an account?{' '}
                            <Text style={styles.loginLinkAccent}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  scrollContent: {
    flexGrow:1,
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  appSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  headerArea: {
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  form: {
    gap: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label:{
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 1,
  },
  inputBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14, 
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputBoxFilled:{
    borderColor: colors.accent,
  },
  inputBoxError:{
    borderColor: colors.error,
  },
  input :{
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  showBtn: {
    color: colors.textSecondary,
    fontSize:12,
  },
  matchOk: {
    color: colors.accent,
    fontSize: 16,
  },
  matchErr: {
    color: colors.error,
    fontSize: 16,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '500',
  },
  loginLink:{
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLinkAccent: {
    color: colors.accent,
  },
});