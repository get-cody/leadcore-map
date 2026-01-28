import React from 'react';
import type { Representative } from '../types';
import { getInitials } from '../utils';

interface RepresentativeCardProps {
  representative: Representative;
}

const RepresentativeCard: React.FC<RepresentativeCardProps> = ({ representative: rep }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    {/* Аватар и имя */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-xl bg-[#111217] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
        {getInitials(rep.name)}
      </div>
      <div className="font-semibold text-slate-900 text-sm leading-tight truncate">
        {rep.name}
      </div>
    </div>

    {/* Контакты */}
    <div className="space-y-2 text-sm">
      {rep.phone && (
        <a
          href={`tel:${rep.phone.replace(/[^\d+]/g, '')}`}
          className="block text-slate-600 hover:text-slate-900 transition-colors"
        >
          {rep.phone}
        </a>
      )}
      {rep.email && (
        <a
          href={`mailto:${rep.email}`}
          className="block text-slate-500 hover:text-slate-900 truncate transition-colors"
        >
          {rep.email}
        </a>
      )}
    </div>
  </div>
);

export default RepresentativeCard;
