"use client";
import React, { createContext, useContext, useState } from 'react';

export interface IconVisibilityContextValue {
  /** Whether decorative UI icons should be rendered across views. Default: true. */
  showIcons: boolean;
  setShowIcons: (show: boolean) => void;
  toggleShowIcons: () => void;
}

const IconVisibilityContext = createContext<IconVisibilityContextValue>({
  showIcons: true,
  setShowIcons: () => {},
  toggleShowIcons: () => {},
});

export interface IconVisibilityProviderProps {
  initialShowIcons?: boolean;
  onChange?: (show: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Universal Icon Visibility Provider for Web and Mobile UIs.
 * Allows users to toggle decorative icon visibility on or off platform-wide.
 */
export const IconVisibilityProvider: React.FC<IconVisibilityProviderProps> = ({
  initialShowIcons = true,
  onChange,
  children,
}) => {
  const [showIcons, setShowIconsState] = useState<boolean>(initialShowIcons);

  const setShowIcons = (show: boolean) => {
    setShowIconsState(show);
    onChange?.(show);
  };

  const toggleShowIcons = () => {
    const next = !showIcons;
    setShowIconsState(next);
    onChange?.(next);
  };

  return (
    <IconVisibilityContext.Provider value={{ showIcons, setShowIcons, toggleShowIcons }}>
      {children}
    </IconVisibilityContext.Provider>
  );
};

export function useIconVisibility(): IconVisibilityContextValue {
  return useContext(IconVisibilityContext);
}
