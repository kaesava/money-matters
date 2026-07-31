import React from 'react';
export interface NotificationServiceContextValue {
    useRegisterToken: () => () => {
        mutateAsync: (args: {
            platform: 'ios' | 'android';
            token: string;
        }) => Promise<any>;
    };
}
export declare const NotificationServiceProvider: React.FC<{
    value: NotificationServiceContextValue;
    children: React.ReactNode;
}>;
export declare const useNotificationService: () => NotificationServiceContextValue;
//# sourceMappingURL=context.d.ts.map