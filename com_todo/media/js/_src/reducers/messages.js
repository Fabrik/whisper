const message = (state, action) => {
    switch (action.type) {
        case 'ADD_MESSAGE':
            return {
                id: action.id,
                text: action.text,
                completed: false
            }
        case 'DELETE_MESSAGE':

            return [];
        case 'MESSAGE_READ':
            if (state.id !== action.id) {
                return state
            }

            return Object.assign({}, state, {
                completed: !state.completed
            })

        default:
            return state
    }
}

const messages = (state = [], action) => {
    switch (action.type) {
        case 'ADD_MESSAGE':
            return [
                ...state,
                message(undefined, action)
            ]
        case 'DELETE_MESSAGE':
            return [
                ...state

            ]
        case 'MESSAGE_READ':
            return state.map(t =>
                message(t, action)
            )
        default:
            return state
    }
}

export default messages