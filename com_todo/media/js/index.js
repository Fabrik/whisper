/**
 * For whisper - a Joomla! redux implementation
 */


// An anonymous self invoked function
(function ($w) {

    var initialState = {todos: []};
    /**
     * Add in a reducer to the framework
     * This function alters the component's state
     * @param {*} state
     * @param {Object} action
     * @return {Object} A new object - NOT a mutation of state but a COPY
     */
    var reducer = function (state, action) {
        if (state === undefined) {
            state = initialState;
        }
        var helper = $w.reducerHelper;
        if (!action || !action.type) {
            return state;
        }
        switch (action.type) {

            case 'COM_TODO.ADD':
                var todo = {
                    id       : new Date().getTime(),
                    text     : action.text,
                    completed: false
                };
                return Object.assign({}, state, {
                    todos: helper.add(state.todos, todo)
                });

            case 'COM_TODO.DELETE':
                return Object.assign({}, state, {
                    todos: helper.remove(state.todos, action.id)
                });

            default:
                return state
        }
    };

    /**
     * If whisper is installed & published then it will pick up this event,
     * and add the reducer to itself.
     */
    $w.trigger('whisper.addReducer', {name: 'com_todo', reducer: reducer});

    /*** UI - would usually be replaced with a React/Angular view ***/

    $w.ready(function () {

        var input = document.querySelector('input[data-todoInput]'),
            list = document.querySelector('*[data-todos]'),
            addButton = document.querySelector('button[data-addTodo]');

        var render = function () {
            $w.trigger('whisper.getState', function (state) {

                var i, li,
                    todos = state.com_todo.todos;

                // Clear out the list
                list.innerHTML = '';

                // Loop over the todos and add <li>s for each item
                for (i = 0; i < todos.length; i++) {
                    li = document.createElement('li');
                    li.setAttribute('data-id', todos[i].id);
                    li.innerHTML = todos[i].text;
                    list.appendChild(li);
                }

                // Reset the input to ''
                input.value = '';
            })
        }

        // Update the page with the state
        render();

        // Subscribe to state changes, each time the state is changed render() is run
        $w.trigger('whisper.subscribe', render)

        // Add event to add todo button
        addButton
            .addEventListener('click', function () {
                // Our action we want to dispatch
                var action = {
                    type: 'COM_TODO.ADD',
                    text: input.value
                }
                $w.trigger('whisper.dispatch', {action: action})
            });

        // Delegated click event for list todos
        list
            .addEventListener('click', function (e) {
                // e.target was the clicked element
                if (e.target && e.target.matches('li')) {

                    // Create the delete action
                    var action = {
                        type: 'COM_TODO.DELETE',
                        id  : e.target.getAttribute('data-id')
                    }
                    $w.trigger('whisper.dispatch', {action: action})
                }
            });
    });
})(Joomla.whisper);
