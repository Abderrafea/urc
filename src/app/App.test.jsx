import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import { useStore } from '../store/useStore';
beforeEach(()=>{sessionStorage.clear();useStore.setState({session:null,users:[],rooms:[]});window.history.replaceState({},'', '/login');});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('la messagerie redirige une session absente vers la connexion',()=>{
 window.history.replaceState({},'', '/messages/room/1');render(<App/>);
 expect(screen.getByRole('heading',{name:'On se retrouve ici.'})).toBeInTheDocument();
 expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type','password');
});
test('une panne réseau est affichée sans perdre le formulaire',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));render(<App/>);
 fireEvent.change(screen.getByLabelText('Identifiant'),{target:{value:'alice'}});
 fireEvent.change(screen.getByLabelText('Mot de passe'),{target:{value:'password'}});
 fireEvent.submit(screen.getByRole('button',{name:'Se connecter'}).closest('form'));
 expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de contacter le serveur');
 expect(screen.getByRole('button',{name:'Se connecter'})).toBeEnabled();
});
test('le lien inscription ouvre le formulaire complet',()=>{render(<App/>);fireEvent.click(screen.getByRole('link',{name:'Créer un compte'}));expect(screen.getByLabelText('Email')).toHaveAttribute('type','email');});
