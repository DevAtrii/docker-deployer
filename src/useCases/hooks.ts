import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../data/api';
import { ContainerInfo, FileItem, ImageInfo, User } from '../domain/entities';

// Auth
export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) throw new Error('Not authenticated');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload as { user_id: string; role: string };
    },
    retry: false,
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
    retry: false,
  });
};

// Docker Info
export const useDockerInfo = () => {
  return useQuery({
    queryKey: ['docker-info'],
    queryFn: async () => (await apiClient.get('/containers/docker-info')).data,
    refetchInterval: 15000,
  });
};

// Containers
export const useContainers = () => {
  return useQuery({
    queryKey: ['containers'],
    queryFn: async () => (await apiClient.get<ContainerInfo[]>('/containers/')).data,
  });
};

export const useDeployContainer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      image: string;
      port_mappings: Record<string, string>;
      volumes?: { host_path: string; container_path: string; mode: string }[];
    }) => apiClient.post('/containers/deploy', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['containers'] }),
  });
};

export const useContainerAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'stop' | 'pause' | 'resume' | 'delete' }) => {
      if (action === 'delete') return apiClient.delete(`/containers/${id}`);
      return apiClient.post(`/containers/${id}/${action}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['containers'] }),
  });
};

export const useContainerStats = (containerId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['container-stats', containerId],
    queryFn: async () => (await apiClient.get(`/containers/${containerId}/stats`)).data,
    enabled: enabled,
    refetchInterval: 5000,
  });
};

export const useRedeployContainer = () => {
  return useMutation({
    mutationFn: async (containerId: string) =>
      (await apiClient.post(`/containers/${containerId}/redeploy`)).data as { task_id: string; message: string },
  });
};

export const useRedeployStatus = (taskId: string | null) => {
  return useQuery({
    queryKey: ['redeploy-status', taskId],
    queryFn: async () =>
      (await apiClient.get(`/containers/redeploy-status/${taskId}`)).data as {
        status: string; phase: string; logs: string[]; container_name: string; image: string;
      },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === 'completed' || data?.status === 'error') return false;
      return 1000;
    },
  });
};

// Files
export const useFiles = (path: string) => {
  return useQuery({
    queryKey: ['files', path],
    queryFn: async () => (await apiClient.get<FileItem[]>(`/files/list?path=${encodeURIComponent(path)}`)).data,
  });
};

export const useFileActions = () => {
  const qc = useQueryClient();
  return {
    read: async (path: string) => (await apiClient.get(`/files/read?path=${encodeURIComponent(path)}`)).data.content,
    write: useMutation({
      mutationFn: async ({ path, content }: { path: string; content: string }) =>
        apiClient.post('/files/write', { path, content }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
    }),
    delete: useMutation({
      mutationFn: async (path: string) => apiClient.delete(`/files/delete?path=${encodeURIComponent(path)}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
    }),
    deleteDir: useMutation({
      mutationFn: async (path: string) => apiClient.delete(`/files/dir/delete?path=${encodeURIComponent(path)}`),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
    }),
    createDir: useMutation({
      mutationFn: async (path: string) => apiClient.post('/files/dir/create', { path }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
    }),
  };
};

// Images
export const useImages = () => {
  return useQuery({
    queryKey: ['images'],
    queryFn: async () => (await apiClient.get<ImageInfo[]>('/images/')).data,
  });
};

export const usePullImage = () => {
  return useMutation({
    mutationFn: async (data: { image_name: string; token_alias?: string | null }) => 
      (await apiClient.post('/images/pull', data)).data as { task_id: string; message: string },
  });
};

export const usePullStatus = (taskId: string | null) => {
  return useQuery({
    queryKey: ['pull-status', taskId],
    queryFn: async () => (await apiClient.get(`/images/pull/${taskId}`)).data as { status: string; logs: string[]; image_name: string },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === 'completed' || data?.status === 'error') return false;
      return 1000;
    },
  });
};

// Admin — Users
export const useUsers = () => {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await apiClient.get<User[]>('/admin/users')).data,
  });
};

// Admin — per-user views
export const useAdminUserContainers = (userId: string | null) => {
  return useQuery({
    queryKey: ['admin-containers', userId],
    queryFn: async () => (await apiClient.get<ContainerInfo[]>(`/admin/users/${userId}/containers`)).data,
    enabled: !!userId,
  });
};

export const useAdminUserImages = (userId: string | null) => {
  return useQuery({
    queryKey: ['admin-images', userId],
    queryFn: async () => (await apiClient.get<ImageInfo[]>(`/admin/users/${userId}/images`)).data,
    enabled: !!userId,
  });
};

export const useAdminUserTokens = (userId: string | null) => {
  return useQuery({
    queryKey: ['admin-tokens', userId],
    queryFn: async () => (await apiClient.get(`/admin/users/${userId}/tokens`)).data.aliases as string[],
    enabled: !!userId,
  });
};

// Admin — container actions
export const useAdminContainerAction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'stop' | 'pause' | 'delete' }) => {
      if (action === 'delete') return apiClient.delete(`/admin/containers/${id}`);
      return apiClient.post(`/admin/containers/${id}/${action}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-containers'] }),
  });
};

// Impersonation
export const useImpersonate = () => {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/admin/users/${userId}/impersonate`);
      return res.data as { token: string; user: { username: string; id: string } };
    },
  });
};
