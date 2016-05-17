/**
 * Created by rob on 12/02/2016.
 */


const add = (state, action) => {
    return [
        ...state.items,
        action.item
    ]
};

/**
 * Remove an item from state.items
 * @param {Object} state
 * @param {{id: String, payload: Object}} action
 * @param {String} pk
 * @returns {*}
 */
const remove = (state, action, pk = 'id') => {
    const i = state.items.findIndex(item => item[pk] === action.payload.id);
    if (i === -1) {
        return state;
    }
    return Object.assign({}, state, {
        items: [
            ...state.items.slice(0, i),
            ...state.items.slice(i + 1)]
    });
};

/**
 * Edit an item
 * @param {Object} state
 * @param {Object} action
 * @returns {*}
 */
const edit = (state, action) => {
    return Object.assign({}, state, {selected: action.payload});
};

export default {
    add,
    edit,
    remove
}