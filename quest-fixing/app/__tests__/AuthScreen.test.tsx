import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthScreen } from '../src/screens/auth/AuthScreen';
import { supabase } from '../src/lib/supabase';

// Mock supabase methods
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

describe('AuthScreen', () => {
  it('renders and signs in with email/password', async () => {
    const onAuthSuccess = jest.fn();

    // Mock successful sign-in
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: { session: {} }, error: null });

    const { getByPlaceholderText, getByText } = render(<AuthScreen onAuthSuccess={onAuthSuccess} />);

    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password');

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalled();
    });
  });

  it('shows error on failed login', async () => {
    const onAuthSuccess = jest.fn();
    (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValue(new Error('Login failed'));

    const { getByPlaceholderText, getByText, findByText } = render(<AuthScreen onAuthSuccess={onAuthSuccess} />);

    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'badpw');

    fireEvent.press(getByText('Sign In'));

    await findByText('Error');
  });
});
