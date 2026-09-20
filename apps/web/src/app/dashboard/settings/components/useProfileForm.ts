import { useState, useEffect, useRef } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";
import { validateMobileNumber, useToast } from "@money-matters/ui/web";
import { useIconVisibility } from "@money-matters/ui";

export interface ProfileFormData {
  displayName: string;
  avatarUrl: string;
  notificationEmail: string;
  phoneCountryCode: string;
  phoneNumber: string;
  timezone: string;
  language: "en";
  locale: string;
  showIcons: boolean;
}

interface UseProfileFormParams {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  currentTimezone: string;
}

export function useProfileForm({ user, currentTimezone }: UseProfileFormParams) {
  const toast = useToast();
  const { setShowIcons: setContextShowIcons } = useIconVisibility();

  const userProfileQuery = trpc.getUserProfile.useQuery();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateProfileMutation = trpc.updateUserProfile.useMutation();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const [data, setData] = useState<ProfileFormData>({
    displayName: user?.name || "",
    avatarUrl: user?.image || "",
    notificationEmail: user?.email || "",
    phoneCountryCode: "+61",
    phoneNumber: "",
    timezone: currentTimezone,
    language: "en",
    locale: "auto",
    showIcons: true,
  });

  const initialRef = useRef<ProfileFormData>(data);

  useEffect(() => {
    if (userProfileQuery.data) {
      const init: ProfileFormData = {
        displayName: userProfileQuery.data.displayName || user?.name || "",
        avatarUrl: userProfileQuery.data.avatarUrl || user?.image || "",
        notificationEmail: userProfileQuery.data.notificationEmail || user?.email || "",
        phoneCountryCode: userProfileQuery.data.phoneCountryCode || "+61",
        phoneNumber: userProfileQuery.data.phoneNumber || "",
        timezone: userProfileQuery.data.timezone || currentTimezone,
        language: "en",
        locale: userPrefQuery.data?.locale || "auto",
        showIcons: userProfileQuery.data.showIcons ?? true,
      };
      setData(init);
      initialRef.current = init;
    }
  }, [userProfileQuery.data, userPrefQuery.data, user, currentTimezone]);

  const isDirty = (Object.keys(data) as Array<keyof ProfileFormData>).some(
    (key) => data[key] !== initialRef.current[key]
  );

  const handleAvatarFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar image size must be under 2MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawImageSrc(event.target.result as string);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCancel = () => (isDirty ? setShowDiscardDialog(true) : setIsEditing(false));

  const handleDiscardConfirm = () => {
    setData(initialRef.current);
    setPhoneError(undefined);
    setShowDiscardDialog(false);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.displayName.trim() || !data.notificationEmail.trim()) {
      toast.error("Name and notification email are required.");
      return;
    }
    const phoneCheck = validateMobileNumber(data.phoneCountryCode, data.phoneNumber);
    if (!phoneCheck.isValid) {
      setPhoneError(phoneCheck.errorMessage);
      toast.error(phoneCheck.errorMessage!);
      return;
    }
    setPhoneError(undefined);
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        displayName: data.displayName.trim(),
        notificationEmail: data.notificationEmail.trim(),
        phoneCountryCode: data.phoneCountryCode,
        phoneNumber: data.phoneNumber.trim(),
        avatarUrl: data.avatarUrl,
      });
      await updatePrefMutation.mutateAsync({
        language: data.language,
        locale: data.locale,
        timezone: data.timezone,
        showIcons: data.showIcons,
      });
      try {
        await authClient.updateUser({
          name: data.displayName.trim(),
          image: data.avatarUrl || undefined,
        });
      } catch (_e) {
        // Silent fallback for authClient
      }
      initialRef.current = { ...data };
      setContextShowIcons(data.showIcons);
      await userProfileQuery.refetch();
      await userPrefQuery.refetch();
      setIsEditing(false);
      toast.success(t("settings.profileSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = data.displayName
    ? data.displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return {
    displayName: data.displayName,
    setDisplayName: (val: string) => setData((prev) => ({ ...prev, displayName: val })),
    notificationEmail: data.notificationEmail,
    setNotificationEmail: (val: string) => setData((prev) => ({ ...prev, notificationEmail: val })),
    phoneCountryCode: data.phoneCountryCode,
    setPhoneCountryCode: (val: string) => setData((prev) => ({ ...prev, phoneCountryCode: val })),
    phoneNumber: data.phoneNumber,
    setPhoneNumber: (val: string) => setData((prev) => ({ ...prev, phoneNumber: val })),
    phoneError,
    timezone: data.timezone,
    setTimezone: (val: string) => setData((prev) => ({ ...prev, timezone: val })),
    language: data.language,
    setLanguageState: (val: "en") => setData((prev) => ({ ...prev, language: val })),
    locale: data.locale,
    setLocale: (val: string) => setData((prev) => ({ ...prev, locale: val })),
    showIcons: data.showIcons,
    setShowIcons: (val: boolean) => setData((prev) => ({ ...prev, showIcons: val })),
    avatarUrl: data.avatarUrl,
    setAvatarUrl: (val: string) => setData((prev) => ({ ...prev, avatarUrl: val })),
    initials,
    isEditing,
    setIsEditing,
    isSaving,
    isDirty,
    showDiscardDialog,
    setShowDiscardDialog,
    isCropperOpen,
    setIsCropperOpen,
    rawImageSrc,
    setRawImageSrc,
    handleAvatarFileSelected,
    handleCancel,
    handleDiscardConfirm,
    handleSave,
  };
}
