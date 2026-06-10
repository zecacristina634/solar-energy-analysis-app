import { createContext, useContext, useState, useEffect } from 'react';
import { darkTheme, lightTheme } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const colors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem('gosolar_theme');
        if (saved !== null) {
          setIsDark(saved === 'dark');
        }
      } catch (err) {
        console.error('Error loading theme:', err);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      await AsyncStorage.setItem('gosolar_theme', newIsDark ? 'dark' : 'light');
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};