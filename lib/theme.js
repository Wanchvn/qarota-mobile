import { useColorScheme } from 'react-native';

export const colors = {
  light: {
    background: '#F5EFE6',
    surface: '#FFFFFF',
    text: '#3E2723',
    textMuted: '#666666',
    border: '#E6E6E6',
    primary: '#C65D3B',
    header: '#3E2723',
    headerText: '#C65D3B',
    
    // Tab Bar
    tabBar: '#FFFFFF',
    tabBarInactive: '#999999',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#F5EFE6',
    textMuted: '#A0A0A0',
    border: '#333333',
    primary: '#C65D3B',
    header: '#000000',
    headerText: '#C65D3B',
    
    // Tab Bar
    tabBar: '#1E1E1E',
    tabBarInactive: '#666666',
  }
};

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}