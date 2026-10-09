import {it,expect,vi,afterEach} from 'vitest';
vi.mock('$lib/server/ahClient',()=>({searchAhProductsRaw:vi.fn(),getAhProductRaw:vi.fn()}));
vi.mock('$lib/server/boodschappenhulpReader',async original=>({...await original<typeof import('$lib/server/boodschappenhulpReader')>(),readerAuthorized:vi.fn()}));
import {GET} from './+server';
import {searchAhProductsRaw,getAhProductRaw} from '$lib/server/ahClient';
import {readerAuthorized} from '$lib/server/boodschappenhulpReader';
afterEach(()=>vi.resetAllMocks());
async function read(parameters:string){const url=new URL('http://local/api/ah/boodschappenhulp/products'+parameters);return GET({url,request:new Request(url,{headers:{authorization:'Bearer scoped-test-secret'}})} as Parameters<typeof GET>[0]);}
it('rejects unscoped callers and invalid or mixed lookups before touching AH tokens',async()=>{
 vi.mocked(readerAuthorized).mockResolvedValue(false);expect((await read('?query=tofu')).status).toBe(401);vi.mocked(readerAuthorized).mockResolvedValue(true);for(const p of ['?query=tofu&sku=1','?sku=0','?query=tofu&limit=31','?query=tofu&limit=NaN'])expect((await read(p)).status).toBe(400);expect(searchAhProductsRaw).not.toHaveBeenCalled();expect(getAhProductRaw).not.toHaveBeenCalled();
});
it('returns public whitelisted product detail, preserving unknown flags and binding the SKU',async()=>{
 vi.mocked(readerAuthorized).mockResolvedValue(true);vi.mocked(getAhProductRaw).mockResolvedValue({productId:1,productCard:{webshopId:1,title:'Tofu',salesUnitSize:'500 g'},tradeItem:{gtin:'00000000000001',consumerInstructions:{storageInstructions:['Niet invriezen']},nutritionalInformation:{},unrelated:{accountToken:'must-not-leave'}}});const response=await read('?sku=1'),body=await response.json();expect(response.status).toBe(200);expect(body.products[0]).toMatchObject({sku:'1',priceCents:null,orderable:null,detail:{gtin:'00000000000001'}});expect(body.products[0].detail.unrelated).toBeUndefined();expect(response.headers.get('cache-control')).toBe('no-store');vi.mocked(getAhProductRaw).mockResolvedValue({productId:2,productCard:{webshopId:2,title:'Other'}});expect((await read('?sku=1')).status).toBe(502);
});
it.each([
 ['?query=mango&limit=30',30],['?query=mango&limit=4',4],['?query=mango',8]
] as const)('bounds an oversized upstream search response for %s while retaining ranked valid public products',async(parameters,limit)=>{
  vi.mocked(readerAuthorized).mockResolvedValue(true);
  const ranked=Array.from({length:45},(_,i)=>({webshopId:100+i,title:'Mango '+i,salesUnitSize:'1 stuk',priceBeforeBonus:1.49,...(i===0?{availableOnline:false}:{}),unrelated:{accountToken:'synthetic-never-export'}}));
  // Invalid products at the front must not use up the requested public result limit.
  vi.mocked(searchAhProductsRaw).mockResolvedValue([{webshopId:0,title:'Missing identity'},{webshopId:999,title:' '},...ranked]);
  const response=await read(parameters),body=await response.json();expect(response.status).toBe(200);expect(Object.keys(body).sort()).toEqual(['products','version']);expect(body.version).toBe(1);
  expect(body.products).toHaveLength(limit);expect(body.products.map((p:{sku:string})=>p.sku)).toEqual(ranked.slice(0,limit).map(p=>String(p.webshopId)));
  expect(body.products[0]).toMatchObject({sku:'100',priceCents:149,priceKind:'list',available:false,orderable:null});expect(body.products[1]).toMatchObject({available:null,orderable:null});
  expect(body.products.every((p:Record<string,unknown>)=>!Object.hasOwn(p,'unrelated'))).toBe(true);expect(new Set(body.products.map((p:{capturedAt:string})=>p.capturedAt)).size).toBe(1);
  expect(response.headers.get('cache-control')).toBe('no-store');expect(searchAhProductsRaw).toHaveBeenCalledOnce();expect(searchAhProductsRaw).toHaveBeenCalledWith('mango',limit,expect.any(Function));expect(getAhProductRaw).not.toHaveBeenCalled();
});
