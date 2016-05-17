Whisper
=======

This is a javascript [Joomla!](http://joomla.org) system plugin, in plg_sys_whisper and an 
accopanying demo component and module.

It implements [Redux](https://github.com/reactjs/redux) providing a predictable state container for 
Joomla! components and modules.

Building
=========
You will need to have npm and gulp installed. Then from a console run the following:

> cd plg_sys_whisper

> npm install

> gulp

Usage
======

Please take a look at com_todo and mod_counter

com_todo allows you to add and delete todo's from Whisper's store
mod_counter subscribes to the stores changes and updates its UI showing the total number of todos.

Multiple components / modules can thus control their own data domain, and observe others.
If they want to update other domains within the store then events should be fired, this ensures
the separation of concerns.

The examples are very basic in that they
 
 * Use plain javascript to render themselves, normally you would use React/Angular etc.
 * Their data is not persistent. Ansync actions can be written to query a db and/or local storage