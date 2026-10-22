import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Notifications } from './Notifications';
import { useStore } from './store';
afterEach(()=>{cleanup();vi.unstubAllGlobals();delete (navigator as any).serviceWorker;useStore.setState({session:null});});
test('le refus navigateur est expliqué sans lancer Pusher',async()=>{
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{}});
 vi.stubGlobal('isSecureContext',true);
 const requestPermission=vi.fn().mockResolvedValue('denied');
 vi.stubGlobal('Notification',{requestPermission});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({configured:true,instanceId:'instance-test'}),{status:200,headers:{'Content-Type':'application/json'}})));
 useStore.setState({session:{token:'test',externalId:'test',id:1}});
 render(<Notifications/>);
 fireEvent.click(await screen.findByRole('button',{name:'Activer les notifications'}));
 await waitFor(()=>expect(screen.getByRole('status').textContent).toMatch(/Notifications refusées/));
 expect(requestPermission).toHaveBeenCalledOnce();
});
