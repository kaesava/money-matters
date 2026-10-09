import * as ImagePicker from 'expo-image-picker';
import { useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface UseProfileAvatarPickerProps {
  setAvatarUri: (uri: string | null) => void;
}

export function useProfileAvatarPicker({ setAvatarUri }: UseProfileAvatarPickerProps) {
  const toast = useMobileToast();

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.warning(t('settings.profile.photoLibraryPermissionDenied'), t('common.error'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const approxBytes = asset.fileSize ?? (asset.base64 ? Math.round(asset.base64.length * 0.75) : 0);
      if (approxBytes > 200 * 1024) {
        toast.error(t('settings.profile.avatarSizeError'));
        return;
      }
      const imageBase64 = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setAvatarUri(imageBase64);
    }
  };

  return { handlePickAvatar };
}
