import { useEffect } from "react";
import { useLocation } from "wouter";

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/construction": "Construction Oversight",
  "/deals": "Deal Intelligence",
  "/settings": "Settings",
};

export function useDocumentTitle(customTitle?: string) {
  const [location] = useLocation();

  useEffect(() => {
    const baseTitle = "Aya";
    const pageTitle = customTitle || pageTitles[location] || "Dashboard";
    document.title = `${pageTitle} | ${baseTitle}`;

    return () => {
      document.title = baseTitle;
    };
  }, [location, customTitle]);
}

// Utility to set title imperatively
export function setDocumentTitle(title: string) {
  document.title = `${title} | Aya`;
}
