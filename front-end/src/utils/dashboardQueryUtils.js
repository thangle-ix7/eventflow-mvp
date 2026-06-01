export const invalidateDashboardQueries = (queryClient, eventId) => {
  queryClient.invalidateQueries({ queryKey: ['dashboardSummary', eventId] });
  queryClient.invalidateQueries({ queryKey: ['departmentDashboardSummary', eventId] });
  queryClient.invalidateQueries({ queryKey: ['eventDashboardComparison', eventId] });
  queryClient.invalidateQueries({ queryKey: ['eventTaskStatusTrend', eventId] });
  queryClient.invalidateQueries({ queryKey: ['departmentTaskStatusTrend', eventId] });
  queryClient.invalidateQueries({ queryKey: ['eventTasksByStatus', eventId] });
  queryClient.invalidateQueries({ queryKey: ['departmentTasksByStatus', eventId] });
  queryClient.invalidateQueries({ queryKey: ['eventDashboardTasks', eventId] });
  queryClient.invalidateQueries({ queryKey: ['departmentDashboardTasks', eventId] });
};
