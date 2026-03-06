export const HUDOverlay = ({ activeModule, isAlertMode, setActiveModule }: any) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[200] flex flex-col justify-between p-10">

      {/* Top Header */}
      <div className="flex justify-center items-start text-center">
        {activeModule && (
          <button
            className="absolute top-10 left-10 bg-black/50 border border-white/20 text-white px-6 py-2.5 rounded-full cursor-pointer font-heading pointer-events-auto transition-all duration-300 backdrop-blur-md hover:bg-white/10 hover:border-white z-[201]"
            onClick={() => setActiveModule(null)}
          >
            ⟵ OVERVIEW
          </button>
        )}

        {/* Only show the big title when no module is active */}
        {!activeModule && (
          <div className="relative">
            <h1 className="font-heading text-4xl m-0 uppercase tracking-[4px]" style={{ textShadow: '0 0 20px rgba(255,76,76,0.6)' }}>
              Audio &amp; Language Analyser
            </h1>
            <div className="text-neutral-400 text-base tracking-[2px] uppercase mt-2.5">
              Spatial Threat Detection Core
            </div>
          </div>
        )}

        <div className="absolute top-10 right-10 px-5 py-2.5 bg-black/60 border border-white/10 rounded-full flex items-center gap-2.5 font-heading text-sm backdrop-blur-sm pointer-events-auto z-[201]">
          <div className={`w-2.5 h-2.5 rounded-full ${isAlertMode ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`}></div>
          {isAlertMode ? "SYSTEM ALERT" : "CORE ONLINE"}
        </div>
      </div>

      {/* Bottom User Guidance */}
      {!activeModule && (
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 font-heading text-white bg-red-900/20 border border-red-500/40 px-6 py-3 rounded-full backdrop-blur-md pointer-events-auto cursor-pointer"
          onClick={() => setActiveModule('upload')}
        >
          Select a spatial module to begin AI emergency analysis
        </div>
      )}

      {isAlertMode && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 font-heading text-white bg-red-600/80 border border-red-500 shadow-[0_0_40px_red] px-6 py-3 rounded-full pointer-events-auto">
          🚨 CRITICAL EVENT DETECTED: Awaiting response procedure
        </div>
      )}
    </div>
  );
}
