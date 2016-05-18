/**
 * For whisper - a Joomla! redux implementation
 */

(function ($w) {
    $w.ready(function () {

        /**
         * Update the UI based on the current state
         */
        var render = function () {
            $w.trigger('whisper.getState', function (state) {
                var valueEl = document.querySelector('*[data-total-todos]');
                valueEl.innerHTML = state.com_todo.todos.length.toString();
            })
        };

        // Update the page with the state
        render();

        // Subscribe to state changes, each time the state is changed render() is run
        $w.trigger('whisper.subscribe', render)

    })
})(Joomla.whisper);


