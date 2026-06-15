import apiClient from './apiClient';

const workloadApi = {
  /**
   * Lấy workload tổng quan toàn event.
   * Dùng cho Event Leader.
   */
  getEventWorkload: async (eventId) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    const response = await apiClient.get(`/events/${eventId}/workload`);
    return response.data;
  },

  /**
   * Lấy workload của một department.
   * Dùng khi leader muốn xem tải công việc trong một ban.
   * Cũng dùng để hiển thị workload trong dropdown assign task.
   */
  getDepartmentWorkload: async ({ eventId, departmentId }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    if (!departmentId) {
      throw new Error('departmentId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/departments/${departmentId}/workload`
    );

    return response.data;
  },

  /**
   * Lấy workload chi tiết của một member.
   * Dùng khi cần xem riêng workload của một người.
   */
  getMemberWorkload: async ({ eventId, memberId }) => {
    if (!eventId) {
      throw new Error('eventId không hợp lệ');
    }

    if (!memberId) {
      throw new Error('memberId không hợp lệ');
    }

    const response = await apiClient.get(
      `/events/${eventId}/members/${memberId}/workload`
    );

    return response.data;
  },
};

export default workloadApi;