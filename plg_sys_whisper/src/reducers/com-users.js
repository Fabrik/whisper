/**
 * Created by rob on 17/05/2016.
 */

import Immutable from 'immutable';


const initialState = Immutable.List();

export default function comUsers(state = initialState, action) {
    if (!action || !action.type) {
        return state;
    }
    switch (action.type) {
        case 'COM_USERS.INCREMENT':
            return state.insert(1);
        case 'COM_USERS.DECREMENT':
            return state - 1
        default:
            return state
    }
}

