import { Alert } from 'react-native';
import { t } from '@money-matters/i18n';

export interface MobileConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showMobileConfirm({
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = true,
  onConfirm,
  onCancel,
}: MobileConfirmOptions): void {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText || t('modals.discardChanges.cancel') || 'Cancel',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText || (isDestructive ? t('modals.discardChanges.discard') || 'Confirm' : 'Confirm'),
        style: isDestructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ],
    { cancelable: true, onDismiss: onCancel }
  );
}

export default showMobileConfirm;
