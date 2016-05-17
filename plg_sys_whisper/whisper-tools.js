// Utility functions for Whisper
// Namespace the tools in Joomla.whisper, easiest way to make them available
Joomla = typeof(Joomla) !== 'undefined' ? Joomla : {};
Joomla.whisper = typeof(Joomla.whisper) !== 'undefined' ? Joomla.whisper : {};

/**
 * Trigger a custom event
 * Polyfill for ie9 which doesn't have CustomEvent
 * @param name
 * @param data
 * @returns {*}
 */
Joomla.whisper.trigger = function (name, data) {
    var event;
    if (window.CustomEvent) {
        event = new CustomEvent(name, {detail: data});
    } else {
        event = document.createEvent(name);
        event.initCustomEvent(name, true, true, data);
    }
    return event;
}

/**
 * Domready polly fill
 * @param {function} fn
 */
Joomla.whisper.ready = function (fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}


Joomla.whisper.reducerHelper = {
    /**
     * Remove an item from the array, without mutating items
     * @param {Array} items
     * @param {String|Number} id Item id to remove
     * @param {String} pk
     * @returns {*}
     */
    remove: function (items, id, pk) {
        if (pk === undefined) {
            pk = 'id';
        }
        var i = items.findIndex(function (item) {
            return item[pk].toString() === id.toString();
        });
        if (i === -1) {
            return items;
        }
        return items.slice(0, i).concat(items.slice(i + 1))
    },

    /**
     * Add an item to items, without mutating items
     * @param {Array} items
     * @param {Object} item
     * @returns {Array.<T>|*|string}
     */
    add: function (items, item) {
        return items.concat(item);
    }
}