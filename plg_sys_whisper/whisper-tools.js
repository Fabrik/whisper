/**
 * Polyfill for ie9 which doesn't have CustomEvent
 * @param name
 * @param data
 * @returns {*}
 */
Joomla = Joomla ? Joomla : {};
Joomla.whisper = Joomla.whisper ? Joomla.whisper : {};

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
 */
Joomla.whisper.ready = function (fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

Joomla.whisper.reducerHelper = {
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
        return [
            ...items.slice(0, i),
            ...items.slice(i + 1)]
            ;
    },

    add: function (items, item) {
        return items.concat(item);
    }
}