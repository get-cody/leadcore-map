import React, { useMemo } from 'react';
import type { GeoJSONFeature, Region } from '../types';
import { geometryToPath } from '../utils';
import { MAP_COLORS } from '../constants';

interface RegionPathProps {
  feature: GeoJSONFeature;
  region: Region;
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const RegionPath: React.FC<RegionPathProps> = ({
  feature,
  region,
  isHovered,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const pathD = useMemo(() => geometryToPath(feature.geometry), [feature.geometry]);

  const isActive = isHovered || isSelected;
  const fill = isActive ? MAP_COLORS.hover.fill : MAP_COLORS.normal.fill;
  const stroke = isActive ? MAP_COLORS.hover.stroke : MAP_COLORS.normal.stroke;

  return (
    <path
      d={pathD}
      fill={fill}
      stroke={stroke}
      strokeWidth={0.5}
      style={{
        cursor: 'pointer',
        transition: 'fill 0.2s ease, stroke 0.2s ease',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      data-region-id={region.id}
      data-region-name={region.name}
    />
  );
};

export default RegionPath;
