# ТЗ: Компонент RussiaMap (SVG + GeoJSON) для 1С-Битрикс

## Цель
Разработать React-компонент `RussiaMap.tsx` — интерактивную карту представителей компании по регионам РФ. Реализация на **SVG + GeoJSON** без зависимости от Yandex Maps API.

## Основные требования
- Однотонная карта регионов РФ (белая заливка, тонкая серая обводка)
- При наведении регион выделяется (темная заливка)
- Обязательная поддержка новых регионов: ДНР, ЛНР, Херсонская, Запорожская области
- Представители назначаются на федеральные округа (1 или несколько) или на конкретные регионы
- К одному округу может быть привязано несколько представителей
- Клик на регион показывает список представителей этого округа
- Поддержка zoom и drag (масштабирование и перетаскивание)

## Технологический стек

- **React 18+** — основной фреймворк
- **TypeScript** — типизация
- **SVG** — отрисовка карты (без canvas)
- **react-zoom-pan-pinch** — zoom и drag
- **GeoJSON** — данные границ регионов (`russia-regions.geojson`)
- **Tailwind CSS** — стилизация UI

**НЕ используем:**
- Yandex Maps API
- Google Maps
- Leaflet
- Любые картографические API

## Технические требования

### 1. Загрузка данных

**Источник границ регионов:** `/public/data/russia-regions.geojson`

```typescript
// Вариант 1: Импорт при сборке (рекомендуется для небольших файлов)
import russiaGeoJson from '../data/russia-regions.json';

// Вариант 2: Загрузка через fetch (для больших файлов)
const [geoJson, setGeoJson] = useState<GeoJSON | null>(null);

useEffect(() => {
  fetch('/data/russia-regions.geojson')
    .then(res => res.json())
    .then(data => setGeoJson(data))
    .catch(err => setLoadError('Не удалось загрузить карту'));
}, []);
```

### 2. Конвертация GeoJSON в SVG

**КРИТИЧЕСКИ ВАЖНО:** GeoJSON координаты `[longitude, latitude]` нужно преобразовать в SVG координаты!

```typescript
// Проекция координат (упрощенная Меркатора)
function projectPoint(lon: number, lat: number): [number, number] {
  // Границы карты России примерно: lon 19-180, lat 41-82
  // Приводим к viewBox 0-1000 x 0-600

  // Смещение и масштаб для России
  const minLon = 19;
  const maxLon = 180;
  const minLat = 41;
  const maxLat = 82;

  const x = ((lon - minLon) / (maxLon - minLon)) * 1000;

  // Для широты используем проекцию Меркатора
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const minLatRad = (minLat * Math.PI) / 180;
  const maxLatRad = (maxLat * Math.PI) / 180;
  const minMercN = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
  const maxMercN = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));

  const y = 600 - ((mercN - minMercN) / (maxMercN - minMercN)) * 600;

  return [x, y];
}

// Конвертация координат полигона в SVG path
function polygonToPath(coordinates: number[][][]): string {
  return coordinates
    .map((ring) => {
      const points = ring.map(([lon, lat]) => {
        const [x, y] = projectPoint(lon, lat);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      return `M${points.join('L')}Z`;
    })
    .join(' ');
}

// Для MultiPolygon (несколько полигонов)
function multiPolygonToPath(coordinates: number[][][][]): string {
  return coordinates.map(polygon => polygonToPath(polygon)).join(' ');
}

// Универсальная функция
function geometryToPath(geometry: GeoJSONGeometry): string {
  if (geometry.type === 'Polygon') {
    return polygonToPath(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return multiPolygonToPath(geometry.coordinates);
  }
  return '';
}
```

### 3. Компонент региона

```typescript
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
  onClick
}) => {
  const pathD = useMemo(() => geometryToPath(feature.geometry), [feature]);

  // Стили
  const isActive = isHovered || isSelected;
  const fill = isActive ? '#111217' : '#ffffff';
  const stroke = isActive ? '#111217' : '#DEE2E3';

  return (
    <path
      d={pathD}
      fill={fill}
      stroke={stroke}
      strokeWidth={0.5}
      style={{
        cursor: 'pointer',
        transition: 'fill 0.2s ease, stroke 0.2s ease'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
};
```

