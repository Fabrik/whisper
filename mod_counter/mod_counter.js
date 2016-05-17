/**
 * For whisper - a Joomla! redux implementation
 */

/**
 * Add in a reducer to the framework
 * This function alters whisper's state
 * @param {*} state
 * @param {function} action
 */
var reducer = function (state, action) {
    if (!state) {
        state = 0;
    }
    if (!action || !action.type) {
        return state;
    }
    debugger;
    switch (action.type) {
        case 'COM_TODO.ADD':
            return state + 1;
        case 'MOD_COUNTER.DECREMENT':
            return state - 1
        default:
            return state
    }
}

/**
 * Called once the reducer has been added to whisper's store
 */
var onAdd = function () {
    var action = {type: 'INCREMENT'};
    document.dispatchEvent(
        getEvent('whisper.dispatch', {action})
    );
}

/**
 * Dispatch an event to the document.
 * If whisper is installed & published then it will pick up this event,
 * add the reducer to itself and then fire the onAdd event.
 */
/*
document.dispatchEvent(
    getEvent('whisper.addReducer', {name: 'mod_counter', reducer: reducer, onAdd: onAdd})
);
*/


