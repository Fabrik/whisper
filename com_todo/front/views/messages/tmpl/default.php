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
$doc->addScript(JURI::root() . '/media/com_todo/js/index.js');
?>
<h1>Todos</h1>
<form>
	<input data-todoInput />
	<button data-addTodo type="button">Add todo</button>
</form>
<p>Click on a todo to delete it</p>
<ul data-todos>
</ul>
