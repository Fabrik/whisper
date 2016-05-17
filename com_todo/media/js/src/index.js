/**
 * For whisper - a Joomla! redux implementation
 */


// An anonymous self invoked function
(function ($w) {

    /**
     * Add in a reducer to the framework
     * This function alters the component's state
     * @param {*} state
     * @param {object} action
     */
    var reducer = function (state = {todos: []}, action) {
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
     * Dispatch an event to the document.
     */
    document.dispatchEvent(
        /**
         * If whisper is installed & published then it will pick up this event,
         * and add the reducer to itself.
         */
        $w.trigger('whisper.addReducer', {name: 'com_todo', reducer: reducer})
    );

    /*** UI ***/

    $w.ready(function () {

        var input = document.querySelector('input[data-todoInput]'),
            list = document.querySelector('*[data-todos]'),
            addButton = document.querySelector('button[data-addTodo]');

        function render() {
            document.dispatchEvent(
                $w.trigger('whisper.getState', function (state) {

                    var i, li,
                        todos = state.com_todo.todos;

                    // Clear out the todo list
                    list.innerHTML = '';

                    // Loop over the todos and add <li>s for each todo
                    for (i = 0; i < todos.length; i++) {
                        li = document.createElement('li');
                        li.setAttribute('data-id', todos[i].id);
                        li.innerHTML = todos[i].text;
                        list.appendChild(li);
                    }

                    input.value = '';
                })
            );
        }

        // Update the page with the state
        render();

        // Subscribe to state changes, each time the state is changed render() is run
        document.dispatchEvent(
            $w.trigger('whisper.subscribe', render)
        );

        // Add event to add todo button
        addButton
            .addEventListener('click', function () {
                // Our action we want to dispatch
                var action = {
                    type: 'COM_TODO.ADD',
                    text: input.value
                }
                document.dispatchEvent(
                    $w.trigger('whisper.dispatch', {action: action})
                );
            });

        // Delegated click event for list todos
        list.addEventListener('click', function(e) {
            // e.target was the clicked element
            if (e.target && e.target.matches('li')) {

                // Create the delete action
                var action = {
                    type: 'COM_TODO.DELETE',
                    id: e.target.getAttribute('data-id')
                }
                document.dispatchEvent(
                    $w.trigger('whisper.dispatch', {action: action})
                );
            }
        });
    });
})(Joomla.whisper);
