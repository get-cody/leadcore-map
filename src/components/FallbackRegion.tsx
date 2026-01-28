import React from 'react';
import type { Region } from '../types';
import { projectPoint } from '../utils';
import { MAP_COLORS } from '../constants';

interface FallbackRegionProps {
  region: Region;
  center: [number, number];
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const FallbackRegion: React.FC<FallbackRegionProps> = ({
  region,
  center,
  isHovered,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  const [x, y] = projectPoint(center[0], center[1]);
  const isActive = isHovered || isSelected;

  return (
    <circle
      cx={x}
      cy={y}
      r={8}
      fill={isActive ? MAP_COLORS.hover.fill : MAP_COLORS.normal.fill}
      stroke={isActive ? MAP_COLORS.hover.stroke : MAP_COLORS.normal.stroke}
      strokeWidth={1}
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

export default FallbackRegion;
