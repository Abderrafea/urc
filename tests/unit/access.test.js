import { expect,test,vi } from 'vitest';
vi.mock('@vercel/postgres',()=>({sql:vi.fn()}));
import {sql} from '@vercel/postgres';
import {getRoomAccess} from '../../lib/roomAccess.js';
test('un salon privé absent ou non rejoint est masqué',async()=>{
 sql.mockResolvedValueOnce({rows:[]});expect(await getRoomAccess(1,2)).toBeNull();
 sql.mockResolvedValueOnce({rows:[{room_id:1,is_private:true,joined:false}]});expect(await getRoomAccess(1,2)).toBeNull();
});
test('un membre accède à son salon privé et les salons publics restent découvrables',async()=>{
 sql.mockResolvedValueOnce({rows:[{room_id:1,is_private:true,joined:true}]});expect((await getRoomAccess(1,2)).room_id).toBe(1);
 sql.mockResolvedValueOnce({rows:[{room_id:3,is_private:false,joined:false}]});expect((await getRoomAccess(3,2)).room_id).toBe(3);
});
