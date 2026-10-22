export interface PublicUser { user_id: number; username: string; last_login: string | null }
export interface Room { room_id: number; name: string; joined: boolean; is_private?: boolean; created_by?: number }
