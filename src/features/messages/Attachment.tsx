import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
export interface ImageAttachment { id:string; filename:string; mime:string }
export function Attachment({file}:{file:ImageAttachment}) {
 const token=useStore((state)=>state.session?.token);const [url,setUrl]=useState('');const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();let localUrl='';setUrl('');setError('');
 fetch(`/api/attachment?id=${file.id}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal}).then(async(response)=>{if(!response.ok)throw new Error('Image expirée ou inaccessible.');const blob=await response.blob();if(controller.signal.aborted)return;localUrl=URL.createObjectURL(blob);setUrl(localUrl);}).catch(()=>{if(!controller.signal.aborted)setError('Image expirée ou inaccessible.');});
 return()=>{controller.abort();if(localUrl)URL.revokeObjectURL(localUrl);};},[file.id,token]);
 return error?<p role="status">{error}</p>:url?<a href={url} target="_blank" rel="noreferrer"><img className="message-image" src={url} alt={file.filename} /></a>:<p role="status">Chargement de l’image…</p>;
}
