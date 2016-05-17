<?php
/**
 * @package     Joomla.Site
 * @subpackage  com_todo
 *
 * @copyright   Copyright (C) 2016 Rob Clayburn. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;

$doc = JFactory::getDocument();
$doc->addScript(JURI::root() . '/plugins/system/whisper/whisper-tools.js');
$doc->addScript(JURI::root() . '/media/com_todo/js/index.js');
?>

<form>
	<input data-todoInput />
	<button data-addTodo type="button">Add todo</button>
</form>
<ul data-todos>
</ul>

<script type="text/javascript">
	// An anonymous self invoked function
	(function () {
		var input = document.querySelector('input[data-todoInput]'),
			list = document.querySelector('*[data-todos]'),
			addButton = document.querySelector('button[data-addTodo]');

		ready(function () {

			function render() {
				document.dispatchEvent(
					getEvent('whisper.getState', function (state) {

						var i, li,
							todos = state.com_todo.todos;

						// Clear out the todo list
						list.innerHTML = '';

						// Loop over the todos and add <li>s for each todo
						for (i = 0; i < todos.length; i++) {
							li = document.createElement('li');
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
				getEvent('whisper.subscribe', render)
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
						getEvent('whisper.dispatch', {action: action})
					);
				});
		});
	})();

</script>