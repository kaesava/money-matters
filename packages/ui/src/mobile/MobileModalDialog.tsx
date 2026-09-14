import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import { showMobileConfirm } from './MobileConfirmDialog';

export interface MobileModalDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isDirty?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function MobileModalDialog({
  visible,
  onClose,
  title,
  subtitle,
  isDirty = false,
  footer,
  children,
}: MobileModalDialogProps) {
  const D = DESIGN_TOKENS;

  const handleRequestClose = () => {
    if (isDirty) {
      showMobileConfirm({
        title: t('modals.unsavedChanges.title', { defaultValue: 'Unsaved Changes' }),
        message: t('modals.unsavedChanges.description', {
          defaultValue: 'You have unsaved changes in this form. Are you sure you want to discard them?',
        }),
        confirmText: t('modals.unsavedChanges.discard', { defaultValue: 'Discard Changes' }),
        cancelText: t('modals.unsavedChanges.keepEditing', { defaultValue: 'Keep Editing' }),
        isDestructive: true,
        onConfirm: onClose,
      });
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={handleRequestClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={D.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Body */}
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {/* Action Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    maxHeight: '85%',
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: D.radius.lg,
    borderTopRightRadius: D.radius.lg,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: D.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: D.colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: D.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 12,
  },
  body: {
    paddingVertical: 14,
    gap: 12,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: D.colors.border,
  },
});
