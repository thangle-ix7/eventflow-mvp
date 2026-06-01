const formatDateTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('vi-VN');
};

const sanitizeFileName = (value) =>
  String(value || 'eventflow-report')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const downloadTextFile = ({ fileName, content, type }) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const toCsv = (rows, columns) => [
  columns.map((column) => escapeCsvValue(column.header)).join(','),
  ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column.key])).join(',')),
].join('\n');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const metricRows = (report) => [
  { label: 'Tổng công việc', value: report.summary?.totalTasks ?? 0 },
  { label: 'Đã hoàn thành', value: report.summary?.completedTasks ?? 0 },
  { label: 'Tiến độ', value: `${report.summary?.progressPercentage ?? 0}%` },
  { label: 'Quá hạn', value: report.summary?.overdueTasksCount ?? 0 },
  { label: 'Ban tổ chức', value: report.departments?.length ?? 0 },
  { label: 'Task đang hiển thị', value: report.tasks?.length ?? 0 },
];

export const buildDashboardReport = ({
  event,
  department,
  summary,
  trendData = [],
  statusData = [],
  tasks = [],
  departments = [],
  members = [],
  range,
  note,
}) => ({
  generatedAt: new Date().toISOString(),
  event: {
    id: event?.id,
    name: event?.name || 'Sự kiện',
    status: event?.status,
    role: event?.role,
  },
  scope: department ? { type: 'department', id: department.id, name: department.name } : { type: 'event', name: 'Toàn bộ sự kiện' },
  range,
  summary,
  trendData,
  statusData,
  tasks: tasks.map((task) => ({
    id: task.id,
    title: task.title,
    departmentName: task.departmentName || 'Chưa gán ban',
    assigneeName: task.assigneeName || 'Chưa phân công',
    deadline: task.deadline,
    status: task.status,
    priority: task.priority || 'MEDIUM',
    progressPercentage: task.progressPercentage,
  })),
  departments,
  membersCount: members.length,
  note,
});

export const exportDashboardJson = (report) => {
  const fileName = `${sanitizeFileName(report.event?.name)}-${Date.now()}.json`;
  downloadTextFile({
    fileName,
    content: JSON.stringify(report, null, 2),
    type: 'application/json;charset=utf-8',
  });
};

export const exportDashboardCsv = (report) => {
  const rows = [
    ...metricRows(report).map((item) => ({
      section: 'Tổng quan',
      name: item.label,
      value: item.value,
      status: '',
      priority: '',
      department: '',
      assignee: '',
      deadline: '',
    })),
    ...(report.statusData || []).map((item) => ({
      section: 'Trạng thái',
      name: item.label,
      value: item.totalTasks ?? 0,
      status: item.label,
      priority: '',
      department: '',
      assignee: '',
      deadline: '',
    })),
    ...(report.tasks || []).map((task) => ({
      section: 'Công việc',
      name: task.title,
      value: task.progressPercentage ?? '',
      status: task.status,
      priority: task.priority,
      department: task.departmentName,
      assignee: task.assigneeName,
      deadline: formatDateTime(task.deadline),
    })),
  ];

  const csv = toCsv(rows, [
    { key: 'section', header: 'Nhóm dữ liệu' },
    { key: 'name', header: 'Tên' },
    { key: 'value', header: 'Giá trị' },
    { key: 'status', header: 'Trạng thái' },
    { key: 'priority', header: 'Ưu tiên' },
    { key: 'department', header: 'Ban' },
    { key: 'assignee', header: 'Phụ trách' },
    { key: 'deadline', header: 'Deadline' },
  ]);

  downloadTextFile({
    fileName: `${sanitizeFileName(report.event?.name)}-${Date.now()}.csv`,
    content: `\uFEFF${csv}`,
    type: 'text/csv;charset=utf-8',
  });
};

export const openPrintableDashboardReport = (report) => {
  const metrics = metricRows(report)
    .map((item) => `<div class="metric"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`)
    .join('');
  const taskRows = (report.tasks || [])
    .map((task) => `
      <tr>
        <td>${escapeHtml(task.title)}</td>
        <td>${escapeHtml(task.departmentName)}</td>
        <td>${escapeHtml(task.assigneeName)}</td>
        <td>${escapeHtml(formatDateTime(task.deadline))}</td>
        <td>${escapeHtml(task.priority)}</td>
        <td>${escapeHtml(task.status)}</td>
      </tr>
    `)
    .join('');
  const statusRows = (report.statusData || [])
    .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.totalTasks ?? 0)}</td></tr>`)
    .join('');

  const html = `<!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(report.event?.name)} - EventFlow report</title>
        <style>
          body { color: #0f172a; font-family: Inter, Arial, sans-serif; margin: 32px; }
          h1 { font-size: 28px; margin: 0 0 8px; }
          h2 { border-bottom: 1px solid #e2e8f0; font-size: 18px; margin-top: 28px; padding-bottom: 8px; }
          .muted { color: #64748b; }
          .grid { display: grid; gap: 12px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 20px; }
          .metric { border: 1px solid #dbe3ef; border-radius: 10px; padding: 14px; }
          .metric span { color: #64748b; display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; }
          .metric strong { display: block; font-size: 24px; margin-top: 8px; }
          table { border-collapse: collapse; margin-top: 12px; width: 100%; }
          th, td { border-bottom: 1px solid #e2e8f0; font-size: 12px; padding: 10px; text-align: left; }
          th { background: #f8fafc; color: #475569; text-transform: uppercase; }
          @media print { button { display: none; } body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">In / lưu PDF</button>
        <h1>${escapeHtml(report.event?.name)} - Báo cáo EventFlow</h1>
        <p class="muted">Phạm vi: ${escapeHtml(report.scope?.name)} • Kỳ: ${escapeHtml(report.range?.fromDate || '')} - ${escapeHtml(report.range?.toDate || '')} • Tạo lúc: ${escapeHtml(formatDateTime(report.generatedAt))}</p>
        ${report.note ? `<p class="muted">${escapeHtml(report.note)}</p>` : ''}
        <section class="grid">${metrics}</section>
        <h2>Trạng thái công việc</h2>
        <table><thead><tr><th>Trạng thái</th><th>Số lượng</th></tr></thead><tbody>${statusRows || '<tr><td colspan="2">Không có dữ liệu</td></tr>'}</tbody></table>
        <h2>Công việc đang hiển thị</h2>
        <table><thead><tr><th>Công việc</th><th>Ban</th><th>Phụ trách</th><th>Deadline</th><th>Ưu tiên</th><th>Trạng thái</th></tr></thead><tbody>${taskRows || '<tr><td colspan="6">Không có dữ liệu</td></tr>'}</tbody></table>
      </body>
    </html>`;

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    downloadTextFile({
      fileName: `${sanitizeFileName(report.event?.name)}-printable-${Date.now()}.html`,
      content: html,
      type: 'text/html;charset=utf-8',
    });
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
};
