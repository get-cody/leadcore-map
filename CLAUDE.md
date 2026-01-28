# CLAUDE.md

Руководство для Claude Code при работе с проектом Russia-Map-GeoJSON.

## О проекте

React-компонент интерактивной карты представителей компании по регионам РФ для 1С-Битрикс. Использует **SVG + GeoJSON** для отображения границ регионов. Без зависимости от Yandex Maps API.

## Технологический стек

- **React 18+** — основной фреймворк
- **TypeScript** — типизация
- **SVG** — отрисовка карты
- **react-zoom-pan-pinch** — zoom и drag
- **GeoJSON** — данные границ регионов
- **Tailwind CSS** — стилизация UI

## Критические правила разработки

### 1. Структура компонента карты

```typescript
import React, { useState, useMemo, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Region, Representative, AppTheme } from '../types';
import { RUSSIA_REGIONS } from '../constants';
import { getRepresentativesForRegion } from '../utils';

// GeoJSON загружается при сборке или через fetch
import russiaGeoJson from '../data/russia-regions.json';

interface RussiaMapProps {
  representatives: Representative[];
  onRegionClick: (region: Region) => void;
  onHover: (regionId: string | null) => void;
  theme: AppTheme;
  selectedRegionId: string | null;
}
```

### 2. Конвертация GeoJSON в SVG path

**КРИТИЧЕСКИ ВАЖНО:** GeoJSON координаты `[lon, lat]` нужно преобразовать в SVG координаты!

```typescript
// Проекция Меркатора для преобразования координат
function projectPoint(lon: number, lat: number): [number, number] {
  // Простая проекция для России
  const x = (lon + 180) * (800 / 360);
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = 400 - (800 * mercN) / (2 * Math.PI);
  return [x, y];
}

// Конвертация GeoJSON координат в SVG path
function geoJsonToSvgPath(coordinates: number[][][]): string {
  return coordinates
    .map((ring) => {
      const points = ring.map(([lon, lat]) => {
        const [x, y] = projectPoint(lon, lat);
        return `${x},${y}`;
      });
      return `M${points.join('L')}Z`;
    })
    .join(' ');
}

// Для MultiPolygon
function multiPolygonToSvgPath(coordinates: number[][][][]): string {
  return coordinates
    .map((polygon) => geoJsonToSvgPath(polygon))
    .join(' ');
}
```

### 3. Отрисовка регионов

```typescript
const RegionPath: React.FC<{
  feature: GeoJSONFeature;
  region: Region;
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  theme: AppTheme;
}> = ({ feature, region, isHovered, isSelected, onMouseEnter, onMouseLeave, onClick, theme }) => {
  const pathD = useMemo(() => {
    if (feature.geometry.type === 'Polygon') {
      return geoJsonToSvgPath(feature.geometry.coordinates);
    } else if (feature.geometry.type === 'MultiPolygon') {
      return multiPolygonToSvgPath(feature.geometry.coordinates);
    }
    return '';
  }, [feature]);

  const fillColor = isHovered || isSelected ? '#111217' : '#ffffff';
  const strokeColor = isHovered || isSelected ? '#111217' : '#DEE2E3';

  return (
    <path
      d={pathD}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={0.5}
      style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.2s' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
};
```

### 4. Zoom и Drag с react-zoom-pan-pinch

```typescript
const RussiaMap: React.FC<RussiaMapProps> = ({
  representatives,
  onRegionClick,
  onHover,
  theme,
  selectedRegionId
}) => {
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  return (
    <div className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden border"
         style={{ backgroundColor: theme.background, borderColor: theme.accent }}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <svg
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            {russiaGeoJson.features.map((feature) => {
              const region = RUSSIA_REGIONS.find(r => r.name === feature.properties.name);
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
                  theme={theme}
                />
              );
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>

      {/* Tooltip */}
      {hoveredRegionId && <HoverTooltip regionId={hoveredRegionId} />}
    </div>
  );
};
```

### 5. Федеральные округа - логика сопоставления

