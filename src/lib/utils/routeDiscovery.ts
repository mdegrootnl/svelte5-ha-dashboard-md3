import { haRegistryStore } from '../stores/haRegistry.svelte';

export interface RouteOption {
    path: string;
    label: string;
    category: 'System' | 'Floor' | 'Room';
}

/**
 * Discovers all available routes in the application.
 * Includes static system routes and dynamic routes based on HA floors and areas.
 */
export function discoverRoutes(): RouteOption[] {
    console.log('[RouteDiscovery] Discovering routes...', {
        areas: haRegistryStore.areas.length,
        floors: haRegistryStore.floors.length
    });
    const routes: RouteOption[] = [
        { path: '/dashboard', label: 'Main Dashboard', category: 'System' },
        { path: '/weather', label: 'Weather', category: 'System' },
        { path: '/calendar', label: 'Calendar', category: 'System' },
        { path: '/music', label: 'Music Assistant', category: 'System' },
        { path: '/library', label: 'Component Library', category: 'System' },
        { path: '/settings', label: 'Settings', category: 'System' },
        { path: '/theme', label: 'Theme Config', category: 'System' },
    ];

    // Add Floors
    for (const floor of haRegistryStore.floors) {
        routes.push({
            path: `/dashboard/${floor.floor_id}`,
            label: floor.name,
            category: 'Floor'
        });
    }

    // Add Areas (Rooms)
    for (const area of haRegistryStore.areas) {
        // Find floor if it exists to build a more accurate path if needed, 
        // but current routing seems to support /dashboard/[floor]/[room] or just /dashboard/[room]?
        // Checking architecture: /dashboard/[[floor]]/[[room]]

        const floorId = area.floor_id || 'unassigned';
        routes.push({
            path: `/dashboard/${floorId}/${area.area_id}`,
            label: area.name,
            category: 'Room'
        });
    }

    return routes;
}
