import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Printer,
  Save,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import AiSuggestionDetailModal from '../components/AiSuggestionDetailModal';
import {
  Button,
  EmptyState,
  LoadingState,
  MetricCard,
  Panel,
  StatusBadge,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import eventUtilityApi from '../api/eventUtilityApi';
import taskApi from '../api/taskApi';
import ErrorPage from './ErrorPage';
import {
  buildEventTimeRangeError,
  formatDate,
  formatDateOnly,
  formatDateTimeInputRange,
  getEventTimeBounds,
  getVietnamDateTimeParts,
} from '../utils/dateUtils';
import { getEventPermissions } from '../utils/permissionUtils';
import {
  buildDashboardReport,
  exportDashboardCsv,
  exportDashboardJson,
  openPrintableDashboardReport,
} from '../utils/reportExport';
import aiSuggestionApi from '../api/aiSuggestionApi';
import { stripHiddenSuggestionKeys } from '../utils/aiSuggestionUtils';

const PAGE_CONFIG = {
  calendar: {
    title: 'Lịch',
    description: '',
    meta: 'Lịch họp, rehearsal và các mốc vận hành',
    icon: CalendarDays,
  },
  documents: {
    title: 'Tài liệu',
    description: '',
    meta: 'Tài liệu và file đính kèm',
    icon: FileText,
  },
  reports: {
    title: 'Báo cáo',
    description: '',
    meta: 'Tiến độ, report và dữ liệu vận hành',
    icon: TrendingUp,
  },
  settings: {
    title: 'Cài đặt',
    description: '',
    meta: 'Giao diện và ngôn ngữ',
    icon: Settings,
  },
};
const EventUtilityPage = ({ user, onLogout, type }) => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.calendar;
  const [now] = useState(() => Date.now());
  const [calendarDate, setCalendarDate] = useState(() => {
    const queryYear = Number(searchParams.get('year'));
    const queryMonth = Number(searchParams.get('month'));
    if (Number.isInteger(queryYear) && Number.isInteger(queryMonth) && queryMonth >= 1 && queryMonth <= 12) {
      return { year: queryYear, month: queryMonth };
    }

    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const queryYear = Number(searchParams.get('year'));
  const queryMonth = Number(searchParams.get('month'));

  useEffect(() => {
    if (!Number.isInteger(queryYear) || !Number.isInteger(queryMonth) || queryMonth < 1 || queryMonth > 12) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => setCalendarDate((currentDate) => {
      if (currentDate.year === queryYear && currentDate.month === queryMonth) {
        return currentDate;
      }
      return { year: queryYear, month: queryMonth };
    }));

    return () => window.cancelAnimationFrame(frameId);
  }, [queryMonth, queryYear]);
  const reportRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
    };
  }, []);

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });
  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const tasksQuery = useQuery({
    queryKey: ['eventUtilityTasks', eventId],
    queryFn: () => taskApi.getEventTaskPage({ eventId, size: 100, sort: 'deadline', direction: 'asc' }),
    enabled: Boolean(eventId && type === 'reports'),
  });
  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && event && type !== 'documents' && (permissions.canManageDepartments || type === 'reports')),
  });
  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId && event && type !== 'documents' && (permissions.canManageMembers || type === 'reports')),
  });
  const calendarQuery = useQuery({
    queryKey: ['eventCalendar', eventId, calendarDate.year, calendarDate.month],
    queryFn: () => eventUtilityApi.getCalendarMonth({ eventId, ...calendarDate }),
    enabled: Boolean(eventId && type === 'calendar'),
  });
  const documentsQuery = useQuery({
    queryKey: ['eventDocuments', eventId],
    queryFn: () => eventUtilityApi.getDocuments(eventId),
    enabled: Boolean(eventId && type === 'documents'),
  });
  const reportsQuery = useQuery({
    queryKey: ['eventReports', eventId, reportRange.fromDate, reportRange.toDate],
    queryFn: () => eventUtilityApi.getReports({ eventId, ...reportRange }),
    enabled: Boolean(eventId && type === 'reports'),
  });

  const tasks = useMemo(() => tasksQuery.data?.content || [], [tasksQuery.data]);
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const utilityError = calendarQuery.error || documentsQuery.error || reportsQuery.error;
  const utilityLoading = calendarQuery.isLoading || documentsQuery.isLoading || reportsQuery.isLoading;
  const error = eventQuery.error || tasksQuery.error || departmentsQuery.error || membersQuery.error || utilityError;
  const isLoading = eventQuery.isLoading || tasksQuery.isLoading || departmentsQuery.isLoading || membersQuery.isLoading || utilityLoading;

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
    const overdueTasks = tasks.filter((task) => task.deadline && new Date(task.deadline).getTime() < now && task.status !== 'DONE').length;
    const progress = totalTasks ? Math.floor((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, completedTasks, overdueTasks, progress };
  }, [now, tasks]);

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onLogout={onLogout}>
      <div className="space-y-6">
        {isLoading && <LoadingState message={`Đang tải ${config.title.toLowerCase()}...`} />}
        {!isLoading && error && (
          <ErrorPage
            variant="unexpected"
            title={`Không tải được ${config.title.toLowerCase()}`}
            message={error.userMessage || 'EventFlow chưa thể tải dữ liệu trang này. Vui lòng thử lại hoặc quay về trang trước.'}
          />
        )}

        {!isLoading && !error && (
          <>
            {type === 'calendar' && <CalendarContent eventId={eventId} event={event} departments={departments} members={members} calendar={calendarQuery.data} calendarDate={calendarDate} setCalendarDate={setCalendarDate} />}
            {type === 'documents' && <DocumentsContent eventId={eventId} event={event} documents={documentsQuery.data || []} />}
            {type === 'reports' && <ReportsContent event={event} stats={stats} departments={departments} members={members} tasks={tasks} reportsData={reportsQuery.data} reportRange={reportRange} />}
            {type === 'settings' && <SettingsContent />}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const CalendarContent = ({ eventId, event, departments, members, calendar, calendarDate, setCalendarDate }) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const titleInputRef = useRef(null);
  const days = calendar?.days || [];
  const daysByDate = new Map(days.map((day) => [day.date, day]));
  const month = calendar?.month || calendarDate.month;
  const year = calendar?.year || calendarDate.year;
  const eventRange = getEventDateRange(event);
  const eventRangeStart = eventRange.start;
  const eventRangeEnd = eventRange.end;
  const calendarCells = buildCalendarCells(year, month, daysByDate, eventRange);
  const monthItemsCount = days.reduce((total, day) => total + (day.items?.length || 0), 0);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });
  const canGoPrevious = monthIntersectsEventRange(year, month - 1, eventRange);
  const canGoNext = monthIntersectsEventRange(year, month + 1, eventRange);
  const todayKey = toDateKey(new Date());
  const canGoToday = isDateKeyInEventRange(todayKey, eventRange);
  const { startInput, endInput } = getEventTimeBounds(event);
  const eventStartInput = startInput || undefined;
  const eventEndInput = endInput || undefined;
  const eventTimeRangeLabel = formatDateTimeInputRange(eventStartInput, eventEndInput);
  useEffect(() => {
    const range = { start: eventRangeStart, end: eventRangeEnd };
    if (!eventRangeStart || monthIntersectsEventRange(calendarDate.year, calendarDate.month, range)) {
      return;
    }
    const start = new Date(`${eventRangeStart}T00:00:00`);
    if (!Number.isNaN(start.getTime())) {
      setCalendarDate({ year: start.getFullYear(), month: start.getMonth() + 1 });
    }
  }, [calendarDate.month, calendarDate.year, eventRangeEnd, eventRangeStart, setCalendarDate]);
  const changeMonth = (offset) => {
    const next = new Date(calendarDate.year, calendarDate.month - 1 + offset, 1);
    if (!monthIntersectsEventRange(next.getFullYear(), next.getMonth() + 1, eventRange)) {
      return;
    }
    setCalendarDate({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };
  const goToday = () => {
    if (!canGoToday) {
      return;
    }
    const today = new Date();
    setCalendarDate({ year: today.getFullYear(), month: today.getMonth() + 1 });
  };
  const isLeader = event?.role === 'LEADER';
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [selectedCalendarItem, setSelectedCalendarItem] = useState(null);
  const [editingCalendarItem, setEditingCalendarItem] = useState(null);
  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [form, setForm] = useState(() => buildEmptyCalendarForm());
  const [calendarFormErrors, setCalendarFormErrors] = useState({});
  const [lastCalendarTimeField, setLastCalendarTimeField] = useState('endTime');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiCalendarSuggestions, setAiCalendarSuggestions] = useState([]);
  const calendarEventIdParam = searchParams.get('calendarEventId');
  const selectableMembers = members;
  const createCalendarItemMutation = useMutation({
    mutationFn: eventUtilityApi.createCalendarItem,
    onError: (error) => {
      const apiFieldErrors = mapCalendarApiErrorToFieldErrors(error);
      if (hasFieldErrors(apiFieldErrors)) {
        setCalendarFormErrors((old) => ({ ...old, ...apiFieldErrors }));
      }
    },
    onSuccess: () => {
      setForm(buildEmptyCalendarForm());
      setSelectedDateKey('');
      setIsCreatePopupOpen(false);
      queryClient.invalidateQueries({ queryKey: ['eventCalendar', eventId] });
    },
  });
  const updateCalendarItemMutation = useMutation({
    mutationFn: eventUtilityApi.updateCalendarItem,
    onSuccess: (updatedItem) => {
      setEditingCalendarItem(null);
      setSelectedCalendarItem(updatedItem);
      queryClient.invalidateQueries({ queryKey: ['eventCalendar', eventId] });
    },
  });
  const aiCalendarSuggestionMutation = useMutation({
    mutationFn: () => aiSuggestionApi.suggestCalendarItems({
      eventId,
      count: 8,
      instruction: aiInstruction,
    }),
    onSuccess: (data) => {
      const existingItems = new Set((calendar?.days || [])
        .flatMap((day) => day.items || [])
        .map(calendarSignature));
      const suggestions = (data?.calendarItems || [])
        .filter((item) => !existingItems.has(calendarSignature(item)))
        .map((item, index) => ({
          ...item,
          key: `${Date.now()}-${index}`,
          selected: true,
        }));
      setAiCalendarSuggestions(suggestions);
    },
  });
  const saveAiCalendarItemsMutation = useMutation({
    mutationFn: async (suggestions) => {
      const selectedSuggestions = suggestions.filter((item) => item.selected);
      const savedItems = [];
      for (const item of selectedSuggestions) {
        savedItems.push(await eventUtilityApi.createCalendarItem({
          eventId,
          payload: calendarSuggestionToPayload(item, departments, members),
        }));
      }
      return savedItems;
    },
    onSuccess: () => {
      setAiCalendarSuggestions([]);
      queryClient.invalidateQueries({ queryKey: ['eventCalendar', eventId] });
    },
  });
  const handleCreateCalendarItem = (submitEvent) => {
    submitEvent.preventDefault();
    const validationErrors = validateCalendarForm(form, eventStartInput, eventEndInput, lastCalendarTimeField);
    if (Object.keys(validationErrors).length > 0) {
      setCalendarFormErrors(validationErrors);
      return;
    }
    createCalendarItemMutation.mutate({
      eventId,
      payload: buildCalendarPayload(form),
    });
  };
  useEffect(() => {
    if (!calendarEventIdParam || !calendar?.days) {
      return;
    }

    const targetId = Number(calendarEventIdParam);
    if (!Number.isFinite(targetId)) {
      return;
    }

    const targetItem = calendar.days
      .flatMap((day) => day.items || [])
      .find((item) => item.id === targetId && !item.taskId);

    if (!targetItem) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setSelectedCalendarItem(targetItem);
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete('calendarEventId');
        return next;
      }, { replace: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [calendar?.days, calendarEventIdParam, setSearchParams]);
  const updateForm = (name, value) => {
    if (createCalendarItemMutation.error) {
      createCalendarItemMutation.reset();
    }
    if (name === 'startTime' || name === 'endTime') {
      setLastCalendarTimeField(name);
    }
    setCalendarFormErrors((old) => ({ ...old, [name]: '', ...(name === 'startTime' || name === 'endTime' ? { startTime: '', endTime: '' } : {}) }));
    setForm((old) => ({ ...old, [name]: value }));
  };
  const apiCalendarFormErrors = mapCalendarApiErrorToFieldErrors(createCalendarItemMutation.error);
  const displayCalendarFormErrors = { ...apiCalendarFormErrors, ...calendarFormErrors };
  const generalCalendarCreateError = createCalendarItemMutation.error && !hasFieldErrors(apiCalendarFormErrors);
  const openEditCalendarItem = (item) => {
    setSelectedCalendarItem(null);
    setEditingCalendarItem(item);
  };
  const selectCalendarDate = (dateKey) => {
    if (!isLeader) {
      return;
    }
    if (!isDateKeyInEventRange(dateKey, eventRange)) {
      return;
    }

    setSelectedDateKey(dateKey);
    setIsCreatePopupOpen(true);
    setForm((old) => ({
      ...old,
      startTime: buildDateTimeLocalValue(dateKey, old.startTime || '09:00'),
      endTime: buildDateTimeLocalValue(dateKey, old.endTime || '10:00'),
    }));
    window.requestAnimationFrame(() => titleInputRef.current?.focus());
  };
  const toggleAttendee = (userId) => {
    setForm((old) => {
      const value = String(userId);
      const attendeeIds = old.attendeeIds.includes(value)
        ? old.attendeeIds.filter((attendeeId) => attendeeId !== value)
        : [...old.attendeeIds, value];
      return { ...old, attendeeIds };
    });
  };
  const toggleAiCalendarSuggestion = (key) => {
    setAiCalendarSuggestions((old) => old.map((item) => (
      item.key === key ? { ...item, selected: !item.selected } : item
    )));
  };

  return (
    <div className="space-y-4">
    {isLeader && (
      <CalendarAiSuggestionPanel
        instruction={aiInstruction}
        setInstruction={setAiInstruction}
        suggestions={aiCalendarSuggestions}
        departments={departments}
        toggleSuggestion={toggleAiCalendarSuggestion}
        updateSuggestion={(key, updater) => setAiCalendarSuggestions((old) => old.map((item) => (
          item.key === key ? updater(item) : item
        )))}
        suggestMutation={aiCalendarSuggestionMutation}
        saveMutation={saveAiCalendarItemsMutation}
      />
    )}
    <Panel>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-2xl font-extrabold capitalize text-slate-950">{monthLabel}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {monthItemsCount} lịch trong tháng • chỉ hiển thị trong khoảng {formatCalendarDateKey(eventRange.start)} - {formatCalendarDateKey(eventRange.end)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={goToday} disabled={!canGoToday}>Hôm nay</Button>
          <Button type="button" variant="secondary" onClick={() => changeMonth(-1)} disabled={!canGoPrevious}>Tháng trước</Button>
          <Button type="button" variant="secondary" onClick={() => changeMonth(1)} disabled={!canGoNext}>Tháng sau</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-r border-slate-200 px-2 py-3 last:border-r-0">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarCells.map((cell) => (
          <CalendarDayCell
            key={cell.dateKey}
            event={event}
            cell={cell}
            canCreate={isLeader}
            isSelected={selectedDateKey === cell.dateKey}
            onSelectDate={selectCalendarDate}
            onOpenDetails={setSelectedCalendarItem}
          />
        ))}
      </div>

      {monthItemsCount === 0 && (
        <div className="border-t border-slate-100 p-4">
          <EmptyState
            icon={CalendarDays}
            title="Chưa có lịch trong tháng này"
          />
        </div>
      )}
    </Panel>
    {selectedCalendarItem && (
      <CalendarDetailsModal
        event={event}
        item={selectedCalendarItem}
        canEdit={isLeader && !selectedCalendarItem.taskId}
        onEdit={openEditCalendarItem}
        onClose={() => setSelectedCalendarItem(null)}
      />
    )}
    {isLeader && editingCalendarItem && (
      <CalendarEditModal
        eventId={eventId}
        item={editingCalendarItem}
        members={members}
        departments={departments}
        eventStartInput={eventStartInput}
        eventEndInput={eventEndInput}
        eventTimeRangeLabel={eventTimeRangeLabel}
        mutation={updateCalendarItemMutation}
        onClose={() => setEditingCalendarItem(null)}
      />
    )}
    {isLeader && isCreatePopupOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
            <div className="min-w-0">
              <h3 className="mt-1 text-xl font-extrabold text-slate-950">Thêm lịch mới</h3>
              <p className="mt-1 text-sm text-slate-500">
                <span className="font-bold text-slate-900">{selectedDateKey ? formatCalendarDateKey(selectedDateKey) : 'Chưa chọn ngày'}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatePopupOpen(false)}
              className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900"
              aria-label="Đóng popup thêm lịch"
            >
              <X size={18} />
            </button>
          </div>
          <form noValidate onSubmit={handleCreateCalendarItem} className="flex min-h-0 flex-1 flex-col">
            <div className="grid gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tên lịch</span>
                <input
                  ref={titleInputRef}
                  value={form.title}
                  onChange={(event) => updateForm('title', event.target.value)}
                  required
                  maxLength={255}
                  className={calendarInputClassName(displayCalendarFormErrors.title, 'w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100')}
                />
                <FieldError message={displayCalendarFormErrors.title} />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Loại lịch</span>
                <select
                  value={form.type}
                  onChange={(event) => updateForm('type', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="MEETING">Họp</option>
                  <option value="REHEARSAL">Rehearsal</option>
                  <option value="SETUP">Setup</option>
                  <option value="CHECKIN">Check-in</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Ban liên quan</span>
                <select
                  value={form.departmentId}
                  onChange={(event) => updateForm('departmentId', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">Ban tổ chức (BTC)</option>
                  {departments.map((department) => (
                    <option key={department.id} value={String(department.id)}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Bắt đầu</span>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(event) => updateForm('startTime', event.target.value)}
                  min={eventStartInput}
                  max={eventEndInput}
                  required
                  className={calendarInputClassName(displayCalendarFormErrors.startTime)}
                />
                <p className="text-xs font-semibold text-slate-500">
                  Sự kiện: {eventTimeRangeLabel}
                </p>
                <FieldError message={displayCalendarFormErrors.startTime} />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Kết thúc</span>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(event) => updateForm('endTime', event.target.value)}
                  min={form.startTime || eventStartInput}
                  max={eventEndInput}
                  required
                  className={calendarInputClassName(displayCalendarFormErrors.endTime)}
                />
                <FieldError message={displayCalendarFormErrors.endTime} />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Địa điểm</span>
                <input
                  value={form.location}
                  onChange={(event) => updateForm('location', event.target.value)}
                  maxLength={255}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Meeting URL</span>
                <input
                  value={form.meetingUrl}
                  onChange={(event) => updateForm('meetingUrl', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                <span className="block text-sm font-bold text-slate-800">Cả ngày</span>
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(event) => updateForm('allDay', event.target.checked)}
                  className="h-4 w-4"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm('description', event.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-white md:col-span-2">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Người cần tham gia</p>
                    <p className="text-xs text-slate-400">{form.attendeeIds.length} người đã chọn</p>
                  </div>
                </div>
                <div className="max-h-36 overflow-y-auto p-3">
                  {selectableMembers.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Chưa có thành viên.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectableMembers.map((member) => {
                        const checked = form.attendeeIds.includes(String(member.userId));
                        return (
                          <label
                            key={member.userId}
                            className={[
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition',
                              checked ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAttendee(member.userId)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{member.name}</span>
                              {member.departmentName ? <span className="block truncate text-xs text-slate-400">{member.departmentName}</span> : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {generalCalendarCreateError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">
                  {createCalendarItemMutation.error.userMessage || createCalendarItemMutation.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
              <Button type="button" variant="secondary" onClick={() => setIsCreatePopupOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={createCalendarItemMutation.isPending}>
                Lưu lịch
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  );
};

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const CalendarAiSuggestionPanel = ({
  instruction,
  setInstruction,
  suggestions,
  departments,
  toggleSuggestion,
  updateSuggestion,
  suggestMutation,
  saveMutation,
}) => {
  const selectedCount = suggestions.filter((item) => item.selected).length;
  const [detailSuggestion, setDetailSuggestion] = useState(null);

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
            <Sparkles size={16} />
            AI gợi ý lịch vận hành
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 lg:max-w-xl sm:flex-row">
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Bối cảnh AI"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <Button type="button" variant="secondary" onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
            {suggestMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gợi ý
          </Button>
        </div>
      </div>

      {(suggestMutation.error || saveMutation.error) && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(suggestMutation.error || saveMutation.error).userMessage || (suggestMutation.error || saveMutation.error).message}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="w-14 px-3 py-3">Chọn</th>
                  <th className="px-3 py-3">Lịch</th>
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3">Ban / địa điểm</th>
                  <th className="px-3 py-3">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <tr
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailSuggestion(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setDetailSuggestion(item);
                      }
                    }}
                    className={[
                      'cursor-pointer transition hover:bg-indigo-50/60',
                      item.selected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                  >
                    <td className="px-3 py-3 align-top">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSuggestion(item.key);
                        }}
                        className="rounded-full"
                        aria-label={item.selected ? 'Bỏ chọn gợi ý' : 'Chọn gợi ý'}
                      >
                        {item.selected ? <CheckCircle2 size={18} className="text-indigo-600" /> : <Circle size={18} className="text-slate-300" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-950">{item.title}</span>
                        <StatusBadge status={CALENDAR_TYPE_LABELS[item.type] || item.type || 'Lịch'} />
                      </div>

                    </td>
                    <td className="px-3 py-3 align-top font-semibold leading-6 text-slate-500">
                      {formatDate(item.startTime)} - {formatDate(item.endTime)}
                    </td>
                    <td className="px-3 py-3 align-top font-semibold leading-6 text-slate-500">
                      {departmentNameById(departments, item.departmentId) || 'Ban tổ chức (BTC)'}{item.location ? ` • ${item.location}` : ''}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="line-clamp-2 leading-6 text-slate-600">{item.description || 'Chưa có mô tả'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-500">Đã chọn {selectedCount}/{suggestions.length}</p>
            <Button type="button" onClick={() => saveMutation.mutate(suggestions)} disabled={selectedCount === 0 || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu đã chọn
            </Button>
          </div>
        </div>
      )}

      <AiSuggestionDetailModal
        isOpen={Boolean(detailSuggestion)}
        title={detailSuggestion?.title || 'Chi tiết lịch gợi ý'}
        suggestion={detailSuggestion}
        onSave={(updatedSuggestion) => {
          const cleaned = stripHiddenSuggestionKeys(updatedSuggestion);
          updateSuggestion(detailSuggestion.key, (item) => ({
            ...item,
            ...cleaned,
            key: item.key,
            selected: item.selected,
          }));
        }}
        onClose={() => setDetailSuggestion(null)}
      />
    </Panel>
  );
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getEventDateRange = (event) => {
  const startValue = event?.startTime || event?.eventDate;
  const endValue = event?.endTime || startValue;
  return {
    start: startValue ? toDateKey(new Date(startValue)) : null,
    end: endValue ? toDateKey(new Date(endValue)) : null,
  };
};

const isDateKeyInEventRange = (dateKey, eventRange) => {
  if (!dateKey) {
    return false;
  }
  if (eventRange?.start && dateKey < eventRange.start) {
    return false;
  }
  if (eventRange?.end && dateKey > eventRange.end) {
    return false;
  }
  return true;
};

const monthIntersectsEventRange = (year, month, eventRange) => {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const firstKey = toDateKey(first);
  const lastKey = toDateKey(last);
  if (eventRange?.start && lastKey < eventRange.start) {
    return false;
  }
  if (eventRange?.end && firstKey > eventRange.end) {
    return false;
  }
  return true;
};

const buildEmptyCalendarForm = () => ({
  title: '',
  type: 'MEETING',
  departmentId: '',
  startTime: '',
  endTime: '',
  allDay: false,
  status: 'SCHEDULED',
  location: '',
  meetingUrl: '',
  description: '',
  attendeeIds: [],
});

const calendarItemToForm = (item) => ({
  title: item?.title || '',
  type: item?.type || 'MEETING',
  departmentId: item?.departmentId ? String(item.departmentId) : '',
  startTime: toDateTimeLocalValue(item?.startTime),
  endTime: toDateTimeLocalValue(item?.endTime || item?.startTime),
  allDay: Boolean(item?.allDay),
  status: item?.status || 'SCHEDULED',
  location: item?.location || '',
  meetingUrl: item?.meetingUrl || '',
  description: item?.description || '',
  attendeeIds: (item?.attendees || []).map((attendee) => String(attendee.userId)),
});

const suggestedCalendarItemToForm = (item, currentForm, departments, members) => {
  const departmentIds = new Set((departments || []).map((department) => String(department.id)));
  const memberIds = new Set((members || []).map((member) => String(member.userId)));
  const attendeeIds = (item?.attendeeIds || [])
    .map((attendeeId) => String(attendeeId))
    .filter((attendeeId) => memberIds.has(attendeeId));

  return {
    ...currentForm,
    title: item?.title || currentForm.title,
    type: item?.type || currentForm.type,
    departmentId: item?.departmentId && departmentIds.has(String(item.departmentId)) ? String(item.departmentId) : '',
    startTime: toDateTimeLocalValue(item?.startTime) || currentForm.startTime,
    endTime: toDateTimeLocalValue(item?.endTime) || currentForm.endTime,
    allDay: Boolean(item?.allDay),
    status: item?.status || currentForm.status || 'SCHEDULED',
    location: item?.location || currentForm.location,
    meetingUrl: item?.meetingUrl || '',
    description: item?.description || currentForm.description,
    attendeeIds,
  };
};

const buildCalendarPayload = (form) => ({
  title: form.title,
  type: form.type,
  departmentId: form.departmentId ? Number(form.departmentId) : null,
  startTime: form.startTime,
  endTime: form.endTime,
  allDay: form.allDay,
  status: form.status || 'SCHEDULED',
  location: form.location,
  meetingUrl: form.meetingUrl,
  description: form.description,
  attendeeIds: form.attendeeIds.map((attendeeId) => Number(attendeeId)),
});

const validateCalendarForm = (form, eventStartInput, eventEndInput, lastTimeField = 'endTime') => {
  const errors = {};
  if (!form.title.trim()) {
    errors.title = 'Vui lòng nhập tên lịch.';
  }
  if (!form.startTime || !form.endTime) {
    if (!form.startTime) {
      errors.startTime = 'Vui lòng chọn thời gian bắt đầu lịch.';
    }
    if (!form.endTime) {
      errors.endTime = 'Vui lòng chọn thời gian kết thúc lịch.';
    }
    return errors;
  }
  if ((eventStartInput && form.startTime < eventStartInput) || (eventEndInput && form.endTime > eventEndInput)) {
    if (eventStartInput && form.startTime < eventStartInput) {
      errors.startTime = buildEventTimeRangeError('Thời gian bắt đầu lịch', eventStartInput, eventEndInput);
    }
    if (eventEndInput && form.endTime > eventEndInput) {
      errors.endTime = buildEventTimeRangeError('Thời gian kết thúc lịch', eventStartInput, eventEndInput);
    }
  }
  if (form.endTime <= form.startTime) {
    errors[lastTimeField === 'startTime' ? 'startTime' : 'endTime'] = 'Thời gian kết thúc lịch phải sau thời gian bắt đầu.';
  }
  return errors;
};

const getErrorMessage = (error) => error?.userMessage || error?.message || '';

const hasFieldErrors = (errors) => Object.values(errors || {}).some(Boolean);

const mapCalendarApiErrorToFieldErrors = (error) => {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  const errors = {};
  if (!message) {
    return errors;
  }
  if (normalized.includes('tên') || normalized.includes('tiêu đề') || normalized.includes('title')) {
    errors.title = message;
  }
  if (normalized.includes('bắt đầu') || normalized.includes('starttime')) {
    errors.startTime = message;
  }
  if (normalized.includes('kết thúc') || normalized.includes('endtime')) {
    errors.endTime = message;
  }
  return errors;
};

const calendarInputClassName = (error, className = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100') => (
  error ? `${className} border-red-300 bg-red-50/70 focus:border-red-400 focus:ring-red-100` : className
);

const FieldError = ({ message }) => (
  message ? <p className="text-xs font-semibold text-red-600">{message}</p> : null
);

const calendarSuggestionToPayload = (item, departments, members) => buildCalendarPayload(
  suggestedCalendarItemToForm(item, buildEmptyCalendarForm(), departments, members)
);

const calendarSignature = (item) => `${String(item?.title || '').trim().toLowerCase()}|${item?.startTime || ''}|${item?.endTime || ''}`;

const departmentNameById = (departments, departmentId) => (
  departments.find((department) => String(department.id) === String(departmentId))?.name
);

const getCalendarScopeLabel = (item) => item?.departmentName || 'Ban tổ chức (BTC)';

const buildCalendarCells = (year, month, daysByDate, eventRange) => {
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - firstWeekday);
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(date);
    const apiDay = daysByDate.get(dateKey);
    const inEventRange = isDateKeyInEventRange(dateKey, eventRange);

    return {
      dateKey,
      dayOfMonth: date.getDate(),
      inCurrentMonth: date.getMonth() === month - 1,
      inEventRange,
      isToday: dateKey === todayKey,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      items: inEventRange ? (apiDay?.items || []) : [],
    };
  });
};

const CalendarDayCell = ({ event, cell, canCreate, isSelected, onSelectDate, onOpenDetails }) => {
  const visibleItems = cell.items.slice(0, 3);
  const hiddenCount = Math.max(cell.items.length - visibleItems.length, 0);

  return (
    <div
      role={canCreate && cell.inEventRange ? 'button' : undefined}
      tabIndex={canCreate && cell.inEventRange ? 0 : undefined}
      onClick={() => onSelectDate?.(cell.dateKey)}
      onKeyDown={(event) => {
        if (!canCreate || !cell.inEventRange) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectDate?.(cell.dateKey);
        }
      }}
      title={cell.inEventRange && canCreate ? `Thêm lịch vào ${formatCalendarDateKey(cell.dateKey)}` : 'Ngoài thời gian sự kiện'}
      className={[
        'min-h-32 border-b border-r border-slate-200 p-2 last:border-r-0 md:min-h-36',
        cell.inCurrentMonth && cell.inEventRange ? 'bg-white' : 'bg-slate-50 text-slate-400',
        cell.isWeekend && cell.inCurrentMonth ? 'bg-slate-50/60' : '',
        canCreate && cell.inEventRange ? 'cursor-pointer transition hover:bg-indigo-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-300' : '',
        !cell.inEventRange ? 'opacity-45' : '',
        isSelected ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={[
            'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
            cell.isToday ? 'bg-indigo-600 text-white' : cell.inCurrentMonth ? 'text-slate-700' : 'text-slate-400',
          ].join(' ')}
        >
          {cell.dayOfMonth}
        </span>
        {canCreate && cell.inEventRange && (
          <span className={[
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500',
          ].join(' ')}
          >
            +
          </span>
        )}
      </div>

      <div className="space-y-1">
        {visibleItems.map((item) => (
          <CalendarItem key={`${item.type}-${item.id}`} event={event} item={item} onOpenDetails={onOpenDetails} />
        ))}
        {hiddenCount > 0 && (
          <div className="rounded px-2 py-1 text-xs font-semibold text-slate-500">
            +{hiddenCount} mục khác
          </div>
        )}
      </div>
    </div>
  );
};

const CalendarItem = ({ item, onOpenDetails }) => {
  const tone = getCalendarItemTone(item);
  const timeLabel = formatCalendarItemTime(item);
  const scopeLabel = getCalendarScopeLabel(item);
  const attendees = item.attendees || [];
  const attendeeTitle = attendees.length > 0
    ? ` • Người tham gia: ${attendees.map((attendee) => attendee.name).join(', ')}`
    : '';

  return (
    <button
      type="button"
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onOpenDetails?.(item);
      }}
      title={`${item.title} • ${scopeLabel}${item.location ? ` • ${item.location}` : ''}${timeLabel ? ` • ${timeLabel}` : ''}${attendeeTitle}`}
      className={`block w-full truncate rounded px-2 py-1 text-left text-xs font-semibold transition ${tone}`}
    >
      <span className="mr-1">•</span>
      {timeLabel && <span className="mr-1 font-bold">{timeLabel}</span>}
      {item.title}
      {attendees.length > 0 && <span className="ml-1 font-medium opacity-80">({attendees.length})</span>}
    </button>
  );
};

const CalendarDetailsModal = ({ event, item, canEdit, onEdit, onClose }) => {
  const attendees = item.attendees || [];
  const typeLabel = CALENDAR_TYPE_LABELS[item.type] || item.type || 'Lịch';
  const statusLabel = CALENDAR_STATUS_LABELS[item.status] || item.status;
  const timeRange = formatCalendarItemRange(item);
  const taskUrl = item.taskId ? `/events/${event?.id}/tasks/${item.taskId}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10" onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Chi tiết lịch</p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-950">{item.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={typeLabel} />
              {statusLabel && <StatusBadge status={statusLabel} />}
              {item.taskStatus && <StatusBadge status={item.taskStatus} />}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900"
            aria-label="Đóng chi tiết lịch"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <CalendarDetailField label="Thời gian" value={timeRange || formatDate(item.date)} />
            <CalendarDetailField label="Phạm vi" value={getCalendarScopeLabel(item)} />
            <CalendarDetailField label="Địa điểm" value={item.location || 'Chưa có địa điểm'} />
            <CalendarDetailField label="Người tạo" value={item.creatorName || 'Không có dữ liệu'} />
            {item.assigneeName && <CalendarDetailField label="Phụ trách task" value={item.assigneeName} />}
            {item.taskPriority && <CalendarDetailField label="Ưu tiên task" value={item.taskPriority} />}
          </div>

          {item.meetingUrl && (
            <a
              href={item.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
            >
              <ExternalLink size={16} />
              Mở meeting link
            </a>
          )}

          {item.description && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.description}</p>
            </div>
          )}

          {attendees.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Người tham gia</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {attendees.map((attendee) => (
                  <span key={attendee.userId} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                    {attendee.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end">
          {canEdit && (
            <Button type="button" variant="secondary" onClick={() => onEdit?.(item)}>
              <Pencil size={16} />
              Sửa lịch
            </Button>
          )}
          {taskUrl && (
            <Button as={Link} to={taskUrl} onClick={onClose} variant="secondary">
              <ExternalLink size={16} />
              Mở task
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

const CalendarDetailField = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{value || 'Không có dữ liệu'}</p>
  </div>
);

const CalendarEditModal = ({ eventId, item, departments, members, eventStartInput, eventEndInput, eventTimeRangeLabel, mutation, onClose }) => {
  const [form, setForm] = useState(() => calendarItemToForm(item));
  const [fieldErrors, setFieldErrors] = useState({});
  const [lastTimeField, setLastTimeField] = useState('endTime');
  const updateForm = (name, value) => {
    if (mutation.error) {
      mutation.reset();
    }
    if (name === 'startTime' || name === 'endTime') {
      setLastTimeField(name);
    }
    setFieldErrors((old) => ({ ...old, [name]: '', ...(name === 'startTime' || name === 'endTime' ? { startTime: '', endTime: '' } : {}) }));
    setForm((old) => ({ ...old, [name]: value }));
  };
  const toggleAttendee = (userId) => {
    setForm((old) => {
      const value = String(userId);
      const attendeeIds = old.attendeeIds.includes(value)
        ? old.attendeeIds.filter((attendeeId) => attendeeId !== value)
        : [...old.attendeeIds, value];
      return { ...old, attendeeIds };
    });
  };
  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    const validationErrors = validateCalendarForm(form, eventStartInput, eventEndInput, lastTimeField);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    mutation.mutate({
      eventId,
      calendarItemId: item.id,
      payload: buildCalendarPayload(form),
    });
  };
  const apiFieldErrors = mapCalendarApiErrorToFieldErrors(mutation.error);
  const displayFieldErrors = { ...apiFieldErrors, ...fieldErrors };
  const generalMutationError = mutation.error && !hasFieldErrors(apiFieldErrors);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
          <div className="min-w-0">
            <h3 className="mt-1 text-xl font-extrabold text-slate-950">Sửa lịch BTC</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900"
            aria-label="Đóng popup sửa lịch"
          >
            <X size={18} />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tên lịch</span>
              <input
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                required
                maxLength={255}
                className={calendarInputClassName(displayFieldErrors.title, 'w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100')}
              />
              <FieldError message={displayFieldErrors.title} />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Loại lịch</span>
              <select
                value={form.type}
                onChange={(event) => updateForm('type', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="MEETING">Họp</option>
                <option value="REHEARSAL">Rehearsal</option>
                <option value="SETUP">Setup</option>
                <option value="CHECKIN">Check-in</option>
                <option value="OTHER">Khác</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Ban liên quan</span>
              <select
                value={form.departmentId}
                onChange={(event) => updateForm('departmentId', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Ban tổ chức (BTC)</option>
                {departments.map((department) => (
                  <option key={department.id} value={String(department.id)}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Bắt đầu</span>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => updateForm('startTime', event.target.value)}
                min={eventStartInput}
                max={eventEndInput}
                required
                className={calendarInputClassName(displayFieldErrors.startTime)}
              />
              <p className="text-xs font-semibold text-slate-500">
                Sự kiện: {eventTimeRangeLabel}
              </p>
              <FieldError message={displayFieldErrors.startTime} />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Kết thúc</span>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => updateForm('endTime', event.target.value)}
                min={form.startTime || eventStartInput}
                max={eventEndInput}
                required
                className={calendarInputClassName(displayFieldErrors.endTime)}
              />
              <FieldError message={displayFieldErrors.endTime} />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Địa điểm</span>
              <input
                value={form.location}
                onChange={(event) => updateForm('location', event.target.value)}
                maxLength={255}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Meeting URL</span>
              <input
                value={form.meetingUrl}
                onChange={(event) => updateForm('meetingUrl', event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
              <span className="block text-sm font-bold text-slate-800">Cả ngày</span>
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(event) => updateForm('allDay', event.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú</span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-white md:col-span-2">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Người cần tham gia</p>
                  <p className="text-xs text-slate-400">{form.attendeeIds.length} người đã chọn</p>
                </div>
              </div>
              <div className="max-h-36 overflow-y-auto p-3">
                {members.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Chưa có thành viên.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {members.map((member) => {
                      const checked = form.attendeeIds.includes(String(member.userId));
                      return (
                        <label
                          key={member.userId}
                          className={[
                            'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition',
                            checked ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAttendee(member.userId)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{member.name}</span>
                            {member.departmentName ? <span className="block truncate text-xs text-slate-400">{member.departmentName}</span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {generalMutationError && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">
                {mutation.error.userMessage || mutation.error.message}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CALENDAR_TYPE_LABELS = {
  EVENT: 'Sự kiện',
  TASK_DEADLINE: 'Deadline task',
  MEETING: 'Họp',
  REHEARSAL: 'Rehearsal',
  SETUP: 'Setup',
  CHECKIN: 'Check-in',
  OTHER: 'Khác',
};

const CALENDAR_STATUS_LABELS = {
  SCHEDULED: 'Đã lên lịch',
  CANCELLED: 'Đã hủy',
  DONE: 'Hoàn thành',
};

const buildDateTimeLocalValue = (dateKey, currentValue) => {
  const timePart = currentValue.includes('T') ? currentValue.split('T')[1] : currentValue;
  const [rawHour, rawMinute] = timePart.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const base = new Date(`${dateKey}T${Number.isNaN(hour) ? 9 : hour.toString().padStart(2, '0')}:${Number.isNaN(minute) ? '00' : minute.toString().padStart(2, '0')}:00`);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  const hours = String(base.getHours()).padStart(2, '0');
  const minutes = String(base.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatCalendarDateKey = (dateKey) => {
  return formatDateOnly(`${dateKey}T00:00:00`, dateKey);
};

const formatCalendarItemTime = (item) => {
  if (item.allDay) {
    return 'Cả ngày';
  }

  if (!item.startTime) {
    return '';
  }

  const start = getVietnamDateTimeParts(item.startTime);
  if (!start) {
    return '';
  }
  return `${start.hour}:${start.minute}`;
};

const formatCalendarItemRange = (item) => {
  if (item.allDay) {
    return `${formatDate(item.startTime || item.date)} • Cả ngày`;
  }

  if (!item.startTime && !item.endTime) {
    return formatDate(item.date);
  }

  const startText = item.startTime ? formatDate(item.startTime) : '';
  const endText = item.endTime ? formatDate(item.endTime) : '';
  if (startText && endText) {
    return `${startText} - ${endText}`;
  }

  return startText || endText;
};

const getCalendarItemTone = (item) => {
  if (item.type === 'EVENT') {
    return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200';
  }

  if (item.type === 'MEETING') {
    return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
  }

  if (item.type === 'REHEARSAL') {
    return 'bg-violet-100 text-violet-800 hover:bg-violet-200';
  }

  if (item.type === 'SETUP') {
    return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
  }

  if (item.type === 'CHECKIN') {
    return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
  }

  return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
};

const DocumentsContent = ({ eventId, event, documents }) => {
  const [search, setSearch] = useState('');
  const [selectedDepartmentKey, setSelectedDepartmentKey] = useState('');
  const filteredDocuments = useMemo(() => filterDocuments(documents, search), [documents, search]);
  const documentTree = useMemo(() => buildDocumentTree(filteredDocuments), [filteredDocuments]);
  const selectedDepartment = useMemo(
    () => documentTree.find((department) => department.key === selectedDepartmentKey) || documentTree[0],
    [documentTree, selectedDepartmentKey]
  );
  const selectedDocuments = useMemo(() => flattenDepartmentDocuments(selectedDepartment), [selectedDepartment]);
  const totalTasks = useMemo(() => documentTree.reduce((total, department) => total + department.tasks.length, 0), [documentTree]);
  const isLeader = event?.role === 'LEADER';


  const handleDownload = async (document) => {
    const blob = await taskApi.downloadTaskAttachment(document.id);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.originalName || 'eventflow-document';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-950">{isLeader ? 'Tài liệu theo ban' : 'Tài liệu được chia sẻ với bạn'}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-md bg-slate-100 px-2.5 py-1">{documentTree.length} ban</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1">{totalTasks} task</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1">{filteredDocuments.length} file</span>
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm tài liệu, task, ban, người upload..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 lg:max-w-sm"
        />
      </div>

      {documents.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={FileText} title="Chưa có tài liệu" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={FileText} title="Không tìm thấy tài liệu" />
        </div>
      ) : (
        <div className="grid min-h-[420px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-slate-50/60 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Ban có tài liệu
            </div>
            <div className="max-h-[560px] overflow-auto p-2">
              {documentTree.map((department) => {
                const isSelected = department.key === selectedDepartment?.key;
                return (
                  <button
                    key={department.key}
                    type="button"
                    onClick={() => setSelectedDepartmentKey(department.key)}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition ${isSelected ? 'bg-white text-slate-950 shadow-sm ring-1 ring-sky-100' : 'text-slate-600 hover:bg-white/80'}`}
                  >
                    <span className="block truncate text-sm font-black">{department.departmentName}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                      {department.tasks.length} task · {department.fileCount} file
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-950">{selectedDepartment?.departmentName}</p>
                <p className="text-sm font-semibold text-slate-500">
                  {selectedDepartment?.tasks.length || 0} task · {selectedDepartment?.fileCount || 0} file
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className={documentThClassName}>Task</th>
                    <th className={documentThClassName}>Tài liệu</th>
                    <th className={documentThClassName}>Loại</th>
                    <th className={documentThClassName}>Người upload</th>
                    <th className={documentThClassName}>Ngày</th>
                    <th className={documentThClassName}>Phạm vi</th>
                    <th className={`${documentThClassName} text-right`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                        Ban này chưa có tài liệu.
                      </td>
                    </tr>
                  ) : selectedDocuments.map(({ document, taskLabel }) => (
                    <tr key={document.id} className="hover:bg-slate-50/70">
                      <td className={documentTdClassName}>
                        <span className="block max-w-[220px] truncate" title={taskLabel}>{taskLabel}</span>
                      </td>
                      <td className={documentTdClassName}>
                        <span className="block max-w-[280px] truncate font-black text-slate-900" title={document.originalName}>{document.originalName}</span>
                        {document.attachmentType === 'LINK' && document.externalUrl ? (
                          <span className="mt-1 block max-w-[280px] truncate text-xs text-slate-500" title={document.externalUrl}>{document.externalUrl}</span>
                        ) : null}
                      </td>
                      <td className={documentTdClassName}>{document.attachmentType === 'LINK' ? 'Link' : formatFileSize(document.sizeBytes)}</td>
                      <td className={documentTdClassName}>{document.uploaderName || 'Không rõ'}</td>
                      <td className={documentTdClassName}>{formatDate(document.createdAt)}</td>
                      <td className={documentTdClassName}><DocumentVisibilityBadge visibility={document.visibility} /></td>
                      <td className={`${documentTdClassName} text-right`}>
                        <div className="flex flex-wrap justify-end gap-2">
                          {document.canOpenTask ? (
                            <Button as={Link} to={`/events/${eventId}/tasks/${document.taskId}/attachments`} variant="secondary">
                              Mở task
                            </Button>
                          ) : null}
                          {document.attachmentType === 'LINK' ? (
                            <Button as="a" href={document.externalUrl} target="_blank" rel="noreferrer" variant="secondary">
                              Mở link
                            </Button>
                          ) : (
                            <Button type="button" onClick={() => handleDownload(document)} variant="secondary">
                              Tải xuống
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Panel>
  );
};

const flattenDepartmentDocuments = (department) => {
  if (!department) return [];

  return department.tasks.flatMap((task) => [
    ...task.attachments.map((document) => ({
      document,
      taskLabel: task.taskTitle,
    })),
    ...task.subtasks.flatMap((subtask) => subtask.attachments.map((document) => ({
      document,
      taskLabel: `${task.taskTitle} / ${subtask.taskTitle}`,
    }))),
  ]);
};
const filterDocuments = (documents, search) => {
  const keyword = search.trim().toLowerCase();
  if (!keyword) {
    return documents;
  }

  return documents.filter((document) => [
    document.originalName,
    document.taskTitle,
    document.parentTaskTitle,
    document.departmentName,
    document.uploaderName,
    document.contentType,
    DOCUMENT_VISIBILITY_META[document.visibility]?.label,
  ].some((value) => String(value || '').toLowerCase().includes(keyword)));
};

const buildDocumentTree = (documents) => {
  const departmentMap = new Map();

  documents.forEach((document) => {
    const departmentKey = String(document.departmentId ?? document.departmentName ?? 'none');
    if (!departmentMap.has(departmentKey)) {
      departmentMap.set(departmentKey, {
        key: departmentKey,
        departmentId: document.departmentId,
        departmentName: document.departmentName || 'Chưa gán ban',
        fileCount: 0,
        taskMap: new Map(),
      });
    }

    const department = departmentMap.get(departmentKey);
    department.fileCount += 1;

    const mainTaskId = document.parentTaskId || document.taskId;
    const mainTaskKey = String(mainTaskId);
    if (!department.taskMap.has(mainTaskKey)) {
      department.taskMap.set(mainTaskKey, {
        key: mainTaskKey,
        taskId: mainTaskId,
        taskTitle: document.parentTaskTitle || document.taskTitle || 'Task không tên',
        fileCount: 0,
        canOpenTask: Boolean(document.canOpenTask),
        attachments: [],
        subtaskMap: new Map(),
      });
    }

    const task = department.taskMap.get(mainTaskKey);
    task.fileCount += 1;
    task.canOpenTask = task.canOpenTask || Boolean(document.canOpenTask);

    if (document.subtask) {
      const subtaskKey = String(document.taskId);
      if (!task.subtaskMap.has(subtaskKey)) {
        task.subtaskMap.set(subtaskKey, {
          key: subtaskKey,
          taskId: document.taskId,
          taskTitle: document.taskTitle || 'Subtask không tên',
          canOpenTask: Boolean(document.canOpenTask),
          attachments: [],
        });
      }
      const subtask = task.subtaskMap.get(subtaskKey);
      subtask.canOpenTask = subtask.canOpenTask || Boolean(document.canOpenTask);
      subtask.attachments.push(document);
    } else {
      task.attachments.push(document);
    }
  });

  return Array.from(departmentMap.values()).map((department) => ({
    ...department,
    tasks: Array.from(department.taskMap.values()).map((task) => ({
      ...task,
      subtasks: Array.from(task.subtaskMap.values()),
    })),
  }));
};


const documentThClassName = 'whitespace-nowrap px-4 py-3';
const documentTdClassName = 'align-middle px-4 py-3 text-sm font-semibold text-slate-700';

const DOCUMENT_VISIBILITY_META = {
  TASK_ONLY: { label: 'Chỉ task này', className: 'bg-slate-100 text-slate-700' },
  DEPARTMENT: { label: 'Ban phụ trách', className: 'bg-emerald-50 text-emerald-700' },
  EVENT_PUBLIC: { label: 'Toàn sự kiện', className: 'bg-indigo-50 text-indigo-700' },
};

const DocumentVisibilityBadge = ({ visibility }) => {
  const meta = DOCUMENT_VISIBILITY_META[visibility] || DOCUMENT_VISIBILITY_META.TASK_ONLY;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const formatFileSize = (sizeBytes) => {
  const size = Number(sizeBytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
};

const ReportsContent = ({ event, stats, departments, members, tasks, reportsData, reportRange }) => {
  const reports = useMemo(() => reportsData?.reports || [], [reportsData]);
  const reportSummary = reportsData?.summary || {};
  const statusData = useMemo(() => {
    const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    return statuses.map((status) => ({
      label: status,
      totalTasks: tasks.filter((task) => task.status === status).length,
    }));
  }, [tasks]);
  const report = useMemo(() => buildDashboardReport({
    event,
    summary: {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      progressPercentage: stats.progress,
      overdueTasksCount: stats.overdueTasks,
    },
    statusData,
    tasks,
    departments,
    members,
    range: reportRange,
    reportItems: reports,
    note: 'Dữ liệu xuất từ trang Báo cáo: task hiện tại và task reports thật trong khoảng ngày đã chọn.',
  }), [departments, event, members, reportRange, reports, stats, statusData, tasks]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Tổng công việc" value={stats.totalTasks} />
        <MetricCard icon={TrendingUp} label="Report tiến độ" value={reportSummary.totalReports || 0} tone="violet" />
        <MetricCard icon={CalendarDays} label="Task đã report" value={reportSummary.reportedTasks || 0} tone="emerald" />
        <MetricCard icon={Users} label="Thành viên" value={members.length} tone="emerald" />
      </section>
      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-950">Report tiến độ thật</h3>
            <p className="mt-1 text-sm text-slate-500">
              {reportsData?.fromDate || reportRange.fromDate} - {reportsData?.toDate || reportRange.toDate} • trung bình {Math.round(reportSummary.averageReportedProgress || 0)}%
            </p>
          </div>
          <ReportDownloadButtons report={report} />
        </div>
        {reports.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={TrendingUp} title="Chưa có report trong kỳ" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((item) => (
              <Link key={item.id} to={`/events/${event?.id}/tasks/${item.taskId}/reports`} className="block p-4 transition hover:bg-indigo-50/50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{item.taskTitle}</p>
                    <p className="text-sm text-slate-500">{item.departmentName} • {item.reporterName} • {formatDate(item.createdAt)}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SummaryPill label="Tiến độ" value={`${item.progressPercentage}%`} />
                    <StatusBadge status={item.taskStatus} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

const ReportDownloadButtons = ({ report }) => (
  <div className="flex flex-wrap gap-2">
    <Button type="button" variant="secondary" onClick={() => exportDashboardCsv(report)}>
      <FileSpreadsheet size={16} />
      CSV
    </Button>
    <Button type="button" variant="secondary" onClick={() => exportDashboardJson(report)}>
      <FileJson size={16} />
      JSON
    </Button>
    <Button type="button" onClick={() => openPrintableDashboardReport(report)}>
      <Printer size={16} />
      In / lưu PDF
    </Button>
  </div>
);

const SettingsContent = () => {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || i18n.language || 'vi');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const applyLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem('language', nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Panel className="p-5">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Giao diện</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Chế độ sáng / tối</h3>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => applyTheme('light')}
            className={`min-h-12 rounded-lg border px-4 text-sm font-black transition ${theme === 'light' ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            Sáng
          </button>
          <button
            type="button"
            onClick={() => applyTheme('dark')}
            className={`min-h-12 rounded-lg border px-4 text-sm font-black transition ${theme === 'dark' ? 'border-slate-900 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            Tối
          </button>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Ngôn ngữ</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">Chọn ngôn ngữ</h3>
        </div>

        <select
          value={language}
          onChange={(event) => applyLanguage(event.target.value)}
          className="mt-4 min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </Panel>
    </div>
  );
};
const SummaryPill = ({ label, value, icon: Icon }) => (
  <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-4">
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
          <Icon size={18} strokeWidth={1.8} />
        </div>
      )}

      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-3xl font-black text-slate-950">
          {value ?? 0}
        </p>
      </div>
    </div>
  </div>
);

export default EventUtilityPage;





