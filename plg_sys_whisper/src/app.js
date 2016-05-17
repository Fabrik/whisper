/*jslint esversion: 6 */

// Import the required modules
import {createStore} from 'redux';
import {configureStore, injectAsyncReducer} from './store';

// Create a Redux store holding the state of your app.
let store = configureStore({});

/**
 * Add a reducer function to the whisper framework
 * Reducers respond to actions and update the application's state.
 * @param {event} event
 */
const addReducer = (event) => {
    var d = event.detail;
    injectAsyncReducer(store, d.name, d.reducer);
    // Optional function that can be run once the reducer has been added to Whisper
    if (d.onAdd !== undefined) {
        d.onAdd();
    }
};

/**
 * Dispatch an action to the store
 * Actions are payloads of information that send data from your application to Whisper's store.
 * They are the only source of information for the store
 * @param {event} event
 */
const dispatch = (event) => {
    var d = event.detail;
    store.dispatch(d.action);
};

/**
 * Get the current state
 * @param {event} event
 * @returns {S}
 */
const getState = (event) => {
    // d will be the callback function that was passed in the event
    var d = event.detail;
    return d(store.getState());
};

/**
 * Subscribe a function which is run when the store's state
 * changes. This function handles updating the view
 * @param {event} event
 */
const subscribe = (event) => {
    var d = event.detail;
    store.subscribe(d);
};

// Watch for any custom events (fired by components/modules etc)
document.addEventListener('whisper.addReducer', addReducer);
document.addEventListener('whisper.dispatch', dispatch);
document.addEventListener('whisper.getState', getState);
document.addEventListener('whisper.subscribe', subscribe);
