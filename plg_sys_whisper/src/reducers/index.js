/**
 * Created by rob on 17/05/2016.
 */

import { combineReducers } from 'redux';
import users from './com-users';

export default function createReducer(asyncReducers) {
    return combineReducers({
        users,
        ...asyncReducers
    });
}
