import { useEffect, useState } from "react";

export function usePortalTheme(storageKey: string) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === "dark";
  });

  useEffect(() => {
    localStorage.setItem(storageKey, isDarkMode ? "dark" : "light");
  }, [isDarkMode, storageKey]);

  return [isDarkMode, setIsDarkMode] as const;
}
