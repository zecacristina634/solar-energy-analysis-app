import { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView, Alert, Image,TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import {login, register} from '../../services/authService';
import { colors } from '../../constants/colors';

export default function Login() {
    const router = useRouter();
    const {login: loginStore} = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () =>{
        if(!email || !password){
            Alert.alert('Error', 'All fields are required');
            return;
        }

        try{
            setLoading(true);
            const data = await login(email, password);
            await loginStore(data.token, data.user);
        } catch (err){
            Alert.alert('Error', err.response?.data?.message || 'Login failed');
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
                    <Text style={styles.title}>Welcome back 👋</Text>
                    <Text style={styles.subtitle}>Sign in to monitor your solar system</Text>
                </View>

                <View style={styles.form}>
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

                    <TouchableOpacity
                        style={[styles.btnPrimary, loading && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading 
                        ? <ActivityIndicator color={colors.primaryDark}/>
                        : <Text style={styles.btnText}>Sign In</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={()=> router.push('/auth/Register')}>
                        <Text style={styles.registerLink}>
                            New here?{' '}
                            <Text style={styles.registerLinkAccent}>Create account</Text>
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
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
    borderRadius: 25,
  },
  appSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  headerArea: {
    marginBottom: 28,
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
    marginBottom: 16,
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
  input :{
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  showBtn: {
    color: colors.textSecondary,
    fontSize:12,
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
  registerLink:{
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLinkAccent: {
    color: colors.accent,
  },
});