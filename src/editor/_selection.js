/* internal helper of editor for easier handling of global selection in paper scene */

sceneSelection = function sceneSelection(elements) {
	var _selection = new Set;

	// add elements if any are passed
	elements && _selection.add(elements);

	// helper to only retrieve a single-selection item
	Object.defineProperty(_selection, 'single', {
	  get: function() { 
	  	return this.values().next().value; 
	  },
	  enumerable: false,
	  configurable: false
	});

	_selection.unselect = function(projectOrItem) {
		// unselect in layers panel first
		this.forEach(function(selectedElement){
			selectedElement && selectedElement.data.$layer.removeClass('open');
		});
		// if we passed project deselect everything and clear out selection
		if(_.get(projectOrItem, 'className') === 'Project') {
			projectOrItem.deselectAll();
			this.clear();
		// otherwise just deselect the passed item and remove it from selection
		} else {
			projectOrItem.fullySelected = false;
			this.delete(projectOrItem);
		}
		return _selection;
	}

	return _selection;
}