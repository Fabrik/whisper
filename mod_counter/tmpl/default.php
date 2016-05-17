<?php
/**
 * @package     Joomla.Site
 * @subpackage  mod_custom
 *
 * @copyright   Copyright (C) 2005 - 2016 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;
$class = trim($moduleclass_sfx);
?>

<div class="counter<?php echo $moduleclass_sfx ?>">
	<p>
		TOTAL: <span class="value">0</span>
	</p>

</div>
<script type="text/javascript">

	ready(function () {

		function render() {
			var valueEl = document.querySelector('.<?php echo $class ?> .value');
			document.dispatchEvent(
				getEvent('whisper.getState', function (state) {
					//debugger;
					valueEl.innerHTML = state.com_todo.todos.length.toString();
				})
			);
		}

		// Update the page with the state
		render();

		// Subscribe to state changes, each time the state is changed render() is run
		document.dispatchEvent(
			getEvent('whisper.subscribe', render)
		);

	});

</script>