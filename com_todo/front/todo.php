<?php
/**
 * @package     Joomla.Site
 * @subpackage  com_todo
 *
 * @copyright   Copyright (C) 2016 Rob Clayburn. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;

$controller = JControllerLegacy::getInstance('Todo');
$task = JFactory::getApplication()->input->get('task', 'display');
$controller->execute($task);

$controller->redirect();