Представители могут быть назначены на:
- Конкретный регион: `regionId: 'RU-MOW'`
- Федеральный округ: `regionId: 'ЦФО'`
- Несколько округов: `regionId: ['ЦФО', 'СЗФО']`

```typescript
// ✅ Правильная проверка (из utils.ts)
function isRepresentativeInRegion(rep: Representative, regionId: string): boolean {
  const regionIds = Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId];

  // 1. Прямое совпадение
  if (regionIds.some(id => normalizeRegionId(id) === normalizeRegionId(regionId))) {
    return true;
  }

  // 2. Проверка федерального округа
  const region = RUSSIA_REGIONS.find(r => normalizeRegionId(r.id) === normalizeRegionId(regionId));
  if (!region) return false;

  // region.info содержит код округа (например, 'ЦФО')
  return regionIds.includes(region.info);
}

// Примеры:
// Rep с regionId: 'ЦФО' -> виден во ВСЕХ регионах ЦФО
// Rep с regionId: ['ЦФО', 'СЗФО'] -> виден во всех регионах обоих округов
// Rep с regionId: 'RU-MOW' -> виден только в Москве
```

### 6. Новые регионы РФ - обязательная поддержка

**ВСЕГДА включать эти 4 региона:**

```typescript
const NEW_REGIONS = {
  'RU-DPR': 'Донецкая Народная Республика',
  'RU-LPR': 'Луганская Народная Республика',
  'RU-ZPR': 'Запорожская область',
  'RU-KHE': 'Херсонская область'
};

// Если нет в GeoJSON - добавить как круги/точки
const FALLBACK_REGIONS: Record<string, { center: [number, number]; name: string }> = {
  'RU-DPR': { center: [37.8, 48.0], name: 'Донецкая Народная Республика' },
  'RU-LPR': { center: [39.3, 48.6], name: 'Луганская Народная Республика' },
  'RU-ZPR': { center: [35.2, 47.8], name: 'Запорожская область' },
  'RU-KHE': { center: [32.6, 46.6], name: 'Херсонская область' }
};

// Отрисовка fallback региона как круга
const FallbackRegion: React.FC<{ regionId: string; ... }> = ({ regionId, ... }) => {
  const data = FALLBACK_REGIONS[regionId];
  const [x, y] = projectPoint(data.center[0], data.center[1]);

  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill={isHovered || isSelected ? '#111217' : '#ffffff'}
      stroke={isHovered || isSelected ? '#111217' : '#DEE2E3'}
      strokeWidth={0.5}
      style={{ cursor: 'pointer' }}
      onMouseEnter={...}
      onMouseLeave={...}
      onClick={...}
    />
  );
};
```

## Структура данных

### Регионы (constants.tsx)

```typescript
export const RUSSIA_REGIONS: Region[] = [
  { id: 'RU-MOW', name: 'Москва', info: 'ЦФО', path: '' },
  { id: 'RU-SPE', name: 'Санкт-Петербург', info: 'СЗФО', path: '' },
  // ... всего 85+ регионов
  { id: 'RU-DPR', name: 'Донецкая Народная Республика', info: 'ЮФО', path: '' },
  { id: 'RU-LPR', name: 'Луганская Народная Республика', info: 'ЮФО', path: '' },
  { id: 'RU-ZPR', name: 'Запорожская область', info: 'ЮФО', path: '' },
  { id: 'RU-KHE', name: 'Херсонская область', info: 'ЮФО', path: '' },
];

export const FEDERAL_DISTRICTS: FederalDistrict[] = [
  { id: 'ЦФО', name: 'Центральный федеральный округ' },
  { id: 'СЗФО', name: 'Северо-Западный федеральный округ' },
  { id: 'ЮФО', name: 'Южный федеральный округ' },
  { id: 'СКФО', name: 'Северо-Кавказский федеральный округ' },
  { id: 'ПФО', name: 'Приволжский федеральный округ' },
  { id: 'УФО', name: 'Уральский федеральный округ' },
  { id: 'СФО', name: 'Сибирский федеральный округ' },
  { id: 'ДФО', name: 'Дальневосточный федеральный округ' },
];
```

