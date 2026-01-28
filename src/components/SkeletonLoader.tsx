import React from 'react';

const SkeletonLoader: React.FC = () => (
  <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm">
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100" />

      <div className="absolute inset-0 p-8">
        <div className="grid grid-cols-4 gap-4 h-full">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-200 rounded-lg animate-pulse"
              style={{
                animationDelay: `${i * 50}ms`,
                animationDuration: '1.5s',
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="w-24 h-3 bg-slate-200 rounded animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader;
