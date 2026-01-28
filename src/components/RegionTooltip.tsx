import React from 'react';
import type { Representative } from '../types';
import { getRepresentativesForRegion, getPluralForm, findRegionById } from '../utils';

interface RegionTooltipProps {
  regionId: string;
  representatives: Representative[];
  mousePos: { x: number; y: number };
}

const RegionTooltip: React.FC<RegionTooltipProps> = ({
  regionId,
  representatives,
  mousePos,
}) => {
  const region = findRegionById(regionId);
  const repsInRegion = getRepresentativesForRegion(representatives, regionId);
  const hasReps = repsInRegion.length > 0;

  if (!region) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 min-w-[220px]"
      style={{
        left: mousePos.x + 20,
        top: mousePos.y - 40,
      }}
    >
      <div className="text-sm font-black text-slate-900 leading-tight mb-2">
        {region.name}
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            hasReps ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
          }`}
        />
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">
          {hasReps
            ? `${repsInRegion.length} представител${getPluralForm(repsInRegion.length)}`
            : 'Нет офиса'}
        </span>
      </div>
    </div>
  );
};

export default RegionTooltip;
