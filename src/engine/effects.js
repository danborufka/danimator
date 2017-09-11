/** 
 * Effects and their effectors for paperJS items
 */

Danimator.Effect = paper.Base.extend({
		_class: 	'Effect',
		_affected: 	[],

		initialize: function Effect() {

		},

		_initialize: function(arg) {
			console.log('initializing!', arg);
		}
	}, 
	{
		beans: true,

		getActive: 	function() {
			return this._active || true;
		},
		setActive: 	function(active) {
			return this._active = active;
		},

		getAffected: function() {
			return this._affected;
		},
		setAffected: function(affected) {
			return this._affected = affected;	
		}
	}
);

/**
 * MotionPath Effect
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

var _bendAlongPath = function _bendAlongPath(elItem, moPath, onPath, curvatureScale) {
	var stiffs 	= _.without(_.values(elItem), elItem.bendables);
	var moPath_length = moPath.length;

	// rotate & place non-bendables into place
	_.each(stiffs, function(elStiffo) {
		var _stiffOffset = Danimator.limit( (onPath || 0) + elStiffo.data._bendableDistance.x, 0, moPath_length );
		var _yOffset 	 = moPath.getNormalAt( _stiffOffset ).multiply(elStiffo.data._bendableDistance.y);

		 elStiffo.item.position = moPath.getPointAt(  _stiffOffset );
		 elStiffo.item.rotation = moPath.getNormalAt( _stiffOffset ).angle;
	});

	// bends all bendables of an item into place
	_.each(elItem.bendables, function(elBendable) {
		var bendable = elBendable.item;
		_.each(elBendable.data._bendableSegments, function(_centerOffset, i) {
			var _segmentOffset 	= Danimator.limit( onPath + _centerOffset.x, 0, moPath_length );
			var _yOffset 		= moPath.getNormalAt( _segmentOffset ).multiply(_centerOffset.y);
			var _point			= moPath.getPointAt(  _segmentOffset );
			var _scale 			= curvatureScale || .2;												// for down-scaling of tangents

			if(_point) {
				bendable.segments[i].point 		= _point.add(new paper.Point(0, _yOffset));
				bendable.segments[i].handleIn 	= moPath.getWeightedTangentAt( _segmentOffset ).multiply(_scale);
				bendable.segments[i].handleOut 	= moPath.getWeightedTangentAt( _segmentOffset ).multiply(-1 * _scale);
			}
		});
		bendable.smooth();
	});
}

Danimator.Effect.MotionPathEffect = paper.Base.extend({
		_class: 	'Effect.MotionPath',
		_bent: 		false,
		_offset: 	0,

		item: 		null,
		path: 		null,

		initialize: function MotionPathEffect(config) {
			var self = this;
			_.extend(self, config);
		}
	},
	{
		beans: 		true,

		getOffset: 	function() {
			return this._offset || 0;
		},
		setOffset: 	function(offset) {
			if(this.bent) {
				_bendAlongPath(this.item, this.path.item, offset);
			}
			return this._offset = (offset || 0);
		},
		getBent: 	function() {
			return !!this._bent;
		},
		setBent: 	function(bend) {
			this._bent = bend;
			this.offset *= 1;
		}
	}
);

/* 	paper.MotionPath extends paper.Group to move elements along paths
	first children represents the path of motion, all others the followers
*/
Danimator.Effect.MotionPath = function(path, affected, options) {

	var config = { };
	var motionPath;

	if(!path.className) {
		config = path;
		affected = path.affected;
	} else {

		var elPath = Danimator.sceneElement(path);

		switch(path.item.className) {
			case 'Group':
				motionPath = path.item;
				config.path = elPath.ordered[0];
				config.affected = elPath.ordered.slice(1);
				break;

			case 'Path':
				config.path 	= elPath;
				config.affected = affected;
				_.extend(config, options);
				break;
		}
	}

	affected   = _.map(affected, 'item');
	motionPath = motionPath || new paper.Group([config.path.item].concat(affected));

	if(motionPath.hasEffect('motionPath')) {
		throw new Error('Path is already a motionPath! Use MotionPath.addChildren instead');
	}

	var effect = {
		name: 	'motionPath',
		affected: 	config.affected,
		path: 		config.path,
		type: 		'motionPath'
	};
	_.extend(effect, config.options);

	motionPath.addEffect(effect);
	
	_.each(affected, function(item) {
		item.motionPath = new Danimator.Effect.MotionPathEffect({
			item: 	Danimator.sceneElement(item),
			path: 	config.path,
			offset: config.offset || 0,
			bent: 	!!config.bent
		});
	});

	return motionPath.effect('motionPath');
};

paper.Item.inject({
	beans: false,
	_effects: {},
	addEffect: 		function(fx) {
		this._effects[fx.name] = fx;
	},
	hasEffect: 		function(fx) {
		!!this._effects[fx];
	},
	effect: 	 function(fx) {
		return this._effects[fx];
	}
});