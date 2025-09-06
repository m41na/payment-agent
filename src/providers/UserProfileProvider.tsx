import React, { createContext, useContext, ReactNode } from 'react';
import { useUserProfile } from '../features/user-profile/hooks/useUserProfile';
import { UserProfileContextType } from '../features/user-profile/types';

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

interface UserProfileProviderProps {
  children: ReactNode;
}

/**
 * User Profile Provider
 * 
 * Provides user profile management capabilities across the application.
 * Integrates with the User Profile feature's hook system to manage
 * personal user information, preferences, and profile settings.
 */
export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const userProfileContext = useUserProfile();

  return (
    <UserProfileContext.Provider value={userProfileContext}>
      {children}
    </UserProfileContext.Provider>
  );
};

/**
 * Hook to access User Profile context
 */
export const useUserProfileContext = (): UserProfileContextType => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfileContext must be used within a UserProfileProvider');
  }
  return context;
};

export default UserProfileProvider;
