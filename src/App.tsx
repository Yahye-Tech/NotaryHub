import SaasDashboard from "./components/SaaSDashboard";

export default function App() {
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
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>HubDev Legal & Notary Services Ltd.</span>
          </div>
          <div className="font-sans flex items-center gap-4 text-[11px]">
            <span>© 2026 HubDev Notary SaaS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
