import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session } from '../shared/types/common';

import type { PublicUser, Room } from '../shared/types/chat';

interface State {
  rooms: Room[];
  selectedRoomId: number | null;
  setRooms: (rooms: Room[]) => void;
  selectRoom: (id: number | null) => void;
  session: Session | null;
  users: PublicUser[];
  selectedUserId: number | null;
  setSession: (session: Session) => void;
  setUsers: (users: PublicUser[]) => void;
  selectUser: (id: number | null) => void;
  logout: () => void;
}
export const useStore = create<State>()(persist((set, get) => ({
  session: null, users: [], rooms: [], selectedRoomId: null, selectedUserId: null,
  setRooms: (rooms) => set({ rooms }),
  selectRoom: (selectedRoomId) => set({ selectedRoomId }),
  setSession: (session) => set({ session, users: [], rooms: [], selectedRoomId: null, selectedUserId: null }),
  setUsers: (users) => set({ users }),
  selectUser: (selectedUserId) => set({ selectedUserId }),
  logout: () => {
    const token=get().session?.token;
    if(token) void fetch('/api/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`},keepalive:true}).catch(()=>{});
    ['token', 'externalId', 'username'].forEach((key) => sessionStorage.removeItem(key));
    set({ session: null, users: [], rooms: [], selectedRoomId: null, selectedUserId: null });
  },
}), {
  name: 'urc-session',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ session: state.session }),
}));
