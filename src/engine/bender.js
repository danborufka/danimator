/** 
 * Helper method to bend elements along a path
 * depends on:
 * - a group called "bendables" with all paths to be bent
 * - a path called "spine" that determines the length and will be hidden on runtime
 */

// Hooking into sceneElement setup to prepare all elements within groups called "bendables"
Danimator.addHook('sceneElement-setup', function(elItem) {
	if(elItem.bendables) {
		var item 	= elItem.item;
		var stiffs 	= _.without(_.values(elItem), elItem.bendables);

		// get all "stiff" children and store delta to element's center
		_.each(stiffs, function(elStiffo) {
			elStiffo.data._bendableDistance = elStiffo.item.position.subtract(item.position);
		});

		elItem.spine.item.visible = false;

		// get all bendable's segments and store delta to element's center
		_.each(elItem.bendables, function(elBendable) {
			elBendable.data._bendableSegments = [];
			_.each(elBendable.item.segments, function(segment, i) {
				elBendable.data._bendableSegments[i] = segment.point.subtract(item.position);
			});
		});
	}
});

paper.Item.inject({
	bendAlongPath: function(moPath, onPath, extend, curvatureScale) {
		var elThis = this.data.sceneElement;
		var stiffs 	= _.without(_.values(elThis), elThis.bendables);
		var moPath_length = moPath.length;

		// rotate & place non-bendables into place
		_.each(stiffs, function(elStiffo) {
			var _stiffOffset = Danimator.limit( (onPath || 0) + elStiffo.data._bendableDistance.x * (1 + extend), 0, moPath_length );
			var _yOffset 	 = moPath.getNormalAt( _stiffOffset ).multiply(elStiffo.data._bendableDistance.y);

			 elStiffo.item.position = moPath.getPointAt(  _stiffOffset );
			 elStiffo.item.rotation = moPath.getNormalAt( _stiffOffset ).angle;
		});

		// bends all bendables of an item into place
		_.each(elThis.bendables, function(elBendable) {
			var bendable = elBendable.item;
			_.each(elBendable.data._bendableSegments, function(_centerOffset, i) {
				var _segmentOffset 	= Danimator.limit( onPath + _centerOffset.x * (1 + extend), 0, moPath_length );
				var _yOffset 		= moPath.getNormalAt( _segmentOffset ).multiply(_centerOffset.y);
				var _point			= moPath.getPointAt(  _segmentOffset );
				var _scale 			= curvatureScale || .2;												// for down-scaling of tangents

				//bendable.fullySelected = true;

				if(_point) {
					bendable.segments[i].point 		= _point.add(new paper.Point(0, _yOffset));
					bendable.segments[i].handleIn 	= moPath.getWeightedTangentAt( _segmentOffset ).multiply(_scale);
					bendable.segments[i].handleOut 	= moPath.getWeightedTangentAt( _segmentOffset ).multiply(-1 * _scale);
				}
			});
			bendable.smooth();
		});
	}
});