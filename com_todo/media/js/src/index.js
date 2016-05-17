/**
 * For whisper - a Joomla! redux implementation
 */

/**
 * Add in a reducer to the framework
 * This function alters whisper's state
 * @param {*} state
 * @param {function} action
 */
var reducer = function (state = {todos: []}, action) {
    if (!action || !action.type) {
        return state;
    }
    switch (action.type) {

        case 'COM_TODO.ADD':
        return {
            todos: [
                ...state.todos,
                {
                    text: action.text,
                    completed: false
                }
            ]
        }
        case 'COM_TODO.DONE':
            return state
        default:
            return state
    }
}

/**
 * Dispatch an event to the document.
 * If whisper is installed & published then it will pick up this event,
 * and add the reducer to itself.
 */
document.dispatchEvent(
    getEvent('whisper.addReducer', {name: 'com_todo', reducer: reducer})
);