### 4. Основной компонент карты

```typescript
import React, { useState, useMemo, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface RussiaMapProps {
  representatives: Representative[];
  onRegionClick: (region: Region) => void;
  onHover: (regionId: string | null) => void;
  theme: AppTheme;
  selectedRegionId: string | null;
}

const RussiaMap: React.FC<RussiaMapProps> = ({
  representatives,
  onRegionClick,
  onHover,
  theme,
  selectedRegionId
}) => {
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Обработчик движения мыши для тултипа
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // Получить регион по имени из GeoJSON
  const getRegionByName = useCallback((name: string) => {
    return RUSSIA_REGIONS.find(r => r.name === name);
  }, []);

  return (
    <div
      className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden border shadow-inner"
      style={{ backgroundColor: theme.background, borderColor: theme.accent }}
      onMouseMove={handleMouseMove}
    >
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
            {russiaGeoJson.features.map((feature) => {
              const region = getRegionByName(feature.properties.name);
              if (!region) return null;

              return (
                <RegionPath
                  key={region.id}
                  feature={feature}
                  region={region}
                  isHovered={hoveredRegionId === region.id}
                  isSelected={selectedRegionId === region.id}
                  onMouseEnter={() => {
                    setHoveredRegionId(region.id);
                    onHover(region.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredRegionId(null);
                    onHover(null);
                  }}
                  onClick={() => onRegionClick(region)}
                />
              );
            })}

            {/* Fallback регионы (если нет в GeoJSON) */}
            {Object.entries(FALLBACK_REGIONS).map(([regionId, data]) => {
              // Пропустить если уже есть в GeoJSON
              const existsInGeoJson = russiaGeoJson.features.some(
                f => getRegionByName(f.properties.name)?.id === regionId
              );
              if (existsInGeoJson) return null;

              const region = RUSSIA_REGIONS.find(r => r.id === regionId);
              if (!region) return null;

              return (
                <FallbackRegion
                  key={regionId}
                  regionId={regionId}
                  region={region}
                  center={data.center}
                  isHovered={hoveredRegionId === regionId}
                  isSelected={selectedRegionId === regionId}
                  onMouseEnter={() => {
                    setHoveredRegionId(regionId);
                    onHover(regionId);
                  }}
                  onMouseLeave={() => {
                    setHoveredRegionId(null);
                    onHover(null);
                  }}
                  onClick={() => onRegionClick(region)}
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
          theme={theme}
        />
      )}
    </div>
  );
};
```

### 5. Данные и типы

**Регионы РФ (constants.tsx):**
```typescript
export interface Region {
  id: string;      // 'RU-MOW'
  name: string;    // 'Москва'
  info: string;    // 'ЦФО' - код федерального округа
  path: string;    // Не используется в SVG версии
}

export const RUSSIA_REGIONS: Region[] = [
  { id: 'RU-MOW', name: 'Москва', info: 'ЦФО', path: '' },
  { id: 'RU-SPE', name: 'Санкт-Петербург', info: 'СЗФО', path: '' },
  // ... всего 85+ регионов
  // Новые регионы (обязательно!)
  { id: 'RU-DPR', name: 'Донецкая Народная Республика', info: 'ЮФО', path: '' },
  { id: 'RU-LPR', name: 'Луганская Народная Республика', info: 'ЮФО', path: '' },
  { id: 'RU-ZPR', name: 'Запорожская область', info: 'ЮФО', path: '' },
  { id: 'RU-KHE', name: 'Херсонская область', info: 'ЮФО', path: '' },
];
```

**Федеральные округа:**
```typescript
export interface FederalDistrict {
  id: string;    // 'ЦФО'
  name: string;  // 'Центральный федеральный округ'
}

export const FEDERAL_DISTRICTS: FederalDistrict[] = [
  { id: 'ЦФО', name: 'Центральный федеральный округ' },
  { id: 'СЗФО', name: 'Северо-Западный федеральный округ' },
  { id: 'ЮФО', name: 'Южный федеральный округ' },
  { id: 'СКФО', name: 'Северо-Кавказский федеральный округ' },
  { id: 'ПФО', name: 'Приволжский федеральный округ' },
  { id: 'УФО', name: 'Уральский федеральный округ' },
  { id: 'СФО', name: 'Сибирский федеральный округ' },
  { id: 'ДФО', name: 'Дальневосточный федеральный округ' }
];
```

