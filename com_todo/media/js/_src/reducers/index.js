import { combineReducers } from 'redux'
import todos from './todos'
import visibilityFilter from './visibilityFilter'

const todoApp = combineReducers({
  todos,
  visibilityFilter
})

document.dispatchEvent(
    getEvent('whisper.addReducer', {name: 'com_todo', reducer: todos})
);

export default todoApp
