export const EVENT_TYPE_OPTIONS = [
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'COMPETITION', label: 'Cuộc thi' },
  { value: 'SPORTS_TOURNAMENT', label: 'Giải đấu' },
  { value: 'SEMINAR', label: 'Seminar' },
  { value: 'OTHER', label: 'Khác' },
];

const EVENT_TYPE_LABELS = EVENT_TYPE_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {});

export const getEventTypeLabel = (eventType) => {
  if (!eventType) {
    return 'Chưa phân loại';
  }
  return EVENT_TYPE_LABELS[String(eventType).toUpperCase()] || eventType;
};