### Представители (из Битрикс)

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

// Данные приходят через window.bitrixMapData
declare global {
  interface Window {
    bitrixMapData: Representative[];
    bitrixMapConfig: {
      isAdmin: boolean;
    };
  }
}
```

## Визуальный стиль (НЕ МЕНЯТЬ!)

```typescript
// Цвета состояний
const COLORS = {
  normal: {
    fill: '#ffffff',
    stroke: '#DEE2E3'
  },
  hover: {
    fill: '#111217',
    stroke: '#111217'
  },
  selected: {
    fill: '#111217',
    stroke: '#111217'
  }
};

// Стили SVG path
const REGION_STYLE = {
  strokeWidth: 0.5,
  cursor: 'pointer',
  transition: 'fill 0.2s, stroke 0.2s'
};
```

## Тестирование

Перед коммитом проверить:

1. **Загрузка карты**
   - Карта загружается без ошибок в консоли
   - Все регионы отображаются корректно

2. **Регионы**
   - Все регионы отображаются
   - Новые регионы (ДНР, ЛНР, Запорожская, Херсонская) видны

3. **Интерактивность**
   - Hover подсвечивает регион
   - Тултип следует за курсором
   - Клик вызывает `onRegionClick`

4. **Федеральные округа**
   - Представитель с `regionId: 'ЦФО'` виден во ВСЕХ регионах ЦФО
   - Массив округов работает: `regionId: ['ЦФО', 'СЗФО']`

5. **Zoom/Drag**
   - Zoom колесиком работает плавно
   - Перетаскивание карты работает
   - Pinch-zoom на мобильных

6. **Выбранный регион**
   - При клике регион остается подсвеченным
   - При клике на другой регион - переключается

## Git commit правила

```bash
# Формат коммитов
<type>: <subject>

<body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

# Types:
# feat: новая функциональность
# fix: исправление бага
# refactor: рефакторинг без изменения поведения
# chore: сборка, зависимости, конфигурация
# docs: документация
```

## Команды разработки

```bash
# Установка
npm install

# Установка библиотеки для zoom/drag
npm install react-zoom-pan-pinch

# Разработка (localhost:3000)
npm run dev

# Сборка (dist/script.js)
npm run build

# Проверка типов
npx tsc --noEmit
```

## Интеграция с 1С-Битрикс

### Deployment

Собранный файл `dist/script.js` должен быть скопирован в:
```
/local/components/custom/russia.map/templates/.default/script.js
```

### Данные представителей

```php
// В template.php компонента
<script>
window.bitrixMapData = <?= json_encode($arResult['REPRESENTATIVES']) ?>;
</script>
```

**НЕ НУЖЕН API ключ Yandex Maps!**

## Известные проблемы и решения

### Проблема: Регионы отображаются в неправильном месте
**Причина:** Неправильная проекция координат
**Решение:** Проверить функцию `projectPoint()` и viewBox SVG

### Проблема: Представитель не виден в регионе
**Причина:** Не учитывается федеральный округ
**Решение:** Использовать `isRepresentativeInRegion()` из utils.ts

### Проблема: Новые регионы не отображаются
**Причина:** Нет в GeoJSON
**Решение:** Добавить fallback круги через `FALLBACK_REGIONS`

### Проблема: Zoom работает рывками
**Причина:** Настройки react-zoom-pan-pinch
**Решение:** Настроить `wheel.step` и `panning.velocityDisabled`

## Преимущества SVG подхода

- **Легкий** — нет тяжелой библиотеки Yandex Maps (~200KB)
- **Быстрый** — SVG рендерится мгновенно
- **Без API ключа** — не нужна регистрация, нет лимитов
- **Полный контроль** — стили, новые регионы, всё настраивается
- **SEO-friendly** — SVG индексируется поисковиками

## Полезные ссылки

- [react-zoom-pan-pinch](https://www.npmjs.com/package/react-zoom-pan-pinch)
- [GeoJSON Specification](https://geojson.org/)
- [SVG Path Specification](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Контакты

Для вопросов по проекту обращайтесь в Issues на GitHub.
