import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';
import {
  Button,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../components/ui';
import AdminTemplateDepartmentModal from '../components/AdminTemplateDepartmentModal';
import AdminTemplateTaskModal from '../components/AdminTemplateTaskModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import templateApi from '../api/templateApi';
import { formatDate } from '../utils/dateUtils';

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
  // Lấy data thô
  const rawDepartments = departmentsQuery.data || [];
  
  // Rút gọn mảng: Nếu có .content thì lấy .content, nếu không thì lấy chính nó
  const departments = rawDepartments.content || (Array.isArray(rawDepartments) ? rawDepartments : []);
  
  // Phẳng hóa mảng Task (Fix vụ không hiện tên task như đã nói ở tin nhắn trước)
  const rawTasks = tasksQuery.data || [];
  const tasks = rawTasks.length > 0 && rawTasks[0].tasks 
    ? rawTasks.flatMap(dept => dept.tasks) 
    : (rawTasks.content || rawTasks);

  // Mutations
  const addDeptMutation = useMutation({
    mutationFn: (payload) => templateApi.addDepartmentToTemplate(templateId, payload),
    onSuccess: () => {
      setDeptModal({ isOpen: false, department: null });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: (payload) => 
      templateApi.updateTemplateDepartment(templateId, deptModal.department.id, payload),
    onSuccess: () => {
      setDeptModal({ isOpen: false, department: null });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: () => 
      templateApi.deleteTemplateDepartment(templateId, deleteModal.target.id),
    onSuccess: () => {
      setDeleteModal({ isOpen: false, target: null, type: null });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: (payload) => templateApi.addTaskToTemplate(templateId, payload),
    onSuccess: () => {
      setTaskModal({ isOpen: false, task: null });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload) => 
      templateApi.updateTemplateTask(templateId, taskModal.task.id, payload),
    onSuccess: () => {
      setTaskModal({ isOpen: false, task: null });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => 
      templateApi.deleteTemplateTask(templateId, deleteModal.target.id),
    onSuccess: () => {
      setDeleteModal({ isOpen: false, target: null, type: null });
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
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
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">TRẠNG THÁI</p>
            <div className="mt-2">
              <StatusBadge status={template.status || 'ACTIVE'} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">PHÒNG BAN</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{departments.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">TASK</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{tasks.length || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">TẠO LÚC</p>
            <p className="mt-2 text-sm text-slate-600">{formatDate(template.createdAt)}</p>
          </div>
        </section>

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
          
          {departments && departments.length > 0 ? (
            <div className="space-y-3">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                    {dept.description && (
                      <p className="mt-1 text-sm text-slate-600">{dept.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleEditDept(dept)}
                      className="text-xs"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteDept(dept)}
                      className="text-xs"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              Chưa có phòng ban. Nhấp "Thêm" để tạo phòng ban đầu tiên.
            </div>
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
          
          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{task.name}</h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {task.priority && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                          {task.priority}
                        </span>
                      )}
                      {task.status && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleEditTask(task)}
                      className="text-xs"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteTask(task)}
                      className="text-xs"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              Chưa có task. Nhấp "Thêm" để tạo task đầu tiên.
            </div>
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
        message={`Bạn có chắc chắn muốn xóa ${deleteModal.type === 'department' ? 'phòng ban' : 'task'} "${deleteModal.target?.name}"?`}
        isLoading={deleteDeptMutation.isPending || deleteTaskMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, target: null, type: null })}
      />
    </AppLayout>
  );
};

export default AdminTemplateDetailPage;
