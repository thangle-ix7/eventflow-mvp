import { useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  buildDateTimeInputValue,
  formatDateForDisplayInput,
  normalizeDateTimeLocalValue,
  splitDateTimeInput,
} from '../utils/dateTimeInputUtils';

const DateTimeInput = ({
  value,
  name,
  onChange,
  onValueChange,
  disabled,
  error,
  className = '',
  inputClassName = '',
  dateClassName = '',
  timeClassName = '',
  pickerClassName = '',
  dateAriaLabel = 'Ngày theo định dạng dd/mm/yyyy',
  datePickerAriaLabel = 'Chọn ngày từ lịch',
  timeAriaLabel = 'Giờ',
  datePlaceholder = 'dd/mm/yyyy',
  layout = 'inline',
}) => {
  const datePickerRef = useRef(null);
  const normalizedValue = useMemo(() => normalizeDateTimeLocalValue(value), [value]);
  const [dateDraft, setDateDraft] = useState(null);
  const { datePart, timePart } = splitDateTimeInput(normalizedValue);
  const committedDate = formatDateForDisplayInput(normalizedValue);
  const displayDate = dateDraft?.source === normalizedValue ? dateDraft.value : committedDate;

  const emitValue = (nextValue) => {
    onValueChange?.(nextValue);
    onChange?.({ target: { name, value: nextValue } });
  };

  const commitDate = (nextDisplayDate, nextTime = timePart) => {
    if (!String(nextDisplayDate || '').trim()) {
      emitValue('');
      return true;
    }

    const nextValue = buildDateTimeInputValue(nextDisplayDate, nextTime);
    if (!nextValue) {
      return false;
    }

    emitValue(nextValue);
    return true;
  };

  const handleDateChange = (event) => {
    const nextDisplayDate = event.target.value;
    setDateDraft({ source: normalizedValue, value: nextDisplayDate });

    if (commitDate(nextDisplayDate)) {
      setDateDraft(null);
    }
  };

  const handleDateBlur = () => {
    if (!dateDraft || commitDate(dateDraft.value)) {
      setDateDraft(null);
    }
  };

  const handleTimeChange = (event) => {
    commitDate(displayDate, event.target.value);
  };

  const effectiveInputClassName = inputClassName || 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
  const effectivePickerClassName = pickerClassName || 'relative flex min-h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-500 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

  const handlePickerChange = (event) => {
    const [year, month, day] = String(event.target.value || '').split('-');
    if (!year || !month || !day) {
      return;
    }

    setDateDraft(null);
    commitDate(`${day}/${month}/${year}`);
  };

  const openDatePicker = () => {
    if (disabled) {
      return;
    }

    const picker = datePickerRef.current;
    if (!picker) {
      return;
    }

    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }

    picker.focus();
    picker.click();
  };

  const gridColumnsClassName = layout === 'stacked' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(140px,auto)]';

  return (
    <div className={`grid ${gridColumnsClassName} gap-2 ${className}`}>
      <div className="relative grid min-w-0 grid-cols-[minmax(128px,1fr)_auto] gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={displayDate}
          onChange={handleDateChange}
          onBlur={handleDateBlur}
          disabled={disabled}
          placeholder={datePlaceholder}
          aria-label={dateAriaLabel}
          aria-invalid={Boolean(error)}
          title={dateAriaLabel}
          className={`${effectiveInputClassName} ${dateClassName}`}
        />
        <button
          type="button"
          onClick={openDatePicker}
          disabled={disabled}
          aria-label={datePickerAriaLabel}
          title={datePickerAriaLabel}
          className={effectivePickerClassName}
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        <input
          ref={datePickerRef}
          type="date"
          value={datePart}
          onChange={handlePickerChange}
          disabled={disabled}
          aria-label={datePickerAriaLabel}
          aria-invalid={Boolean(error)}
          title={datePickerAriaLabel}
          tabIndex={-1}
          className="pointer-events-none absolute bottom-0 right-5 h-px w-px opacity-0"
        />
      </div>
      <input
        type="time"
        value={timePart}
        onChange={handleTimeChange}
        disabled={disabled}
        aria-label={timeAriaLabel}
        aria-invalid={Boolean(error)}
        className={`${effectiveInputClassName} ${timeClassName}`}
      />
    </div>
  );
};

export default DateTimeInput;
