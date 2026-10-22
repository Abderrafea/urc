export function detectImage(data) {
 if(typeof data!=='string'||data.length>1398104||!data.length||data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))return null;
 const b=Buffer.from(data,'base64');if(!b.length||b.length>1048576)return null;
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png'};
 if(b.length>=4&&b[0]===255&&b[1]===216&&b[2]===255)return {mime:'image/jpeg'};
 if(b.length>=13&&['GIF87a','GIF89a'].includes(b.toString('ascii',0,6)))return {mime:'image/gif'};
 if(b.length>=16&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return {mime:'image/webp'};
 return null;
}
