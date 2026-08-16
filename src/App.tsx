import { useEffect, useState } from "react";
import SaasDashboard from "./components/SaaSDashboard";
import { platformSettingsApi, type PublicBranding } from "./api/platform-settings.api";

const DEFAULT_BRANDING: PublicBranding = { platformName: "NotaryHub", brandingColor: "#2563EB" };

export default function App() {
  // Real, persisted branding — fetched from the unauthenticated
  // /api/platform-settings/public endpoint so it applies before login too.
  // Falls back to sane defaults if the fetch fails, rather than blocking render.
  const [branding, setBranding] = useState<PublicBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    let cancelled = false;
    platformSettingsApi.getPublicBranding()
      .then(res => {
        if (!cancelled) setBranding(res.branding);
      })
      .catch(err => {
        console.error("[App] Failed to load platform branding, using defaults:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // Apply live: document title + a CSS custom property other components can
  // read (e.g. style={{ color: "var(--brand-color)" }}). Runs whenever
  // branding changes, including the moment a SUPER_ADMIN saves a new value.
  useEffect(() => {
    document.title = branding.platformName;
    document.documentElement.style.setProperty("--brand-color", branding.brandingColor);
  }, [branding]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col justify-between" id="app-root">

      {/* Main Content Workspace */}
      <main className="flex-1 w-full flex flex-col" id="main-content-flow">
        <SaasDashboard />
      </main>

      {/* Clean Swiss/Apple-style Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-5 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand-color)" }}></span>
            <span>{branding.platformName}</span>
          </div>
          <div className="font-sans flex items-center gap-4 text-[11px]">
            <span>© 2026 {branding.platformName}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
