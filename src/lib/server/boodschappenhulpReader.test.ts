import {it,expect,vi,afterEach} from 'vitest';
import {catalogueProduct,readerAuthorized} from './boodschappenhulpReader';
vi.mock('node:fs/promises',async importOriginal=>{const actual=await importOriginal<typeof import('node:fs/promises')>(),readFile=vi.fn();return {...actual,readFile,default:{...actual,readFile}};});
vi.mock('./dataDir',()=>({getDataPath:()=>'/isolated-read-secret',getResolvedDataDir:()=>'/isolated'}));
import {readFile} from 'node:fs/promises';
afterEach(()=>vi.clearAllMocks());
it('preserves unknown price and availability instead of converting them to zero or true',()=>{
 expect(catalogueProduct({webshopId:1,title:'Product',currentPrice:null},'2026-10-06')).toMatchObject({priceCents:null,priceKind:'unknown',available:null,orderable:null,minBestBeforeDays:null});
 expect(catalogueProduct({webshopId:2,title:'Tofu',priceBeforeBonus:1.89,availableOnline:true,isOrderable:false,minBestBeforeDays:7,propertyIcons:['vegan']},'2026-10-06')).toMatchObject({priceCents:189,priceKind:'list',orderable:false,minBestBeforeDays:7,properties:['vegan']});expect(catalogueProduct({},'2026-10-06')).toBeNull();
});
it('fails closed without the specific scoped secret and uses a constant time match',async()=>{
 vi.mocked(readFile).mockResolvedValue('a'.repeat(64));expect(await readerAuthorized(null)).toBe(false);expect(await readerAuthorized('Bearer '+'b'.repeat(64))).toBe(false);expect(await readerAuthorized('Bearer '+'a'.repeat(64))).toBe(true);vi.mocked(readFile).mockRejectedValue(Error('Missing file'));expect(await readerAuthorized('Bearer '+'a'.repeat(64))).toBe(false);
});