**Представители из Битрикс:**
```typescript
interface Representative {
  id: number;
  name: string;
  position: string;
  phone: string;
  email: string;
  regionId: string | string[]; // МОЖЕТ БЫТЬ МАССИВОМ!
  activity?: string[];
  workingHours?: string;
  photo?: string;
}

// Пример данных:
window.bitrixMapData = [
  {
    id: 1,
    name: 'Иванов Иван',
    position: 'Региональный менеджер',
    phone: '+7 (495) 123-45-67',
    email: 'ivanov@company.ru',
    regionId: ['ЦФО', 'СЗФО'] // Работает в двух федеральных округах
  },
  {
    id: 2,
    name: 'Петров Петр',
    position: 'Менеджер',
    phone: '+7 (812) 987-65-43',
    email: 'petrov@company.ru',
    regionId: 'RU-SPE' // Работает только в Санкт-Петербурге
  }
];
```

### 6. Логика сопоставления регионов

**Главное правило:** Если у представителя указан код федерального округа, он отображается во ВСЕХ регионах этого округа.

```typescript
// utils.ts
export function isRepresentativeInRegion(rep: Representative, regionId: string): boolean {
  const regionIds = Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId];

  // 1. Прямое совпадение ID региона
  if (regionIds.some(id => normalizeRegionId(id) === normalizeRegionId(regionId))) {
    return true;
  }

  // 2. Проверка принадлежности региона к федеральному округу
  const region = RUSSIA_REGIONS.find(r => normalizeRegionId(r.id) === normalizeRegionId(regionId));
  if (!region) return false;

  // region.info содержит код федерального округа
  return regionIds.includes(region.info);
}

export function getRepresentativesForRegion(
  representatives: Representative[],
  regionId: string
): Representative[] {
  return representatives.filter(rep => isRepresentativeInRegion(rep, regionId));
}

// Нормализация ID (Битрикс может использовать RF-*, мы используем RU-*)
function normalizeRegionId(id: string): string {
  return id.replace(/^RF-/, 'RU-');
}
```

**Примеры:**
- `regionId: ['ЦФО']` → виден в Москве, Московской обл., Белгородской обл. и т.д.
- `regionId: 'RU-MOW'` → виден только в Москве
- `regionId: ['ЦФО', 'RU-SPE']` → виден во всех регионах ЦФО + Санкт-Петербург

### 7. Fallback для новых регионов

Если регионы отсутствуют в GeoJSON:

```typescript
// Координаты центров [longitude, latitude]
const FALLBACK_REGIONS: Record<string, { center: [number, number]; name: string }> = {
  'RU-DPR': { center: [37.8, 48.0], name: 'Донецкая Народная Республика' },
  'RU-LPR': { center: [39.3, 48.6], name: 'Луганская Народная Республика' },
  'RU-ZPR': { center: [35.2, 47.8], name: 'Запорожская область' },
  'RU-KHE': { center: [32.6, 46.6], name: 'Херсонская область' }
};

// Компонент fallback региона
const FallbackRegion: React.FC<{
  regionId: string;
  region: Region;
  center: [number, number];
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}> = ({ center, isHovered, isSelected, onMouseEnter, onMouseLeave, onClick }) => {
  const [x, y] = projectPoint(center[0], center[1]);
  const isActive = isHovered || isSelected;

  return (
    <circle
      cx={x}
      cy={y}
      r={8}
      fill={isActive ? '#111217' : '#ffffff'}
      stroke={isActive ? '#111217' : '#DEE2E3'}
      strokeWidth={1}
      style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
};
```

### 8. Визуальный стиль (НЕ МЕНЯТЬ!)

```typescript
// Цвета
const COLORS = {
  normal: {
    fill: '#ffffff',
    stroke: '#DEE2E3'  // светло-серая обводка
  },
  hover: {
    fill: '#111217',   // почти черный
    stroke: '#111217'
  },
  selected: {
    fill: '#111217',
    stroke: '#111217'
  }
};

// SVG стили
const PATH_STYLE = {
  strokeWidth: 0.5,
  cursor: 'pointer',
  transition: 'fill 0.2s ease, stroke 0.2s ease'
};
```

