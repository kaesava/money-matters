import React, { createContext, useContext } from 'react';

export interface NotificationServiceContextValue {
  useRegisterToken: () => () => { mutateAsync: (args: { platform: 'ios' | 'android'; token: string }) => Promise<any> };
}

const NotificationServiceContext = createContext<NotificationServiceContextValue | null>(null);

export const NotificationServiceProvider: React.FC<{
  value: NotificationServiceContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <NotificationServiceContext.Provider value={value}>
      {children}
    </NotificationServiceContext.Provider>
  );
};

export const useNotificationService = () => {
  const context = useContext(NotificationServiceContext);
  if (!context) {
    throw new Error('useNotificationService must be used within a NotificationServiceProvider');
  }
  return context;
};
