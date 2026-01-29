import React, { useMemo } from 'react';
import type { Representative } from '../types';
import { getActivitiesStats } from '../utils';

interface StatsSectionProps {
  representatives: Representative[];
}

const StatsSection: React.FC<StatsSectionProps> = ({ representatives }) => {
  const activitiesStats = useMemo(
    () => getActivitiesStats(representatives),
    [representatives]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
      {/* Карточка "Наши представители" — ДИНАМИЧЕСКОЕ */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100">
        <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 md:mb-2">
          Наши представители
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl md:text-4xl font-black text-slate-900">
            {representatives.length}
          </span>
          <span className="text-xs md:text-sm font-semibold text-slate-500">
            сотрудников
          </span>
        </div>
      </div>

      {/* Карточка "География охвата" — СТАТИЧЕСКОЕ (89 регионов) */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100">
        <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 md:mb-2">
          География охвата
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl md:text-4xl font-black text-slate-900">89</span>
          <span className="text-xs md:text-sm font-semibold text-slate-500">
            регионов
          </span>
        </div>
        <div className="text-[10px] md:text-xs text-slate-400 mt-1">субъектов РФ</div>
      </div>

      {/* Карточка "Направления работы" — агрегация по activity */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100 sm:col-span-2 md:col-span-1">
        <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 md:mb-4">
          Направления работы
        </div>
        {activitiesStats.length > 0 ? (
          <div className="flex flex-col gap-2">
            {activitiesStats.map(activity => (
              <div key={activity.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-900 flex-shrink-0" />
                  <span className="text-xs md:text-sm text-slate-600">{activity.name}</span>
                </div>
                <span className="text-xs md:text-sm text-slate-400 ml-2 flex-shrink-0">{activity.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs md:text-sm text-slate-400">Нет данных</div>
        )}
      </div>
    </div>
  );
};

export default StatsSection;