### 9. Тултип при наведении

```tsx
interface RegionTooltipProps {
  regionId: string;
  representatives: Representative[];
  mousePos: { x: number; y: number };
  theme: AppTheme;
}

const RegionTooltip: React.FC<RegionTooltipProps> = ({
  regionId,
  representatives,
  mousePos,
  theme
}) => {
  const region = RUSSIA_REGIONS.find(r => r.id === regionId);
  const repsInRegion = getRepresentativesForRegion(representatives, regionId);
  const hasReps = repsInRegion.length > 0;

  if (!region) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none bg-white border shadow-2xl rounded-2xl p-4 min-w-[220px] animate-in fade-in zoom-in duration-200"
      style={{
        left: mousePos.x + 20,
        top: mousePos.y - 40,
        borderColor: theme.accent
      }}
    >
      <div className="text-sm font-black text-slate-900 leading-tight mb-2">
        {region.name}
      </div>
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${hasReps ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.1em]">
          {hasReps
            ? `${repsInRegion.length} представител${getPluralForm(repsInRegion.length)}`
            : 'Нет офиса'}
        </span>
      </div>
    </div>
  );
};

// Склонение слова "представитель"
function getPluralForm(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 14) return 'ей';
  if (mod10 === 1) return 'ь';
  if (mod10 >= 2 && mod10 <= 4) return 'я';
  return 'ей';
}
```

### 10. Skeleton Loader

```tsx
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
                animationDuration: '1.5s'
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
```

### 11. Обработка ошибок

```tsx
const [loadError, setLoadError] = useState<string | null>(null);

if (loadError) {
  return (
    <div
      className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden border flex items-center justify-center"
      style={{ backgroundColor: theme.background, borderColor: theme.accent }}
    >
      <div className="text-center p-8">
        <div className="text-red-500 font-bold mb-2">Ошибка загрузки карты</div>
        <div className="text-sm text-slate-500">{loadError}</div>
      </div>
    </div>
  );
}
```

## Интеграция с 1С-Битрикс

### Deployment

Собранный файл `dist/script.js` копируется в:
```
/local/components/custom/russia.map/templates/.default/script.js
```

### template.php

```php
<?php if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die(); ?>

<div id="russia-map-root"></div>

<script>
window.bitrixMapData = <?= CUtil::PhpToJSObject($arResult['REPRESENTATIVES']) ?>;
window.bitrixMapConfig = {
  isAdmin: <?= $USER->IsAdmin() ? 'true' : 'false' ?>
};
</script>

<!-- Подключение собранного React-приложения -->
<script src="<?= $templateFolder ?>/script.js"></script>
```

**НЕ НУЖЕН API ключ Yandex Maps!**

## Тестирование

После реализации проверить:

1. **Загрузка карты**
   - Карта загружается без ошибок в консоли
   - Все регионы отображаются корректно

2. **Регионы**
   - Все 85+ регионов отображаются
   - Новые регионы (ДНР, ЛНР, Запорожская, Херсонская) видны

3. **Интерактивность**
   - Hover подсвечивает регион (темная заливка)
   - Тултип появляется и следует за курсором
   - Клик вызывает `onRegionClick` и открывает список представителей

4. **Федеральные округа**
   - Представитель с `regionId: 'ЦФО'` виден во всех регионах ЦФО
   - Массив округов работает: `regionId: ['ЦФО', 'СЗФО']`

5. **Zoom/Drag**
   - Zoom колесиком мыши работает плавно
   - Перетаскивание карты работает
   - Pinch-zoom на мобильных устройствах

6. **Выбранный регион**
   - При клике регион остается подсвеченным
   - При клике на другой регион — переключается

7. **Адаптивность**
   - Карта корректно отображается на разных разрешениях
   - Работает на мобильных устройствах

## Файлы проекта

