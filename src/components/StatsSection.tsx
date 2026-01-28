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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      {/* Карточка "Наши представители" — ДИНАМИЧЕСКОЕ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Наши представители
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">
            {representatives.length}
          </span>
          <span className="text-sm font-semibold text-slate-500">
            сотрудников
          </span>
        </div>
      </div>

      {/* Карточка "География охвата" — СТАТИЧЕСКОЕ (89 регионов) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          География охвата
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900">89</span>
          <span className="text-sm font-semibold text-slate-500">
            регионов
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">субъектов РФ</div>
      </div>

      {/* Карточка "Направления работы" — агрегация по activity */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Направления работы
        </div>
        {activitiesStats.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {activitiesStats.map(activity => (
              <div key={activity.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-900 flex-shrink-0" />
                  <span className="text-sm text-slate-600 truncate">{activity.name}</span>
                </div>
                <span className="text-sm text-slate-400 ml-2">{activity.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Нет данных</div>
        )}
      </div>
    </div>
  );
};

export default StatsSection;
