import React from 'react';
import type { Representative } from '../types';
import { getRepresentativesForRegion, findRegionById } from '../utils';
import RepresentativeCard from './RepresentativeCard';

interface ContactPanelProps {
  selectedRegionId: string | null;
  representatives: Representative[];
}

const ContactPanel: React.FC<ContactPanelProps> = ({
  selectedRegionId,
  representatives,
}) => {
  // Состояние "не выбран регион"
  if (!selectedRegionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[150px] border-2 border-dashed border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-8">
        <div className="text-center text-slate-400 uppercase text-[10px] md:text-xs font-bold tracking-wider leading-relaxed">
          Выберите регион на карте для
          <br />
          просмотра контактов
        </div>
      </div>
    );
  }

  const region = findRegionById(selectedRegionId);
  const repsInRegion = getRepresentativesForRegion(representatives, selectedRegionId);

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок с названием региона */}
      {region && (
        <div className="mb-2 md:mb-3 pb-2 md:pb-3 border-b border-slate-100 flex items-baseline justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm md:text-base leading-tight">{region.name}</h3>
          <span className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider flex-shrink-0">
            {region.info}
          </span>
        </div>
      )}

      {/* Список представителей */}
      {repsInRegion.length > 0 ? (
        <div className="flex flex-col gap-3 md:gap-4 overflow-y-auto flex-1 min-h-0 pr-2 -mr-2">
          {repsInRegion.map(rep => (
            <RepresentativeCard key={rep.id} representative={rep} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[100px]">
          <div className="text-center text-slate-400 text-xs md:text-sm">
            Нет представителей в данном регионе
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactPanel;
