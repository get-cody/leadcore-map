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

  // Позиционирование с учетом границ экрана
  const tooltipWidth = 220;
  const tooltipHeight = 80;
  const padding = 16;

  let left = mousePos.x + 20;
  let top = mousePos.y - 40;

  // Проверка выхода за правый край
  if (left + tooltipWidth > window.innerWidth - padding) {
    left = mousePos.x - tooltipWidth - 20;
  }

  // Проверка выхода за нижний край
  if (top + tooltipHeight > window.innerHeight - padding) {
    top = mousePos.y - tooltipHeight - 10;
  }

  // Проверка выхода за верхний край
  if (top < padding) {
    top = padding;
  }

  // Проверка выхода за левый край
  if (left < padding) {
    left = padding;
  }

  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-white border border-slate-200 shadow-2xl rounded-xl md:rounded-2xl p-3 md:p-4 min-w-[180px] md:min-w-[220px]"
      style={{
        left,
        top,
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
