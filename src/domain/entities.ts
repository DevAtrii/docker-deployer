export interface User {
  id: string;
  username: string;
  role: string;
  port_range: string;
  storage_limit_mb: number;
  cpu_limit: number;       // 0 = unlimited
  ram_limit_mb: number;    // 0 = unlimited
  token_aliases: string[];
  tokens_detailed?: { alias: string; username?: string; registry?: string }[];
}

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  image: string;
  ports: Record<string, string>;
  created: string;
}

export interface ImageInfo {
  id: string;
  tags: string[];
  size: number;
  created: string;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  last_modified: number;
}
