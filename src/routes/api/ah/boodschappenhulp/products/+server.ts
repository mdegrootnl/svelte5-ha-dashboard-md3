import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {searchAhProductsRaw,getAhProductRaw} from '$lib/server/ahClient';
import {readerAuthorized,catalogueProduct,catalogueDetail} from '$lib/server/boodschappenhulpReader';
export const GET:RequestHandler=async({url,request})=>{
 if(!await readerAuthorized(request.headers.get('authorization')))return json({error:'Leesinterface vereist autorisatie'},{status:401});
 const query=url.searchParams.get('query')?.trim()??'',sku=url.searchParams.get('sku')??'',limit=Number(url.searchParams.get('limit')??8);
 if(sku?query||!/^\d{1,10}$/.test(sku)||Number(sku)<=0:!query||query.length>120||!Number.isInteger(limit)||limit<1||limit>30)return json({error:'Controleer de zoekterm, SKU en limiet'},{status:400});
 try{const capturedAt=new Date().toISOString(),transport:typeof globalThis.fetch=(input,init)=>globalThis.fetch(input,{...init,signal:AbortSignal.timeout(15000)});
  if(sku){const raw=await getAhProductRaw(Number(sku),transport),product=catalogueProduct(raw.productCard,capturedAt);if(raw.productId!==Number(sku)||product?.sku!==sku)throw Error('Product binding changed');return json({version:1,products:[{...product,detail:catalogueDetail(raw.tradeItem)}]},{headers:{'cache-control':'no-store'}});}
  const raw=await searchAhProductsRaw(query,limit,transport);return json({version:1,products:raw.map(p=>catalogueProduct(p,capturedAt)).filter(Boolean).slice(0,limit)},{headers:{'cache-control':'no-store'}});}
 catch{return json({error:'AH-productcatalogus is nu niet beschikbaar'},{status:502});}
};
