import React from "react";
import { ArrowLeft, RefreshCw, Lock, Mail, Key } from "lucide-react";

interface TenantLoginFormProps {
  tenantLogo: string;
  tenantName: string;
  tenantColor: string; // CSS hex color or color string, e.g. "#2563eb" or "#10b981"
  welcomeContext: string;
  usernameOrEmail: string;
  setUsernameOrEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  errorMsg: string | null;
  forgotStatus: string | null;
  setForgotStatus: (val: string | null) => void;
  onBack: () => void;
  success?: boolean;
}

export default function TenantLoginForm({
  tenantLogo,
  tenantName,
  tenantColor,
  welcomeContext,
  usernameOrEmail,
  setUsernameOrEmail,
  password,
  setPassword,
  submitting,
  onSubmit,
  errorMsg,
  forgotStatus,
  setForgotStatus,
  onBack,
  success = false
}: TenantLoginFormProps) {
  // We'll declare standard dynamic inline styling for the primary color branding and faded background
  const containerStyle = {
    "--tenant-primary": tenantColor,
    "--tenant-primary-faded": `${tenantColor}12`, // ~7% opacity for left-side tint
    "--tenant-primary-border": `${tenantColor}33`, // ~20% opacity for border highlight
  } as React.CSSProperties;

  return (
    <div 
      style={containerStyle}
      className="w-full max-w-4xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 animate-fade-in flex flex-col md:flex-row h-auto md:h-[550px]"
      id="tenant-split-login-card"
    >
      {/* LEFT COLUMN: Tenant Branding & Context (50% Width) */}
      <div 
        style={{ backgroundColor: "var(--tenant-primary-faded)" }}
        className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 transition-colors duration-500 text-left relative overflow-hidden"
      >
        {/* Subtle Decorative Backdrop effect */}
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-slate-50 opacity-40 pointer-events-none blur-xl"></div>
        <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-white opacity-60 pointer-events-none blur-2xl"></div>

        {/* Top Segment: Dynamic Logo */}
        <div className="relative z-10">
          <img 
            src={tenantLogo || "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=200&auto=format&fit=crop"} 
            alt={`${tenantName} Logo`}
            referrerPolicy="no-referrer"
            className="h-10 w-auto object-contain rounded-lg shadow-xs filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-transform duration-300 hover:scale-[103%]"
            onError={(e) => {
              // Fallback if Unsplash image fails or is slow to load
              const target = e.target as HTMLImageElement;
              target.src = `https://placehold.co/120x40/f1f5f9/0f172a?text=${encodeURIComponent(tenantName)}`;
            }}
          />
        </div>

        {/* Middle Segment: Prominent Context & Message */}
        <div className="my-auto py-8 relative z-10 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            Welcome to {tenantName} Notary Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans max-w-sm">
            {welcomeContext || "Enterprise-grade credential validation & decentralized ledger sync modules."}
          </p>
        </div>

        {/* Bottom Segment: Decorative element / Links */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-450 border-t border-slate-200/50 pt-4">
          <div className="flex items-center gap-1">
            <span 
              style={{ backgroundColor: "var(--tenant-primary)" }}
              className="w-2 h-2 rounded-full animate-pulse"
            ></span>
            <span className="font-mono tracking-wider uppercase font-semibold text-slate-600">Secure Sandboxed Node</span>
          </div>
          {/* Wave Deco Links */}
          <div className="flex gap-2">
            <span className="hover:text-slate-700 cursor-pointer transition">Deeds</span>
            <span className="text-slate-300">•</span>
            <span className="hover:text-slate-700 cursor-pointer transition">Ledger</span>
            <span className="text-slate-300">•</span>
            <span className="hover:text-slate-700 cursor-pointer transition">eIDAS</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Elevated Login Form (50% Width) */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 bg-slate-50/50 flex flex-col justify-between text-left">
        {/* Core Auth Content Holder */}
        <div className="my-auto w-full">
          
          {/* Secondary Elevated Card to house inputs */}
          <div className="w-full bg-white border border-slate-150 rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
            
            {/* Real-time Status Overlay on Login Handshake Success */}
            {success ? (
              <div className="py-12 text-center space-y-4 animate-fade-in flex flex-col items-center">
                <div 
                  style={{ 
                    backgroundColor: "var(--tenant-primary-faded)", 
                    borderColor: "var(--tenant-primary-border)",
                    color: "var(--tenant-primary)"
                  }}
                  className="p-4 rounded-full border animate-bounce"
                >
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Establishing Cryptographic Handshake...</h4>
                  <p className="text-[10.5px] text-slate-400 font-mono mt-1">Authorizing multi-tenant workspace credentials</p>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 font-sans">
                
                {errorMsg && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 text-[11px] p-3 rounded-xl flex items-start gap-2 animate-fade-in">
                    <span className="text-rose-500 font-bold shrink-0">⚠️</span>
                    <span className="leading-normal">{errorMsg}</span>
                  </div>
                )}

                {forgotStatus && (
                  <div className="bg-blue-50 border border-blue-100 text-blue-800 text-[11px] p-3 rounded-xl flex items-start gap-2 animate-fade-in">
                    <span className="text-blue-500 font-bold shrink-0">✓</span>
                    <span className="leading-normal">{forgotStatus}</span>
                  </div>
                )}

                {/* Email Address Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={usernameOrEmail}
                      onChange={(e) => {
                        setUsernameOrEmail(e.target.value);
                        if (forgotStatus) setForgotStatus(null);
                      }}
                      className="w-full bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white pl-10 pr-4 py-3 text-xs font-mono outline-none rounded-xl text-slate-800 transition"
                      placeholder="e.g. admin@bosaso-notary.com"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!usernameOrEmail.trim()) {
                          setForgotStatus("Input your Email payload first to request access recovery hash.");
                        } else {
                          setForgotStatus(`Recovery link sent securely to authorization mailbox.`);
                        }
                      }}
                      className="text-[9.5px] text-slate-400 hover:text-slate-800 font-bold tracking-tight transition"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white pl-10 pr-4 py-3 text-xs font-mono outline-none rounded-xl text-slate-800 transition"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                {/* Submit Action Button with Dynamic Background Color */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: "var(--tenant-primary)" }}
                  className={`w-full py-3.5 px-4 text-white font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 duration-150 active:scale-[99%] shadow-md cursor-pointer hover:brightness-105 transition-all text-center ${submitting ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>

                {/* SSO Authentication Alternatives */}
                <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-450 tracking-tight">Or authenticate using SSO Identity</span>
                  <div className="flex items-center gap-3">
                    {/* Google Alternative */}
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameOrEmail("clerk");
                        setPassword("••••••••••••");
                        setForgotStatus("Transferred workspace handshake vectors via Google Identity protocol.");
                      }}
                      className="w-10 h-10 rounded-full border border-slate-150 bg-white hover:bg-slate-50 hover:shadow-xs active:scale-95 flex items-center justify-center transition cursor-pointer"
                      title="Google Account Auth"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12.2 10.2v3.7h6.8c-.3 1.8-2 5.3-6.8 5.3-4.1 0-7.5-3.4-7.5-7.5s3.4-7.5 7.5-7.5c2.4 0 4 .1 4.9 1l2.9-2.9C18.2 1 15.5 0 12.2 0 5.5 0 0 5.5 0 12.2S5.5 24.4 12.2 24.4c7 0 11.7-4.9 11.7-11.9 0-.8-.1-1.4-.2-2.3H12.2z"/>
                      </svg>
                    </button>

                    {/* Microsoft Alternative */}
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameOrEmail("supervisor");
                        setPassword("••••••••••••");
                        setForgotStatus("Transferred workspace handshake vectors via Azure Active Directory Active Key.");
                      }}
                      className="w-10 h-10 rounded-full border border-slate-150 bg-white hover:bg-slate-50 hover:shadow-xs active:scale-95 flex items-center justify-center transition cursor-pointer"
                      title="Microsoft Microsoft Account Auth"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 23 23">
                        <path fill="#f35022" d="M0 0h11v11H0z"/>
                        <path fill="#80bb0a" d="M12 0h11v11H12z"/>
                        <path fill="#00a1f1" d="M0 12h11v11H0z"/>
                        <path fill="#ffb900" d="M12 12h11v11H12z"/>
                      </svg>
                    </button>

                    {/* Apple Alternative */}
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameOrEmail("admin");
                        setPassword("••••••••••••");
                        setForgotStatus("Authorized session ticket using Apple Passkey authentication.");
                      }}
                      className="w-10 h-10 rounded-full border border-slate-150 bg-white hover:bg-slate-50 hover:shadow-xs active:scale-95 flex items-center justify-center transition cursor-pointer"
                      title="Apple Keychain Secure Auth"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000000">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.51-.62.72-1.16 1.87-1.01 2.98.11.08.2.11.26.11.91 0 2.05-.66 2.7-1.54z"/>
                      </svg>
                    </button>
                  </div>
                </div>

              </form>
            )}

          </div>

        </div>

        {/* Back and return navigation element */}
        <div className="mt-4 pt-2 flex items-center justify-between text-xs text-slate-400 font-sans">
          <button
            type="button"
            onClick={onBack}
            className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 hover:underline cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Gateways</span>
          </button>
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">eIDAS Compliance Verified</span>
        </div>

      </div>
    </div>
  );
}
