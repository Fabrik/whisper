<?php
/**
 * @package     Joomla.Plugin
 * @subpackage  System.whisper
 *
 * @copyright   Copyright (C) 2005 - 2016 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License version 2 or later; see LICENSE.txt
 */

defined('_JEXEC') or die;

/**
 * Joomla! System JavaScript Redux plugin.
 *
 */
class PlgSystemWhisper extends JPlugin
{
	/**
	 * Constructor
	 *
	 * @param   object &$subject The object to observe
	 * @param   array  $config   An array that holds the plugin configuration
	 *
	 * @since    1.0
	 */
	public function __construct(&$subject, $config)
	{
		$doc = JFactory::getDocument();
		JHtml::_('behavior.core');
		$doc->addScript(JURI::root() .'/plugins/system/whisper/whisper.js');
		$doc->addScript(JURI::root() .'/plugins/system/whisper/whisper-tools.js');
	}
}
