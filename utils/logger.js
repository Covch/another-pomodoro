const logger = {
    enabled: true, 
    debug: function(...args) {
        if (this.enabled) console.log('[DEBUG]', ...args);
    },
    info: function(...args) {
        if (this.enabled) console.log('[INFO]', ...args);
    },
    warn: function(...args) {
        if (this.enabled) console.warn('[WARN]', ...args);
    },
    error: function(...args) {
        console.error('[ERROR]', ...args);
    }
};