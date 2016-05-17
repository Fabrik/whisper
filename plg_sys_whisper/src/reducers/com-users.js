/**
 * Created by rob on 17/05/2016.
 */

import reducer from '../lib/reducer-helper';

/**
 * A bare bones example of a core reducer that might be added to manage
 * core Joomla! component's data within Whisper
 * @param {Object} state
 * @param {Object} action
 * @returns {Object}
 */
export default function comUsers(state = {items: [], select: null}, action) {
    if (!action || !action.type) {
        return state;
    }
    switch (action.type) {
        case 'COM_USERS.ADD':
            return reducer.add(state, action);
        case 'COM_USERS.DELETE':
            return reducer.remove(state, action);
        default:
            return state
    }
}

