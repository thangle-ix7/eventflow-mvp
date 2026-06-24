import { Download, Upload } from 'lucide-react';
import { Button, ErrorState, Panel, SelectControl, TextInput } from '../../components/ui';

const AttendeeInvitePanel = ({
  canManage,
  effectiveSessionId,
  form,
  setForm,
  createAttendeeMutation,
  eventId,
  typeLabels,
  statusLabels,
  templateMutation,
  importFile,
  setImportFile,
  importMutation,
  importResult,
}) => (
  <Panel className="p-5">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Khách mời</p>
      <h3 className="mt-1 text-lg font-black text-slate-950">Mời khách</h3>
    </div>

    {!effectiveSessionId && (
      <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
        Chọn session trước.
      </p>
    )}

    {canManage && effectiveSessionId && (
      <>
        <form
          className="mt-4 grid gap-3 border-t border-slate-100 pt-4"
          onSubmit={(eventSubmit) => {
            eventSubmit.preventDefault();
            createAttendeeMutation.mutate({ eventId, payload: { ...form, sessionId: Number(effectiveSessionId) } });
          }}
        >
          <h4 className="font-black text-slate-950">Nhập tay</h4>
          <TextInput
            icon={null}
            value={form.fullName}
            placeholder="Họ tên"
            onChange={(eventChange) => setForm((old) => ({ ...old, fullName: eventChange.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              icon={null}
              type="email"
              value={form.email}
              placeholder="Email"
              onChange={(eventChange) => setForm((old) => ({ ...old, email: eventChange.target.value }))}
            />
            <TextInput
              icon={null}
              value={form.phone}
              placeholder="Số điện thoại"
              onChange={(eventChange) => setForm((old) => ({ ...old, phone: eventChange.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectControl
              label="Loại khách"
              value={form.attendeeType}
              onChange={(eventChange) => setForm((old) => ({ ...old, attendeeType: eventChange.target.value }))}
            >
              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectControl>
            <SelectControl
              label="Trạng thái"
              value={form.status}
              onChange={(eventChange) => setForm((old) => ({ ...old, status: eventChange.target.value }))}
            >
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectControl>
          </div>
          <Button type="submit" disabled={!form.fullName.trim() || createAttendeeMutation.isPending}>
            {form.email.trim() ? 'Thêm và gửi lời mời' : 'Thêm khách mời'}
          </Button>
        </form>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-black text-slate-950">Import Excel</h4>
            <button
              type="button"
              onClick={() => templateMutation.mutate(eventId)}
              disabled={templateMutation.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              File mẫu
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="file"
              accept=".xlsx"
              onChange={(eventChange) => setImportFile(eventChange.target.files?.[0] || null)}
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            />
            <Button
              type="button"
              disabled={!importFile || importMutation.isPending}
              onClick={() => importMutation.mutate({ eventId, sessionId: Number(effectiveSessionId), file: importFile })}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </div>
          {importResult && (
            <p className="mt-3 text-sm font-bold text-slate-600">
              Đã import {importResult.importedCount} dòng, bỏ qua {importResult.skippedCount} dòng.
            </p>
          )}
          {importResult?.errors?.length > 0 && (
            <ul className="mt-2 max-h-28 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {importResult.errors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
          {importMutation.error && (
            <div className="mt-3">
              <ErrorState error={importMutation.error} title="Import không thành công" />
            </div>
          )}
        </div>
      </>
    )}
  </Panel>
);

export default AttendeeInvitePanel;
