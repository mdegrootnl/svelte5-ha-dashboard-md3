import fs from 'fs/promises';
import path from 'path';
import {getResolvedDataDir} from './dataDir';
type Owner={owner:'boodschappenhulp';baseUrl:string;secret:string};
export async function ahOwner():Promise<Owner|null>{
 let data:string;try{data=await fs.readFile(path.join(getResolvedDataDir(),'ah-owner.json'),'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw Error('AH-eigendom kan niet worden gecontroleerd');}
 const owner=JSON.parse(data) as Owner,url=new URL(owner.baseUrl);if(owner.owner!=='boodschappenhulp'||!/^([a-f0-9]{64})$/.test(owner.secret)||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol))throw Error('Ongeldige AH-eigendomconfiguratie');return owner;
}
export async function readFromAhOwner(input:unknown,transport:typeof fetch=fetch){
 const owner=await ahOwner();if(!owner)throw Error('AH is nog niet overgedragen');
 const response=await transport(owner.baseUrl.replace(/\/$/,'')+'/api/v1/integrations/dashboard',{method:'POST',headers:{authorization:'Bearer '+owner.secret,'content-type':'application/json'},body:JSON.stringify(input),redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('AH koppelen of verbinding controleren in Boodschappenhulp');const text=await response.text();if(text.length>4000000)throw Error('AH-leesantwoord te groot');return JSON.parse(text);
}
