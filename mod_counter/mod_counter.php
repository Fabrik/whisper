<?php
/**
 * @package     Joomla.Site
 * @subpackage  mod_custom
 *
 * @copyright   Copyright (C) 2005 - 2016 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;

$doc = JFactory::getDocument();
$doc->addScript(JURI::root() .'/plugins/system/whisper/whisper-tools.js');
$doc->addScript(JURI::root() .'/modules/mod_counter/mod_counter.js');

$moduleclass_sfx = htmlspecialchars($params->get('moduleclass_sfx'));
require JModuleHelper::getLayoutPath('mod_counter', $params->get('layout', 'default'));
