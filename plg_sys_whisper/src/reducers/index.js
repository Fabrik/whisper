
import { combineReducers } from 'redux';
import users from './com-users';

export default function createReducer(asyncReducers) {
    return combineReducers({
        users,
        ...asyncReducers
    });
}
