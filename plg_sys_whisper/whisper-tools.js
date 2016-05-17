/**
 * Polyfill for ie9 which doesn't have CustomEvent
 * @param name
 * @param data
 * @returns {*}
 */
function getEvent(name, data) {
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
function ready(fn) {
    if (document.readyState != 'loading'){
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}