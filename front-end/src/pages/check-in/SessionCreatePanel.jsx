import { useState } from 'react';
import { Button, ErrorState, Panel, TextInput } from '../../components/ui';
import {
  buildEventTimeRangeError,
  formatDateTimeInputRange,
  getEventTimeBounds,
} from '../../utils/dateUtils';

const SessionCreatePanel = ({ canManage, event, eventId, sessionForm, setSessionForm, createSessionMutation }) => {
  const [fieldErrors, setFieldErrors] = useState({});
  const { startInput: eventStartInput, endInput: eventEndInput } = getEventTimeBounds(event);
  const eventTimeRangeLabel = formatDateTimeInputRange(eventStartInput, eventEndInput);

  const updateSessionForm = (field, value) => {
    if (createSessionMutation.error) {
      createSessionMutation.reset();
    }
    setFieldErrors((old) => ({ ...old, [field]: '', ...(field === 'startsAt' || field === 'endsAt' ? { startsAt: '', endsAt: '' } : {}) }));
    setSessionForm((old) => ({ ...old, [field]: value }));
  };

  const handleSubmit = (eventSubmit) => {
    eventSubmit.preventDefault();
    const validationErrors = validateSessionForm(sessionForm, eventStartInput, eventEndInput);
    if (hasFieldErrors(validationErrors)) {
      setFieldErrors(validationErrors);
      return;
    }
    createSessionMutation.mutate({ eventId, payload: sessionForm });
  };

  const apiFieldErrors = mapSessionApiErrorToFieldErrors(createSessionMutation.error);
  const displayFieldErrors = { ...apiFieldErrors, ...fieldErrors };
  const generalSessionError = createSessionMutation.error && !hasFieldErrors(apiFieldErrors);

  return (
  <Panel className="p-5">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Session</p>
      <h3 className="mt-1 text-lg font-black text-slate-950">Tạo session</h3>
    </div>

    {canManage && (
      <form
        noValidate
        className="mt-4 grid gap-3 border-t border-slate-100 pt-4"
        onSubmit={handleSubmit}
      >
        <TextInput
          icon={null}
          value={sessionForm.name}
          placeholder="Tên session"
          onChange={(eventChange) => updateSessionForm('name', eventChange.target.value)}
          className={displayFieldErrors.name ? invalidInputClassName : ''}
        />
        <FieldError message={displayFieldErrors.name} />
        <TextInput
          icon={null}
          value={sessionForm.location}
          placeholder="Cổng / vị trí"
          onChange={(eventChange) => updateSessionForm('location', eventChange.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <TextInput
              icon={null}
              type="datetime-local"
              value={sessionForm.startsAt}
              aria-label="Bắt đầu"
              min={eventStartInput}
              max={eventEndInput}
              onChange={(eventChange) => updateSessionForm('startsAt', eventChange.target.value)}
              className={displayFieldErrors.startsAt ? invalidInputClassName : ''}
            />
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Sự kiện: {eventTimeRangeLabel}
            </p>
            <FieldError message={displayFieldErrors.startsAt} />
          </div>
          <div>
            <TextInput
              icon={null}
              type="datetime-local"
              value={sessionForm.endsAt}
              aria-label="Kết thúc"
              min={sessionForm.startsAt || eventStartInput}
              max={eventEndInput}
              onChange={(eventChange) => updateSessionForm('endsAt', eventChange.target.value)}
              className={displayFieldErrors.endsAt ? invalidInputClassName : ''}
            />
            <FieldError message={displayFieldErrors.endsAt} />
          </div>
        </div>
        <Button type="submit" disabled={!sessionForm.name.trim() || createSessionMutation.isPending}>
          Tạo session
        </Button>
      </form>
    )}

    {!canManage && (
      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
        Bạn không có quyền tạo session.
      </p>
    )}

    {generalSessionError && (
      <div className="mt-4">
        <ErrorState error={createSessionMutation.error} title="Không tạo được session" />
      </div>
    )}
  </Panel>
  );
};

const validateSessionForm = (form, eventStartInput, eventEndInput) => {
  const errors = {};
  if (!form.name.trim()) {
    errors.name = 'Vui lòng nhập tên session.';
  }
  if (!form.startsAt || !form.endsAt) {
    if (!form.startsAt) {
      errors.startsAt = 'Vui lòng chọn thời gian bắt đầu session.';
    }
    if (!form.endsAt) {
      errors.endsAt = 'Vui lòng chọn thời gian kết thúc session.';
    }
    return errors;
  }
  if (form.endsAt <= form.startsAt) {
    errors.endsAt = 'Thời gian kết thúc session phải sau thời gian bắt đầu.';
  }
  if (eventStartInput && form.startsAt < eventStartInput) {
    errors.startsAt = buildEventTimeRangeError('Thời gian bắt đầu session', eventStartInput, eventEndInput);
  }
  if (eventEndInput && form.endsAt > eventEndInput) {
    errors.endsAt = buildEventTimeRangeError('Thời gian kết thúc session', eventStartInput, eventEndInput);
  }
  return errors;
};

const getErrorMessage = (error) => error?.userMessage || error?.message || '';

const hasFieldErrors = (errors) => Object.values(errors || {}).some(Boolean);

const mapSessionApiErrorToFieldErrors = (error) => {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  const errors = {};
  if (!message) {
    return errors;
  }
  if (normalized.includes('tên') || normalized.includes('name')) {
    errors.name = message;
  }
  if (normalized.includes('bắt đầu') || normalized.includes('startsat') || normalized.includes('start')) {
    errors.startsAt = message;
  }
  if (normalized.includes('kết thúc') || normalized.includes('endsat') || normalized.includes('end')) {
    errors.endsAt = message;
  }
  return errors;
};

const invalidInputClassName = 'border-red-300 bg-red-50/70 focus:border-red-400 focus:ring-red-100';

const FieldError = ({ message }) => (
  message ? <p className="mt-1 text-xs font-semibold text-red-600">{message}</p> : null
);

export default SessionCreatePanel;
