import { sql } from '@vercel/postgres';
import { getConnecterUser } from '../lib/session.js';
import { getRoomAccess } from '../lib/roomAccess.js';
import { detectImage } from '../lib/images.js';
export default async function handler(req,res) {
 if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); return res.status(405).json({message:'Méthode non autorisée.'}); }
 try {
  const user=await getConnecterUser(req);
  if (!user) return res.status(401).json({message:'Session expirée.'});
  if (req.method==='GET') {
   if (typeof req.query.id!=='string' || !/^[a-f0-9-]{36}$/.test(req.query.id)) return res.status(400).json({message:'Image invalide.'});
   const found=await sql`SELECT * FROM attachments WHERE attachment_id=${req.query.id} AND expires_on>NOW()`;
   const file=found.rows[0];
   if (!file) return res.status(404).json({message:'Image expirée ou introuvable.'});
   if (file.room_id) { if (!await getRoomAccess(file.room_id,user.id)) return res.status(404).json({message:'Image introuvable.'}); }
   else if (file.owner_id!==user.id && file.target_user_id!==user.id) return res.status(404).json({message:'Image introuvable.'});
   res.setHeader('Content-Type',file.mime);res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
   return res.status(200).send(Buffer.from(file.data,'base64'));
  }
  let body=req.body;if(typeof body==='string') { try{body=JSON.parse(body)}catch{return res.status(400).json({message:'Requête invalide.'})} }
  const room=body?.roomId!==undefined;const id=room?body.roomId:body?.targetUserId;
  if(!Number.isSafeInteger(id)||id<=0||(!room&&id===user.id)||(room&&body.targetUserId!==undefined)) return res.status(400).json({message:'Destinataire invalide.'});
  if(room) { const target=await getRoomAccess(id,user.id);if(!target?.joined)return res.status(403).json({message:'Rejoignez le salon avant de partager une image.'}); }
  else {const target=await sql`SELECT user_id FROM users WHERE user_id=${id}`;if(!target.rowCount)return res.status(404).json({message:'Utilisateur introuvable.'});}
  const image=detectImage(body?.data);
  if(!image)return res.status(400).json({message:'Image PNG, JPEG, GIF ou WebP de 1 Mo maximum requise.'});
  const filename=typeof body.filename==='string'?body.filename.slice(0,200):'image';const attachmentId=crypto.randomUUID();
  await sql`DELETE FROM attachments WHERE expires_on<NOW()`;
  await sql`INSERT INTO attachments(attachment_id,owner_id,target_user_id,room_id,mime,filename,data) VALUES (${attachmentId},${user.id},${room?null:id},${room?id:null},${image.mime},${filename},${body.data})`;
  return res.status(201).json({id:attachmentId,filename,mime:image.mime});
 }catch(error){console.error('Attachment failed',error.code||error.name);return res.status(500).json({message:'Image indisponible.'});}
}
