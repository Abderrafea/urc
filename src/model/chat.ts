export interface PublicUser {
  user_id: number;
  username: string;
  last_login: string | null;
}

export interface Room {
  room_id: number;
  name: string;
  joined: boolean;
  is_private?: boolean;
  created_by?: number;
}

export interface ImageAttachment {
  id: string;
  filename: string;
  mime: string;
}

export interface ReactionSummary {
  counts: Record<string, number>;
  mine: string | null;
}

export interface Message {
  attachment?: ImageAttachment;
  replyTo?: string;
  reactions?: ReactionSummary;
  id: string;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}
