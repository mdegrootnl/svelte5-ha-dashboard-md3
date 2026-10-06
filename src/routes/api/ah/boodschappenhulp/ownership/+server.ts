import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {readerAuthorized} from '$lib/server/boodschappenhulpReader';
import {ahOwner} from '$lib/server/ahOwner';
export const GET:RequestHandler=async({request})=>{if(!await readerAuthorized(request.headers.get('authorization')))return json({error:'Leesinterface vereist autorisatie'},{status:401});const owner=await ahOwner();return json({version:1,owner:owner?'boodschappenhulp':'dashboard',localRefreshEnabled:!owner},{headers:{'cache-control':'no-store'}});};
