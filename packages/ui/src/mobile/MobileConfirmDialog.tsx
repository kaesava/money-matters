import { Alert } from 'react-native';
import { t } from '@money-matters/i18n';

export interface MobileConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function showMobileConfirm({
  title,
  message,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
  onConfirm,
  onCancel,
}: MobileConfirmOptions): void {
  const resolvedCancel = cancelText || cancelLabel || t('modals.discardChanges.cancel') || 'Cancel';
  const resolvedConfirm = confirmText || confirmLabel || (isDestructive ? t('modals.discardChanges.discard') || 'Confirm' : 'Confirm');

  Alert.alert(
    title,
    message,
    [
      {
        text: resolvedCancel,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: resolvedConfirm,
        style: isDestructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ],
    { cancelable: true, onDismiss: onCancel }
  );
}

export default showMobileConfirm;
