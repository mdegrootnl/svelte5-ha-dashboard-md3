import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
let dir:string;
beforeEach(async()=>{dir=await fs.mkdtemp(path.join(os.tmpdir(),'ah-owner-'));vi.resetModules();vi.doMock('$lib/server/dataDir',()=>({getResolvedDataDir:()=>dir}));});
afterEach(async()=>{vi.doUnmock('$lib/server/dataDir');vi.unstubAllGlobals();await fs.rm(dir,{recursive:true,force:true});});
it('retains old token data for recovery but never uses, refreshes or overwrites it after transfer',async()=>{
 const {AhSettingsService}=await import('./ahSettings');const {refreshAhAccessToken,getAuthenticatedAhToken,getAhReceipts,exchangeAhCode,exportAhShoppingList}=await import('./ahClient');await AhSettingsService.saveRuntime({accessToken:'old-secret',refreshToken:'old-refresh'});await fs.writeFile(path.join(dir,'ah-owner.json'),JSON.stringify({owner:'boodschappenhulp',baseUrl:'http://boodschappenhulp-web-1:3000',secret:'a'.repeat(64)}));
 const transport=vi.fn(async(input:unknown,init:RequestInit)=>{expect(String(input)).toBe('http://boodschappenhulp-web-1:3000/api/v1/integrations/dashboard');expect(JSON.parse(init.body as string).operation).toBe('receipts');return Response.json({data:{posReceiptsPage:{posReceipts:[]}}});});
 expect(await AhSettingsService.loadRuntime()).toEqual({});await expect(refreshAhAccessToken(transport as typeof fetch)).rejects.toThrow('overgedragen');await expect(getAuthenticatedAhToken(transport as typeof fetch)).rejects.toThrow('uitsluitend');await expect(exchangeAhCode('code',transport as typeof fetch)).rejects.toThrow('via Boodschappenhulp');await expect(AhSettingsService.saveRuntime({accessToken:'overwrite'})).rejects.toThrow('overgedragen');
 expect(await getAhReceipts(transport as typeof fetch,1)).toEqual([]);expect(transport).toHaveBeenCalledTimes(1);await expect(exportAhShoppingList([{} as any],transport as typeof fetch)).rejects.toThrow('mandaat');expect(transport).toHaveBeenCalledTimes(1);expect(JSON.parse(await fs.readFile(path.join(dir,'ah-settings.json'),'utf8')).accessToken).toBe('old-secret');
});
it('fails closed on an unreadable/invalid ownership file instead of falling back to dashboard refresh',async()=>{
 const {AhSettingsService}=await import('./ahSettings');await AhSettingsService.saveRuntime({refreshToken:'old-secret'});await fs.writeFile(path.join(dir,'ah-owner.json'),'{}');await expect(AhSettingsService.loadRuntime()).rejects.toThrow();await expect(AhSettingsService.saveRuntime({accessToken:'new'})).rejects.toThrow();
});
