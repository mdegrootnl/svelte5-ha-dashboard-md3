import {readFile} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import {getDataPath} from './dataDir';
import type {AhProductResponse} from './ahClient';

export async function readerAuthorized(authorization:string|null){
 if(!authorization?.startsWith('Bearer ')||authorization.length>512)return false;
 let expected:string;try{expected=(await readFile(getDataPath('boodschappenhulp-read-token'),'utf8')).trim();}catch{return false;}
 const actual=authorization.slice(7);if(!/^[a-f0-9]{64}$/.test(expected)||actual.length!==expected.length)return false;
 return timingSafeEqual(Buffer.from(expected),Buffer.from(actual));
}
function cents(value:unknown){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000?Math.round(value*100):null;}
export function catalogueProduct(raw:AhProductResponse,capturedAt:string){
 const id=raw.webshopId??raw.hqId;if(!Number.isSafeInteger(id)||!id||typeof raw.title!=='string'||!raw.title.trim())return null;
 const current=cents(raw.currentPrice),list=cents(raw.priceBeforeBonus);
 return {sku:String(id),title:raw.title.slice(0,300),unitSize:typeof raw.salesUnitSize==='string'?raw.salesUnitSize.slice(0,100):null,priceCents:current??list,priceKind:current!==null?'current':list!==null?'list':'unknown',currency:'EUR',capturedAt,available:typeof raw.availableOnline==='boolean'?raw.availableOnline:null,orderable:typeof raw.isOrderable==='boolean'?raw.isOrderable:null,availabilityStatus:typeof raw.orderAvailabilityStatus==='string'?raw.orderAvailabilityStatus.slice(0,100):null,minBestBeforeDays:typeof raw.minBestBeforeDays==='number'&&Number.isInteger(raw.minBestBeforeDays)&&raw.minBestBeforeDays>=0&&raw.minBestBeforeDays<=3650?raw.minBestBeforeDays:null,properties:Array.isArray(raw.propertyIcons)?raw.propertyIcons.filter((p):p is string=>typeof p==='string').slice(0,30).map(p=>p.slice(0,80)):[]};
}
export function catalogueDetail(tradeItem:Record<string,unknown>|undefined){
 if(!tradeItem)return null;
 const result:Record<string,unknown>={};for(const key of ['gtin','allergenInformation','consumerInstructions','foodAndBeverageIngredientStatement','nutritionalInformation','packagingMarking','lifespan','measurements'])if(Object.hasOwn(tradeItem,key))result[key]=tradeItem[key];
 if(JSON.stringify(result).length>256000)throw Error('Unexpected product detail size');return result;
}
