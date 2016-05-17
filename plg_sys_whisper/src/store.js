import { createStore, applyMiddleware } from 'redux';
import createReducer from './reducers/index';
import logger from 'redux-logger';
import thunk from 'redux-thunk';

/**
 * Configure the store
 * @param {*} initialState
 * @returns {Store}
 */
export function configureStore(initialState) {
    console.log('create store initial state = ', initialState);
    let store = createStore(createReducer(), initialState, applyMiddleware(thunk, logger()));
    store.asyncReducers = {};
    return store;
}
/**
 * Inject a new reducer into the store.
 * @param {object} store
 * @param {string} name
 * @param {function} asyncReducer
 */
export function injectAsyncReducer(store, name, asyncReducer) {
    store.asyncReducers[name] = asyncReducer;
    store.replaceReducer(createReducer(store.asyncReducers));
}