```
src/
├── components/
│   ├── RussiaMap.tsx       # Основной компонент карты
│   ├── RegionPath.tsx      # Компонент региона (SVG path)
│   ├── FallbackRegion.tsx  # Fallback для новых регионов
│   ├── RegionTooltip.tsx   # Тултип при наведении
│   └── SkeletonLoader.tsx  # Лоадер
├── data/
│   └── russia-regions.json # GeoJSON с границами
├── constants.tsx           # RUSSIA_REGIONS, FEDERAL_DISTRICTS
├── types.ts                # TypeScript типы
├── utils.ts                # Утилиты (isRepresentativeInRegion и т.д.)
└── App.tsx                 # Главный компонент
```

## Внешний вид (Референс)

### Общая структура страницы

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ◎ Представительства                              [КАРТА] [СПИСОК]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────┐   ┌─────────────────────┐  │
│  │                                         │   │    ┌─────────────┐  │  │
│  │              КАРТА РОССИИ               │   │    │             │  │  │
│  │                                         │   │    │  ВЫБЕРИТЕ   │  │  │
│  │         (SVG карта регионов)            │   │    │  РЕГИОН НА  │  │  │
│  │                                         │   │    │   КАРТЕ     │  │  │
│  │                                         │   │    │    ДЛЯ      │  │  │
│  │                                         │   │    │  ПРОСМОТРА  │  │  │
│  │                                         │   │    │  КОНТАКТОВ  │  │  │
│  │                                         │   │    │             │  │  │
│  │                                         │   │    └─────────────┘  │  │
│  └─────────────────────────────────────────┘   └─────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ НАШИ            │  │ ГЕОГРАФИЯ       │  │ НАПРАВЛЕНИЯ РАБОТЫ      │  │
│  │ ПРЕДСТАВИТЕЛИ   │  │ ОХВАТА          │  │                         │  │
│  │                 │  │                 │  │ • Лабораторное    26    │  │
│  │  49             │  │  89             │  │ • Эфферентные      9    │  │
│  │  СОТРУДНИКОВ    │  │  РЕГИОНОВ       │  │ • Служба крови     5    │  │
│  │                 │  │  СУБЪЕКТОВ РФ   │  │ • Госпитальное     3    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Переключатель Карта/Список

