import { haStore } from '$lib/stores/ha.svelte';
import type { CardAction } from '$lib/types/dashboard';
import { getDomain } from '$lib/utils/entity';

export interface ServiceCallDefinition {
    domain: string;
    service: string;
    serviceData: Record<string, unknown>;
}

export function createServiceCall(action: CardAction, fallbackEntityId = ''): ServiceCallDefinition | null {
    const entityId = action.entityId || fallbackEntityId;
    const domain = action.domain || (entityId ? getDomain(entityId) : '');
    const service = action.service || defaultServiceForDomain(domain);

    if (!domain || !service) return null;

    return {
        domain,
        service,
        serviceData: {
            ...(entityId ? { entity_id: entityId } : {}),
            ...(action.serviceData ?? {}),
        },
    };
}

export function defaultServiceForDomain(domain: string): string {
    switch (domain) {
        case 'scene':
        case 'script':
            return 'turn_on';
        case 'button':
            return 'press';
        case 'cover':
            return 'toggle';
        case 'vacuum':
            return 'start';
        case 'todo':
            return 'get_items';
        default:
            return domain ? 'toggle' : '';
    }
}

export async function executeCardAction(action: CardAction, fallbackEntityId = '') {
    const call = createServiceCall(action, fallbackEntityId);
    if (!call) return;
    await haStore.callService(call.domain, call.service, call.serviceData);
}
