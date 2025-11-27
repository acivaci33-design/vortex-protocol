function getApi() {
    if (typeof window === 'undefined')
        return null;
    const anyWindow = window;
    return anyWindow.db ?? null;
}
class DbClientImpl {
    async getMeta(key) {
        const api = getApi();
        if (!api)
            return null;
        return api.getMeta(key);
    }
    async setMeta(key, value) {
        const api = getApi();
        if (!api)
            return;
        await api.setMeta(key, value);
    }
    async saveMessage(row) {
        const api = getApi();
        if (!api)
            return;
        await api.saveMessage(row);
    }
    async getMessages(roomId, limit = 200) {
        const api = getApi();
        if (!api)
            return [];
        return api.getMessages(roomId, limit);
    }
}
export const dbClient = new DbClientImpl();
