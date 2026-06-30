export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/;
const EXPLICIT_TIME_ZONE_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const getVietnamPartsFromDate = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((map, part) => {
    map[part.type] = part.value;
    return map;
  }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === '24' ? '00' : parts.hour,
    minute: parts.minute,
  };
};

export const getVietnamDateTimeParts = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = EXPLICIT_TIME_ZONE_PATTERN.test(value) ? null : value.match(LOCAL_DATE_TIME_PATTERN);
    if (match) {
      return {
        year: match[1],
        month: match[2],
        day: match[3],
        hour: match[4] || '00',
        minute: match[5] || '00',
      };
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return getVietnamPartsFromDate(date);
};

export const formatDate = (value, fallback = 'N/A') => {
  const parts = getVietnamDateTimeParts(value);
  if (!parts) return fallback;
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
};

export const formatDateOnly = (value, fallback = 'N/A') => {
  const parts = getVietnamDateTimeParts(value);
  if (!parts) return fallback;
  return `${parts.day}/${parts.month}/${parts.year}`;
};

export const toDateInputValue = (value) => {
  const parts = getVietnamDateTimeParts(value || new Date());
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const toDateTimeLocalValue = (value) => {
  const parts = getVietnamDateTimeParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const getEndOfVietnamDayInput = (value) => {
  const parts = getVietnamDateTimeParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}T23:59`;
};

export const getEventTimeBounds = (event) => {
  const startInput = toDateTimeLocalValue(event?.startTime || event?.eventDate);
  const endInput = event?.endTime
    ? toDateTimeLocalValue(event.endTime)
    : getEndOfVietnamDayInput(event?.startTime || event?.eventDate);
  return { startInput, endInput };
};

export const formatDateTimeInput = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  const [datePart, timePart = ''] = String(value).split('T');
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}/${year} ${timePart.slice(0, 5) || '00:00'}`;
};

export const formatDateTimeInputRange = (startInput, endInput, fallback = 'chưa xác định') => {
  if (!startInput && !endInput) return fallback;
  if (startInput && endInput) {
    const rangeStart = startInput > endInput ? endInput : startInput;
    const rangeEnd = startInput > endInput ? startInput : endInput;
    return `${formatDateTimeInput(rangeStart)} - ${formatDateTimeInput(rangeEnd)}`;
  }
  return startInput ? `Từ ${formatDateTimeInput(startInput)}` : `Đến ${formatDateTimeInput(endInput)}`;
};

export const getEventTimeRangeLabel = (event, fallback = 'chưa xác định') => {
  const { startInput, endInput } = getEventTimeBounds(event);
  return formatDateTimeInputRange(startInput, endInput, fallback);
};

export const buildEventTimeRangeError = (label, startInput, endInput) => (
  `${label} phải nằm trong khoảng hợp lệ (${formatDateTimeInputRange(startInput, endInput)}).`
);

export const isBeforeDateTimeInput = (value, minValue) => Boolean(value && minValue && value < minValue);

export const isAfterDateTimeInput = (value, maxValue) => Boolean(value && maxValue && value > maxValue);

export const nowDateTimeLocalValue = () => toDateTimeLocalValue(new Date());

export const getLaterDateTimeLocal = (...values) => (
  values.filter(Boolean).sort().at(-1) || ''
);

export const getEarlierDateTimeLocal = (...values) => (
  values.filter(Boolean).sort()[0] || ''
);
