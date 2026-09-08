import browser from 'webextension-polyfill';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            sync: {
                get: vi.fn(),
                set: vi.fn(),
                remove: vi.fn(),
                onChanged: { addListener: vi.fn() },
            },
        },
    },
}));

const NOW = Date.UTC(2026, 8, 7, 12);
const MINUTE = 60_000;
let persisted: Record<string, unknown>;
let writes: { key: string; commit: () => void }[];

async function independentContexts() {
    vi.resetModules();
    const first = (await import('../../src/common/websites')).Websites;
    vi.resetModules();
    const second = (await import('../../src/common/websites')).Websites;
    expect(first).not.toBe(second);
    return [first, second];
}

async function commitBoth(firstKey: string, secondKey: string) {
    await vi.waitFor(() => expect(writes).toHaveLength(2));
    const first = writes.find(({ key }) => key === firstKey);
    const second = writes.find(({ key }) => key === secondKey);
    if (!first || !second) {
        throw new Error('Expected two writes to independent website keys');
    }
    first.commit();
    second.commit();
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    persisted = {};
    writes = [];
    vi.mocked(browser.storage.sync.get).mockImplementation(async (key) => {
        return structuredClone(typeof key === 'string' ? { [key]: persisted[key] } : persisted);
    });
    vi.mocked(browser.storage.sync.set).mockImplementation((items) => {
        return new Promise((resolve) => {
            const [key] = Object.keys(items);
            writes.push({
                key,
                commit: () => {
                    Object.assign(persisted, structuredClone(items));
                    resolve();
                },
            });
        });
    });
    vi.mocked(browser.storage.sync.remove).mockImplementation((key) => {
        if (typeof key !== 'string') {
            throw new Error('Website mutations should remove a single hostname key');
        }
        return new Promise((resolve) => {
            writes.push({
                key,
                commit: () => {
                    delete persisted[key];
                    resolve();
                },
            });
        });
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('website mutations across independent contexts', () => {
    it.each([false, true])('preserves simultaneous additions, reversed write order: %s', async (reverse) => {
        const [first, second] = await independentContexts();
        const addingFirst = first.addWebsite('a.example.com', 30);
        const addingSecond = second.addWebsite('b.example.com', 60);

        await commitBoth(
            reverse ? 'website:b.example.com' : 'website:a.example.com',
            reverse ? 'website:a.example.com' : 'website:b.example.com',
        );
        await Promise.all([addingFirst, addingSecond]);

        const expected = {
            'a.example.com': { hostname: 'a.example.com', blockedUntil: NOW + 30 * MINUTE },
            'b.example.com': { hostname: 'b.example.com', blockedUntil: NOW + 60 * MINUTE },
        };
        expect(await first.getWebsites()).toEqual(expected);
        expect(await second.getWebsites()).toEqual(expected);
        expect(persisted).not.toHaveProperty('websites');
        expect(browser.storage.sync.set).toHaveBeenCalledTimes(2);
    });

    it.each([
        { legacy: true, deleteFirst: false },
        { legacy: true, deleteFirst: true },
        { legacy: false, deleteFirst: false },
        { legacy: false, deleteFirst: true },
    ])('preserves an addition and deletion of another host: %j', async ({ legacy, deleteFirst }) => {
        const oldWebsite = { hostname: 'old.example.com', blockedUntil: NOW + MINUTE };
        const legacyMap = { 'old.example.com': oldWebsite };
        persisted = legacy ? { websites: legacyMap } : { 'website:old.example.com': oldWebsite };
        const [first, second] = await independentContexts();
        const adding = first.addWebsite('new.example.com', 30);
        const deleting = second.deleteWebsite('old.example.com');

        await commitBoth(
            deleteFirst ? 'website:old.example.com' : 'website:new.example.com',
            deleteFirst ? 'website:new.example.com' : 'website:old.example.com',
        );
        await Promise.all([adding, deleting]);

        const expected = { 'new.example.com': { hostname: 'new.example.com', blockedUntil: NOW + 30 * MINUTE } };
        expect(await first.getWebsites()).toEqual(expected);
        expect(await second.getWebsites()).toEqual(expected);
        if (legacy) {
            expect(persisted.websites).toEqual(legacyMap);
            expect(persisted['website:old.example.com']).toBeNull();
        } else {
            expect(persisted).not.toHaveProperty(['website:old.example.com']);
        }
        expect(browser.storage.sync.set).not.toHaveBeenCalledWith(
            expect.objectContaining({ websites: expect.anything() }),
        );
    });
});
