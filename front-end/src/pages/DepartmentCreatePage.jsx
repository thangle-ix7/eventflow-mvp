import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';

const DepartmentCreatePage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const mutation = useMutation({
    mutationFn: departmentApi.createDepartment,
    onSuccess: (department) => {
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      navigate(`/events/${eventId}/departments/${department.id}`, { replace: true });
    },
  });
  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({ eventId, payload: { name } });
  };
  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-xl space-y-6">
        <Link to={`/events/${eventId}/departments`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} />Quay lại departments</Link>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Tạo department</h2>
          {mutation.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mutation.error.userMessage || mutation.error.message}</div>}
          <label className="block"><span className="text-sm font-medium text-gray-700">Tên department</span><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></label>
          <button type="submit" disabled={mutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{mutation.isPending && <Loader2 size={16} className="animate-spin" />}Tạo department</button>
        </form>
      </div>
    </AppLayout>
  );
};

export default DepartmentCreatePage;
