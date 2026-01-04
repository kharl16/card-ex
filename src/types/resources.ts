// Resource types for the Resources Hub

export type VisibilityLevel = 'public_members' | 'leaders_only' | 'admins_only' | 'super_admin_only';
export type ResourceRole = 'member' | 'leader' | 'admin' | 'super_admin';
export type ResourceType = 'file' | 'ambassador' | 'link' | 'way' | 'directory';
export type EventType = 'view' | 'open_link' | 'download' | 'share' | 'watch' | 'call' | 'open_maps' | 'favorite_add' | 'favorite_remove';

export interface FileResource {
  id: number;
  file_name: string;
  images: string | null;
  drive_link_download: string | null;
  drive_link_share: string | null;
  description: string | null;
  price_dp: string | null;
  price_srp: string | null;
  unilevel_points: number | null;
  folder_name: string | null;
  wholesale_package_commission: string | null;
  package_points_smc: string | null;
  rqv: string | null;
  infinity: string | null;
  check_match: string | null;
  give_me_5: string | null;
  just_4_you: string | null;
  view_video_url: string | null;
  visibility_level: VisibilityLevel;
  allowed_sites: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DirectoryEntry {
  id: number;
  location: string | null;
  address: string | null;
  maps_link: string | null;
  owner: string | null;
  facebook_page: string | null;
  operating_hours: string | null;
  phone_1: string | null;
  phone_2: string | null;
  phone_3: string | null;
  sites: string | null;
  visibility_level: VisibilityLevel;
  allowed_sites: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ambassador {
  id: string;
  product_endorsed: string | null;
  endorser: string | null;
  thumbnail: string | null;
  drive_link: string | null;
  drive_share_link: string | null;
  video_file_url: string | null;
  folder_name: string | null;
  visibility_level: VisibilityLevel;
  allowed_sites: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IAMLink {
  id: string;
  name: string;
  link: string;
  visibility_level: VisibilityLevel;
  allowed_sites: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Way13 {
  id: string;
  content: string;
  visibility_level: VisibilityLevel;
  allowed_sites: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceFolder {
  id: string;
  folder_name: string;
  images: string | null;
  visibility_level: VisibilityLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingFolder {
  id: string;
  folder_name: string;
  images: string | null;
  visibility_level: VisibilityLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  sites: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceUserRole {
  id: string;
  user_id: string;
  role: ResourceRole;
  assigned_sites: string[];
  created_at: string;
  updated_at: string;
}

export interface ResourceFavorite {
  id: string;
  user_id: string;
  resource_type: ResourceType;
  resource_id: string;
  created_at: string;
}

export interface ResourceEvent {
  id: string;
  user_id: string | null;
  resource_type: ResourceType;
  resource_id: string;
  event_type: EventType;
  created_at: string;
}

export interface SystemSettings {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}
