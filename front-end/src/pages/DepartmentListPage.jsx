import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Plus } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';

const DepartmentListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const isLeader = event?.role === 'LEADER';

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} />Quay lại sự kiện</Link>
        <PageHeader
          eyebrow={event?.name || 'Sự kiện'}
          title="Ban tổ chức"
          description="Quản lý các nhóm phụ trách, xem task và dashboard riêng cho từng ban."
          actions={isLeader && (
            <Button as={Link} to={`/events/${eventId}/departments/new`}>
              <Plus size={18} />
              Tạo ban
            </Button>
          )}
        />
        <Panel>
          {departmentsQuery.isLoading && <LoadingState message="Đang tải danh sách ban..." />}
          {departmentsQuery.error && <div className="p-4"><ErrorState error={departmentsQuery.error} title="Không tải được danh sách ban" /></div>}
          {!departmentsQuery.isLoading && departmentsQuery.data?.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Building2} title="Chưa có ban tổ chức" description="Tạo ban đầu tiên để chia công việc theo nhóm phụ trách." />
            </div>
          )}
          {departmentsQuery.data?.map((department) => (
            <Link key={department.id} to={`/events/${eventId}/departments/${department.id}`} className="flex items-center gap-3 border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-indigo-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Building2 size={20} /></div>
              <div><p className="font-semibold text-slate-950">{department.name}</p><p className="text-sm text-slate-500">Xem công việc và dashboard của ban</p></div>
            </Link>
          ))}
        </Panel>
      </div>
    </AppLayout>
  );
};

export default DepartmentListPage;
