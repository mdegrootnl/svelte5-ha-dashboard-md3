import { EventEmitter } from 'events';

class ConfigEvents extends EventEmitter { }

export const configEvents = new ConfigEvents();
export const CONFIG_CHANGED_EVENT = 'config-changed';