- Два режима отображения: **КАРТА** и **СПИСОК**
- Переключатель в правом верхнем углу
- Активная кнопка имеет темный фон (#111217), неактивная — прозрачный

```tsx
interface ViewMode {
  mode: 'map' | 'list';
}

const ViewToggle: React.FC<{
  mode: ViewMode['mode'];
  onChange: (mode: ViewMode['mode']) => void;
}> = ({ mode, onChange }) => (
  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
    <button
      onClick={() => onChange('map')}
      className={`px-4 py-2 text-xs font-bold tracking-wider ${
        mode === 'map'
          ? 'bg-[#111217] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      КАРТА
    </button>
    <button
      onClick={() => onChange('list')}
      className={`px-4 py-2 text-xs font-bold tracking-wider ${
        mode === 'list'
          ? 'bg-[#111217] text-white'
          : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      СПИСОК
    </button>
  </div>
);
```

### Боковая панель контактов

Справа от карты — панель для отображения контактов выбранного региона:

```tsx
// Состояние "не выбран регион"
const EmptyContactPanel: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-3xl p-8">
    <div className="text-center text-slate-400 uppercase text-xs font-bold tracking-wider leading-relaxed">
      Выберите регион на карте для<br />просмотра контактов
    </div>
  </div>
);

// Состояние "выбран регион" — показываем список представителей
const ContactPanel: React.FC<{ representatives: Representative[] }> = ({
  representatives
}) => (
  <div className="flex flex-col gap-4 h-full overflow-y-auto">
    {representatives.map(rep => (
      <RepresentativeCard key={rep.id} representative={rep} />
    ))}
  </div>
);
```

### Режим "Список" (второй скриншот)

При переключении на режим "Список" показывается:

1. **Поле поиска** — поиск по имени представителя
2. **Сетка карточек** — 4 карточки в ряд на десктопе

```tsx
const ListView: React.FC<{ representatives: Representative[] }> = ({
  representatives
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = representatives.filter(rep =>
    rep.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Поле поиска */}
      <input
        type="text"
        placeholder="Поиск по имени..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full px-6 py-4 border border-slate-200 rounded-2xl text-sm"
      />

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(rep => (
          <RepresentativeCard key={rep.id} representative={rep} />
        ))}
      </div>
    </div>
  );
};
```

### Карточка представителя

```tsx
const RepresentativeCard: React.FC<{ representative: Representative }> = ({
  representative: rep
}) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    {/* Аватар и имя */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-xl bg-[#111217] text-white flex items-center justify-center font-bold text-sm">
        {getInitials(rep.name)}
      </div>
      <div className="font-semibold text-slate-900 text-sm leading-tight truncate">
        {rep.name}
      </div>
    </div>

    {/* Контакты */}
    <div className="space-y-2 text-sm">
      {rep.phone && (
        <a href={`tel:${rep.phone}`} className="block text-slate-600 hover:text-slate-900">
          {rep.phone}
        </a>
      )}
      {rep.email && (
        <a href={`mailto:${rep.email}`} className="block text-slate-500 hover:text-slate-900 truncate">
          {rep.email}
        </a>
      )}
    </div>
  </div>
);

// Получить инициалы из имени
function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
```

### Статистические блоки внизу

Три карточки со статистикой:

**Логика данных:**
- **"Наши представители"** — динамическое значение, считается из `representatives.length`
- **"География охвата"** — статическое значение **89 регионов** (всегда)
- **"Направления работы"** — агрегация по полю `activity` у представителей (доп. свойство, указывающее направление работы сотрудника)

```tsx
// Типы направлений работы (из Битрикс)
type ActivityType = 'Лабораторное' | 'Эфферентные методы' | 'Служба крови' | 'Госпитальное';

// Расширенный интерфейс представителя
interface Representative {
  id: number;
  name: string;
  position: string;
  phone: string;
  email: string;
  regionId: string | string[];
  activity?: ActivityType[];  // Направления работы сотрудника
  workingHours?: string;
  photo?: string;
}

// Подсчет представителей по направлениям
function getActivitiesStats(representatives: Representative[]): { name: string; count: number }[] {
  const activityCounts = new Map<string, number>();

  representatives.forEach(rep => {
    if (rep.activity) {
      rep.activity.forEach(act => {
        activityCounts.set(act, (activityCounts.get(act) || 0) + 1);
      });
    }
  });

  return Array.from(activityCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

const StatsSection: React.FC<{ representatives: Representative[] }> = ({
  representatives
}) => {
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
        <div className="grid grid-cols-2 gap-3">
          {activitiesStats.map(activity => (
            <div key={activity.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                <span className="text-sm text-slate-600">{activity.name}</span>
              </div>
              <span className="text-sm text-slate-400">{activity.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Цветовая палитра UI

| Элемент | Цвет |
|---------|------|
| Фон страницы | `#F5F7FA` (светло-серый) |
| Фон карточек | `#FFFFFF` |
| Основной текст | `#111217` |
| Вторичный текст | `#64748B` (slate-500) |
| Метки/заголовки | `#94A3B8` (slate-400) |
| Рамки | `#E2E8F0` (slate-200) |
| Аватар | `#111217` фон, белый текст |
| Активная кнопка | `#111217` фон, белый текст |

### Сообщение об ошибке (из референса)

При ошибке загрузки геометрии показывается красное сообщение:

```tsx
const MapError: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-full">
    <div className="text-center text-red-500 font-bold uppercase text-sm tracking-wide">
      {message}
    </div>
    <div className="text-center text-slate-400 text-xs mt-2">
      Проверьте настройки компонента в административной панели Битрикса
    </div>
  </div>
);
```

## Результат

Полностью рабочий компонент, который:

- Отрисовывает карту через SVG (без внешних API)
- Загружает границы из GeoJSON файла
- Поддерживает федеральные округа и отдельные регионы
- Поддерживает новые регионы РФ (ДНР, ЛНР, Запорожская, Херсонская)
- Имеет плавный zoom и drag
- Корректно работает с данными из Битрикс
- Не требует API ключей
- Легкий и быстрый

## Преимущества SVG подхода

| Критерий | SVG | Yandex Maps API |
|----------|-----|-----------------|
| Размер бандла | ~50KB | ~200KB+ |
| API ключ | Не нужен | Нужен |
| Лимиты запросов | Нет | Есть |
| Контроль стилей | Полный | Ограниченный |
| Новые регионы | Легко добавить | Зависит от Яндекса |
| Офлайн работа | Да | Нет |
