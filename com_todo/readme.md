This is a very simple todo Joomla component.

Its aim is to demonstrate how you could build a plain old javascript and html
component, whose data is contained within a a redux store.

Modification of the data is dealt with by sending actions to the store.

The component also registers its own reducer function, which deals with handling 
dispatched actions and 
updating the store.