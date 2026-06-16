import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Edit2, ListChecks, Plus, Tag, Target, Trash2, UsersRound } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';
import {
  Button,
  ErrorState,
  EmptyState,
  LoadingState,
  MetricCard,
  PriorityBadge,
  StatusBadge,
} from '../components/ui';
import AdminTemplateDepartmentModal from '../components/AdminTemplateDepartmentModal';
import AdminTemplateTaskModal from '../components/AdminTemplateTaskModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import templateApi from '../api/templateApi';
import { formatDate } from '../utils/dateUtils';
import { getEventTypeLabel } from '../utils/eventTypeUtils';

const toArray = (data) => data?.content || (Array.isArray(data) ? data : []);

const normalizeTasks = (rawTasks) => {
  if (!rawTasks) {
    return [];
  }

  if (Array.isArray(rawTasks) && rawTasks.some((item) => Array.isArray(item?.tasks))) {
    return rawTasks.flatMap((group) =>
      (group.tasks || []).map((task) => ({
        ...task,
        departmentId: task.departmentId ?? group.departmentId ?? group.id ?? null,
        departmentName: task.departmentName ?? group.departmentName ?? group.name ?? null,
      }))
    );
  }

  return toArray(rawTasks);
};

const AdminTemplateDetailPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { templateId } = useParams();
  
  const [deptModal, setDeptModal] = useState({ isOpen: false, department: null });
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, target: null, type: null });

  // Queries
  const query = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templateApi.getTemplate(templateId),
    enabled: Boolean(templateId),
  });


    // Kéo dữ liệu phòng ban
  const departmentsQuery = useQuery({
    queryKey: ['departments', templateId],
    queryFn: () => departmentApi.getEventDepartments(templateId),
    enabled: Boolean(templateId),
  });

  // Kéo dữ liệu task
  const tasksQuery = useQuery({
    queryKey: ['tasks', templateId],
    queryFn: () => taskApi.getEventTasks(templateId),
    enabled: Boolean(templateId),
  });

  const template = query.data;
  const departments = toArray(departmentsQuery.data);
  const tasks = normalizeTasks(tasksQuery.data);
  const departmentLookup = new Map(departments.map((dept) => [Number(dept.id), dept]));
  const tasksByDepartment = departments.map((dept) => ({
    ...dept,
    tasks: tasks.filter((task) => Number(task.departmentId) === Number(dept.id)),
  }));
  const unassignedTasks = tasks.filter((task) => !task.departmentId);

  const refreshTemplateWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    queryClient.invalidateQueries({ queryKey: ['departments', templateId] });
    queryClient.invalidateQueries({ queryKey: ['tasks', templateId] });
    queryClient.invalidateQueries({ queryKey: ['templatesPage'] });
    queryClient.invalidateQueries({ queryKey: ['adminTemplatesPage'] });
  };

  // Mutations
  const addDeptMutation = useMutation({
    mutationFn: (payload) => templateApi.addDepartmentToTemplate(templateId, payload),
    onSuccess: () => {
      setDeptModal({ isOpen: false, department: null });
      refreshTemplateWorkspace();
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: (payload) => 
      templateApi.updateTemplateDepartment(templateId, deptModal.department.id, payload),
    onSuccess: () => {
      setDeptModal({ isOpen: false, department: null });
      refreshTemplateWorkspace();
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: () => 
      templateApi.deleteTemplateDepartment(templateId, deleteModal.target.id),
    onSuccess: () => {
      setDeleteModal({ isOpen: false, target: null, type: null });
      refreshTemplateWorkspace();
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: (payload) => templateApi.addTaskToTemplate(templateId, payload),
    onSuccess: () => {
      setTaskModal({ isOpen: false, task: null });
      refreshTemplateWorkspace();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload) => 
      templateApi.updateTemplateTask(templateId, taskModal.task.id, payload),
    onSuccess: () => {
      setTaskModal({ isOpen: false, task: null });
      refreshTemplateWorkspace();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => 
      templateApi.deleteTemplateTask(templateId, deleteModal.target.id),
    onSuccess: () => {
      setDeleteModal({ isOpen: false, target: null, type: null });
      refreshTemplateWorkspace();
    },
  });


  const handleAddDept = () => {
    setDeptModal({ isOpen: true, department: null });
  };

  const handleEditDept = (dept) => {
    setDeptModal({ isOpen: true, department: dept });
  };

  const handleSaveDept = (formData) => {
    if (deptModal.department) {
      updateDeptMutation.mutate(formData);
    } else {
      addDeptMutation.mutate(formData);
    }
  };

  const handleDeleteDept = (dept) => {
    setDeleteModal({ isOpen: true, target: dept, type: 'department' });
  };

  const handleAddTask = () => {
    setTaskModal({ isOpen: true, task: null });
  };

  const handleEditTask = (task) => {
    setTaskModal({ isOpen: true, task });
  };

  const handleSaveTask = (formData) => {
    if (taskModal.task) {
      updateTaskMutation.mutate(formData);
    } else {
      addTaskMutation.mutate(formData);
    }
  };

  const handleDeleteTask = (task) => {
    setDeleteModal({ isOpen: true, target: task, type: 'task' });
  };

  const confirmDelete = () => {
    if (deleteModal.type === 'department') {
      deleteDeptMutation.mutate();
    } else if (deleteModal.type === 'task') {
      deleteTaskMutation.mutate();
    }
  };

  if (query.isLoading) {
    return (
      <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
        <LoadingState message="Đang tải template..." />
      </AppLayout>
    );
  }

  if (query.error || !template) {
    return (
      <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
        <div className="mx-auto max-w-7xl">
          <ErrorState
            error={query.error}
            title="Không tải được template"
            onDismiss={() => navigate('/admin/templates')}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="flex items-start gap-4">
          <Button
            variant="subtle"
            onClick={() => navigate('/admin/templates')}
            className="flex-none"
          >
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-950">{template.name}</h1>
            {template.description && (
              <p className="mt-2 text-slate-600">{template.description}</p>
            )}
          </div>
        </section>

        {/* Template Info */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Tag}
            label="Loại sự kiện"
            value={getEventTypeLabel(template.eventType)}
            hint={template.scale || 'Template public cho user sử dụng'}
            tone="emerald"
          />
          <MetricCard
            icon={Building2}
            label="Phòng ban"
            value={departments.length}
            hint="Nhóm việc sẽ được clone sang event mới"
            tone="sky"
          />
          <MetricCard
            icon={ListChecks}
            label="Task"
            value={tasks.length}
            hint={`${unassignedTasks.length} task chưa gán phòng ban`}
            tone="amber"
          />
          <MetricCard
            icon={UsersRound}
            label="Người dự kiến"
            value={template.expectedAttendees ?? 'Chưa nhập'}
            hint={`Tạo lúc ${formatDate(template.createdAt)}`}
            tone="slate"
          />
        </section>

        {(template.objective || template.contextDescription) && (
          <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Event brief</h2>
                {template.objective && (
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    {template.objective}
                  </p>
                )}
                {template.contextDescription && (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
                    {template.contextDescription}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Departments Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950">
              Phòng ban ({departments?.length || 0})
            </h2>
            <Button onClick={handleAddDept} size="sm" className="text-xs">
              <Plus size={16} />
              Thêm
            </Button>
          </div>
          
          {departments.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-950">{dept.name}</h3>
                      {dept.description ? (
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{dept.description}</p>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-slate-400">Chưa có mô tả</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleEditDept(dept)}
                        className="px-3 text-xs"
                        title="Sửa phòng ban"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteDept(dept)}
                        className="px-3 text-xs"
                        title="Xóa phòng ban"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
                    {tasksByDepartment.find((item) => item.id === dept.id)?.tasks.length || 0} task đang map
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="Chưa có phòng ban"
              description='Nhấp "Thêm" để tạo phòng ban đầu tiên cho template.'
            />
          )}
        </section>

        {/* Tasks Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-950">
              Task ({tasks.length || 0})
            </h2>
            <Button onClick={handleAddTask} size="sm" className="text-xs">
              <Plus size={16} />
              Thêm
            </Button>
          </div>
          
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {[...tasksByDepartment, ...(unassignedTasks.length ? [{ id: 'unassigned', name: 'Chưa gán phòng ban', tasks: unassignedTasks }] : [])]
                .filter((group) => group.tasks.length > 0)
                .map((group) => (
                  <div key={group.id} className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{group.name}</h3>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          {group.tasks.length} task
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {group.tasks.map((task) => {
                        const department = task.departmentId ? departmentLookup.get(Number(task.departmentId)) : null;
                        const taskTitle = task.title || task.name || 'Task chưa có tiêu đề';

                        return (
                          <div
                            key={task.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="font-black text-slate-950">{taskTitle}</h4>
                                {task.description ? (
                                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{task.description}</p>
                                ) : (
                                  <p className="mt-1 text-sm font-semibold text-slate-400">Chưa có mô tả</p>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  variant="secondary"
                                  onClick={() => handleEditTask(task)}
                                  className="px-3 text-xs"
                                  title="Sửa task"
                                >
                                  <Edit2 size={14} />
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => handleDeleteTask(task)}
                                  className="px-3 text-xs"
                                  title="Xóa task"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <PriorityBadge priority={task.priority || 'MEDIUM'} />
                              <StatusBadge status={task.status || 'TODO'} />
                              <span className="inline-flex w-fit items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
                                {department?.name || task.departmentName || 'Chưa gán phòng ban'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState
              icon={ListChecks}
              title="Chưa có task"
              description='Nhấp "Thêm" để tạo task đầu tiên và map task vào phòng ban.'
            />
          )}
        </section>
      </div>

      {/* Modals */}
      <AdminTemplateDepartmentModal
        key={deptModal.department?.id || 'new'}
        isOpen={deptModal.isOpen}
        department={deptModal.department}
        isLoading={addDeptMutation.isPending || updateDeptMutation.isPending}
        error={addDeptMutation.error || updateDeptMutation.error}
        onSubmit={handleSaveDept}
        onClose={() => setDeptModal({ isOpen: false, department: null })}
      />

      <AdminTemplateTaskModal
        key={taskModal.task?.id || 'new'}
        isOpen={taskModal.isOpen}
        task={taskModal.task}
        departments={departments}
        isLoading={addTaskMutation.isPending || updateTaskMutation.isPending}
        error={addTaskMutation.error || updateTaskMutation.error}
        onSubmit={handleSaveTask}
        onClose={() => setTaskModal({ isOpen: false, task: null })}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${deleteModal.type === 'department' ? 'phòng ban' : 'task'} "${deleteModal.target?.name || deleteModal.target?.title}"?`}
        isLoading={deleteDeptMutation.isPending || deleteTaskMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, target: null, type: null })}
      />
    </AppLayout>
  );
};

export default AdminTemplateDetailPage;
