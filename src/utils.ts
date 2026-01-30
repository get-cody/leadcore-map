import type { Representative, GeoJSONGeometry } from './types';
import { RUSSIA_REGIONS } from './constants';

// Нормализация ID региона (Битрикс может использовать RF-*, мы используем RU-*)
export function normalizeRegionId(id: string | null | undefined): string {
  if (!id) return '';
  return id.replace(/^RF-/, 'RU-');
}

// Проверка: представитель работает в данном регионе?
export function isRepresentativeInRegion(rep: Representative, regionId: string): boolean {
  if (!rep.regionId) return false;

  const regionIds = (Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId]).filter(Boolean);
  if (regionIds.length === 0) return false;

  const normalizedRegionId = normalizeRegionId(regionId);
  if (!normalizedRegionId) return false;

  // 1. Прямое совпадение ID региона
  if (regionIds.some(id => normalizeRegionId(id) === normalizedRegionId)) {
    return true;
  }

  // 2. Проверка принадлежности региона к федеральному округу
  const region = RUSSIA_REGIONS.find(r => normalizeRegionId(r.id) === normalizedRegionId);
  if (!region) return false;

  // region.info содержит код федерального округа (например, 'ЦФО')
  return regionIds.includes(region.info);
}

// Получить представителей для региона
export function getRepresentativesForRegion(
  representatives: Representative[],
  regionId: string
): Representative[] {
  return representatives.filter(rep => isRepresentativeInRegion(rep, regionId));
}

// Проекция координат GeoJSON -> SVG (упрощенная Меркатора для России)
export function projectPoint(lon: number, lat: number): [number, number] {
  // Границы карты России: lon 19-180, lat 41-82
  // ViewBox: 0-1000 x 0-600
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

// Конвертация Polygon координат в SVG path
export function polygonToPath(coordinates: number[][][]): string {
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

// Конвертация MultiPolygon координат в SVG path
export function multiPolygonToPath(coordinates: number[][][][]): string {
  return coordinates.map(polygon => polygonToPath(polygon)).join(' ');
}

// Универсальная конвертация геометрии в SVG path
export function geometryToPath(geometry: GeoJSONGeometry): string {
  if (geometry.type === 'Polygon') {
    return polygonToPath(geometry.coordinates as number[][][]);
  } else if (geometry.type === 'MultiPolygon') {
    return multiPolygonToPath(geometry.coordinates as number[][][][]);
  }
  return '';
}

// Получить инициалы из имени
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';
}

// Склонение слова "представитель"
export function getPluralForm(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 14) return 'ей';
  if (mod10 === 1) return 'ь';
  if (mod10 >= 2 && mod10 <= 4) return 'я';
  return 'ей';
}

// Подсчет представителей по направлениям работы
export function getActivitiesStats(representatives: Representative[]): { name: string; count: number }[] {
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

// Найти регион по имени (для сопоставления GeoJSON и constants)
export function findRegionByName(name: string): typeof RUSSIA_REGIONS[0] | undefined {
  // Точное совпадение
  let region = RUSSIA_REGIONS.find(r => r.name === name);
  if (region) return region;

  // Нормализованный поиск (убираем "область", "край" и т.д.)
  const normalizedName = name
    .replace(/\s*(область|край|республика|автономный округ|автономная область)\s*/gi, '')
    .trim()
    .toLowerCase();

  region = RUSSIA_REGIONS.find(r => {
    const normalizedRegionName = r.name
      .replace(/\s*(область|край|республика|автономный округ|автономная область)\s*/gi, '')
      .trim()
      .toLowerCase();
    return normalizedRegionName === normalizedName;
  });

  return region;
}

// Найти регион по ID
export function findRegionById(id: string): typeof RUSSIA_REGIONS[0] | undefined {
  const normalizedId = normalizeRegionId(id);
  return RUSSIA_REGIONS.find(r => normalizeRegionId(r.id) === normalizedId);
}

// Mock данные для разработки
export function getMockRepresentatives(): Representative[] {
  return [
    {
      id: 1,
      name: 'Иванов Иван Иванович',
      position: 'Региональный менеджер',
      phone: '+7 (495) 123-45-67',
      email: 'ivanov@leadcore.ru',
      regionId: ['ЦФО', 'СЗФО'],
      activity: ['Лабораторное', 'Госпитальное'],
    },
    {
      id: 2,
      name: 'Петров Петр Петрович',
      position: 'Менеджер по продажам',
      phone: '+7 (812) 987-65-43',
      email: 'petrov@leadcore.ru',
      regionId: 'RU-SPE',
      activity: ['Эфферентные методы'],
    },
    {
      id: 3,
      name: 'Сидорова Анна Сергеевна',
      position: 'Территориальный менеджер',
      phone: '+7 (863) 111-22-33',
      email: 'sidorova@leadcore.ru',
      regionId: 'ЮФО',
      activity: ['Служба крови', 'Лабораторное'],
    },
    {
      id: 4,
      name: 'Козлов Дмитрий Александрович',
      position: 'Региональный представитель',
      phone: '+7 (383) 444-55-66',
      email: 'kozlov@leadcore.ru',
      regionId: ['СФО', 'УФО'],
      activity: ['Госпитальное'],
    },
    {
      id: 5,
      name: 'Михайлова Елена Викторовна',
      position: 'Менеджер',
      phone: '+7 (423) 777-88-99',
      email: 'mikhailova@leadcore.ru',
      regionId: 'ДФО',
      activity: ['Лабораторное', 'Эфферентные методы'],
    },
  ];
}
