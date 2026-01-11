import { createLogger } from '../utils/logger';

const logger = createLogger('Poller');

export type PollCallback = () => Promise<void> | void;

/**
 * A service for managing scheduled background polling.
 */
export class Poller {
    private intervalId: any = null;
    private name: string;
    private frequency: number;
    private callback: PollCallback;

    constructor(name: string, frequencyMs: number, callback: PollCallback) {
        this.name = name;
        this.frequency = frequencyMs;
        this.callback = callback;
    }

    /**
     * Start the polling cycle.
     */
    start(immediate = true): void {
        if (this.intervalId) return;

        logger.debug(`Starting poller: ${this.name} (${this.frequency}ms)`);

        if (immediate) {
            this.execute();
        }

        this.intervalId = setInterval(() => this.execute(), this.frequency);
    }

    /**
     * Stop the polling cycle.
     */
    stop(): void {
        if (!this.intervalId) return;
        logger.debug(`Stopping poller: ${this.name}`);
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    private async execute() {
        try {
            await this.callback();
        } catch (e) {
            logger.error(`Poller error [${this.name}]:`, e);
        }
    }

    /**
     * Check if the poller is currently active.
     */
    get isActive(): boolean {
        return this.intervalId !== null;
    }
}
