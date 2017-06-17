Selection = Selection ||  function(elements) {
	var _selection = new Set;
	_selection.add(elements);

	Object.defineProperty(_selection, '0', {
	  get: function()     { return this.values().next().value; },
	});
	return _selection;
};