<?php
/**
 * @package     Joomla.Site
 * @subpackage  mod_counter
 *
 * @copyright   Copyright (C) 2016 Rob Clayburn. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */
defined('_JEXEC') or die;

$doc = JFactory::getDocument();
$doc->addScript(JURI::root() .'/modules/mod_counter/mod_counter.js');

$moduleclass_sfx = htmlspecialchars($params->get('moduleclass_sfx'));
require JModuleHelper::getLayoutPath('mod_counter', $params->get('layout', 'default'));
