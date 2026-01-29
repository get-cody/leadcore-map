import React, { useState, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Representative, GeoJSON, GeoJSONFeature } from '../types';
import { FALLBACK_REGIONS, DEFAULT_THEME } from '../constants';
import { getRegionIdByGeoJSONName } from '../regionMapping';
import { findRegionById } from '../utils';
import RegionPath from './RegionPath';
import FallbackRegion from './FallbackRegion';
import RegionTooltip from './RegionTooltip';
import SkeletonLoader from './SkeletonLoader';

interface RussiaMapProps {
  representatives: Representative[];
  onRegionClick: (regionId: string) => void;
  selectedRegionId: string | null;
  geoJsonData: GeoJSON | null;
  isLoading: boolean;
  error: string | null;
}

const RussiaMap: React.FC<RussiaMapProps> = ({
  representatives,
  onRegionClick,
  selectedRegionId,
  geoJsonData,
  isLoading,
  error,
}) => {
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Обработчик движения мыши для тултипа
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // Получить регион по feature из GeoJSON
  const getRegionByFeature = useCallback((feature: GeoJSONFeature) => {
    const regionId = getRegionIdByGeoJSONName(feature.properties.name);
    if (!regionId) return undefined;
    return findRegionById(regionId);
  }, []);

  // Отслеживание какие регионы уже отрисованы из GeoJSON
  const [renderedRegionIds, setRenderedRegionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (geoJsonData) {
      const ids = new Set<string>();
      geoJsonData.features.forEach(feature => {
        const regionId = getRegionIdByGeoJSONName(feature.properties.name);
        if (regionId) ids.add(regionId);
      });
      setRenderedRegionIds(ids);
    }
  }, [geoJsonData]);

  // Ошибка загрузки
  if (error) {
    return (
      <div
        className="relative w-full h-full min-h-[200px] rounded-2xl md:rounded-3xl overflow-hidden border flex items-center justify-center"
        style={{ backgroundColor: DEFAULT_THEME.background, borderColor: DEFAULT_THEME.accent }}
      >
        <div className="text-center p-4 md:p-8">
          <div className="text-red-500 font-bold uppercase text-xs md:text-sm tracking-wide mb-2">
            {error}
          </div>
          <div className="text-slate-400 text-xs">
            Проверьте настройки компонента в административной панели Битрикса
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full min-h-[250px] rounded-2xl md:rounded-3xl overflow-hidden border shadow-inner"
      style={{ backgroundColor: DEFAULT_THEME.background, borderColor: DEFAULT_THEME.accent }}
      onMouseMove={handleMouseMove}
    >
      {isLoading && <SkeletonLoader />}

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        centerOnInit
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: true }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            {/* Регионы из GeoJSON */}
            {geoJsonData?.features.map((feature) => {
              const region = getRegionByFeature(feature);
              if (!region) return null;

              return (
                <RegionPath
                  key={region.id}
                  feature={feature}
                  region={region}
                  isHovered={hoveredRegionId === region.id}
                  isSelected={selectedRegionId === region.id}
                  onMouseEnter={() => setHoveredRegionId(region.id)}
                  onMouseLeave={() => setHoveredRegionId(null)}
                  onClick={() => onRegionClick(region.id)}
                />
              );
            })}

            {/* Fallback регионы (если нет в GeoJSON) */}
            {Object.entries(FALLBACK_REGIONS).map(([regionId, data]) => {
              // Пропустить если уже отрисован из GeoJSON
              if (renderedRegionIds.has(regionId)) return null;

              const region = findRegionById(regionId);
              if (!region) return null;

              return (
                <FallbackRegion
                  key={regionId}
                  region={region}
                  center={data.center}
                  isHovered={hoveredRegionId === regionId}
                  isSelected={selectedRegionId === regionId}
                  onMouseEnter={() => setHoveredRegionId(regionId)}
                  onMouseLeave={() => setHoveredRegionId(null)}
                  onClick={() => onRegionClick(regionId)}
                />
              );
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>

      {/* Тултип */}
      {hoveredRegionId && (
        <RegionTooltip
          regionId={hoveredRegionId}
          representatives={representatives}
          mousePos={mousePos}
        />
      )}
    </div>
  );
};

export default RussiaMap;
