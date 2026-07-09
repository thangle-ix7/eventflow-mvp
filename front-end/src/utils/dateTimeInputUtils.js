const DATE_DISPLAY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATE_TIME_DISPLAY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?$/i;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/;
const TIME_INPUT_PATTERN = /^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i;
const padTwoDigits = (value) => String(value).padStart(2, '0');

export const splitDateTimeInput = (value) => {
  const normalized = normalizeDateTimeLocalValue(value);
  const [datePart = '', timePart = ''] = normalized.split('T');
  return {
    datePart,
    timePart: timePart.slice(0, 5) || '00:00',
  };
};

export const formatDateForDisplayInput = (value) => {
  const { datePart } = splitDateTimeInput(value);
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) {
    return '';
  }
  return `${day}/${month}/${year}`;
};

export const parseDisplayDate = (value) => {
  const match = String(value || '').trim().match(DATE_DISPLAY_PATTERN);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== Number(year)
    || parsed.getMonth() + 1 !== Number(month)
    || parsed.getDate() !== Number(day)
  ) {
    return null;
  }

  return { day, month, year };
};

export const normalizeTimeInput = (value) => {
  const match = String(value || '').trim().match(TIME_INPUT_PATTERN);
  if (!match) {
    return null;
  }

  const [, hour, minute, meridiem] = match;
  let normalizedHour = Number(hour);
  if (Number(minute) > 59) {
    return null;
  }

  if (meridiem) {
    if (normalizedHour < 1 || normalizedHour > 12) {
      return null;
    }
    const upperMeridiem = meridiem.toUpperCase();
    if (upperMeridiem === 'AM') {
      normalizedHour = normalizedHour === 12 ? 0 : normalizedHour;
    } else {
      normalizedHour = normalizedHour === 12 ? 12 : normalizedHour + 12;
    }
  }

  if (normalizedHour > 23) {
    return null;
  }
  return `${padTwoDigits(normalizedHour)}:${minute}`;
};

export const buildDateTimeInputValue = (dateDisplay, timeValue) => {
  const dateParts = parseDisplayDate(dateDisplay);
  const timePart = normalizeTimeInput(timeValue) || '00:00';
  if (!dateParts) {
    return '';
  }

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${timePart}`;
};

export const normalizeDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

  const rawValue = String(value).trim();
  const localMatch = rawValue.match(LOCAL_DATE_TIME_PATTERN);
  if (localMatch) {
    const [, year, month, day, hour = '00', minute = '00'] = localMatch;
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  const displayMatch = rawValue.match(DATE_TIME_DISPLAY_PATTERN);
  if (displayMatch) {
    const [, day, month, year, hour = '00', minute = '00', meridiem = ''] = displayMatch;
    return buildDateTimeInputValue(`${day}/${month}/${year}`, `${hour}:${minute}${meridiem ? ` ${meridiem}` : ''}`);
  }

  return '';
};

export const toDateTimeInputTimestamp = (value) => {
  const normalizedValue = normalizeDateTimeLocalValue(value);
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return Number.NaN;
  }

  const [, year, month, day, hour, minute] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== Number(year)
    || parsed.getMonth() + 1 !== Number(month)
    || parsed.getDate() !== Number(day)
    || parsed.getHours() !== Number(hour)
    || parsed.getMinutes() !== Number(minute)
  ) {
    return Number.NaN;
  }

  return parsed.getTime();
};

export const compareDateTimeInputValues = (left, right) => {
  const leftTime = toDateTimeInputTimestamp(left);
  const rightTime = toDateTimeInputTimestamp(right);
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return null;
  }
  return leftTime - rightTime;
};

export const isBeforeDateTimeValue = (value, minValue) => {
  const comparison = compareDateTimeInputValues(value, minValue);
  return comparison !== null && comparison < 0;
};

export const isAfterDateTimeValue = (value, maxValue) => {
  const comparison = compareDateTimeInputValues(value, maxValue);
  return comparison !== null && comparison > 0;
};

export const isSameDateTimeValue = (left, right) => {
  const comparison = compareDateTimeInputValues(left, right);
  return comparison !== null && comparison === 0;
};

export const isSameOrBeforeDateTimeValue = (value, minValue) => {
  const comparison = compareDateTimeInputValues(value, minValue);
  return comparison !== null && comparison <= 0;
};
