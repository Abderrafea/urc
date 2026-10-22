import { redis } from '../lib/redis.js';
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({message:'Méthode non autorisée.'});}
 const authorization=new Headers(req.headers).get('Authorization');
 if(!authorization?.startsWith('Bearer '))return res.status(401).json({message:'Session absente.'});
 try{await redis.del(authorization.slice(7).trim());return res.status(204).send('');}
 catch{return res.status(500).json({message:'Déconnexion serveur indisponible.'});}
}
