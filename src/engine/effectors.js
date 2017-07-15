/** 
 * Local effectors (similar to effectors in Cinema4D)
 */
 
 // global list of available effectors
Danimator.Effectors = ['Magnet'];

var _effectorDragging = false;

/**
 * Effector Base Class – Extend this to create specific effectors
 */
Danimator.Effector = function danimatorEffector(config) {
	var self = this;

	self._active 		= false;

	self.name 			= 'Base';
	self.className 		= 'Danimator.Effector';
	self.magnitude 		= 0;
	self.restitute 		= false;

	self.settings 		= {
							visualize: false
						};

	self.styles = {
		'outline': {
			fillColor: 		new paper.Color('#FEBF14').fade(.2),
		    strokeColor: 	'#FEBF14',
		    strokeWidth: 	1 / paper.project.view.zoom
		},
		'fill': {
			fillColor: 		'#FEBF14',
		    strokeColor: 	'white',
		}
	};
	self.visualizer = false;
	return self.init(config);
}

Danimator.Effector.prototype.init = function danimatorEffectorInit(config) {
	var self = this;
	if(config.restitute && (typeof config.restitute === 'boolean')) {
		config.restitute = function(segment, oldPos) {
			segment.restore();
			segment.restituted = true;
		}
	}
	if(_.get(config, 'settings.visualize')) {
		if(config.position) {
			self.icon = new paper.Raster({
			    source: 	config.iconPath,
			    position: 	config.position,
			    scaling: 	.5
			}).bringToFront();
		}
	}
	return _.extend(self, config);
};

Danimator.Effector.prototype.enable = function() {
	var self = this;
	var applyMethod = Danimator.Effector[this.name].apply;

	if(applyMethod) {
		this._active = true;
		paper.view.on('frame', function(event) {
			Danimator.Effector[self.name].apply.call(self, event);				// attach frame handler in order to apply Effector
		});
	}
	this.icon && (this.icon.position = this.position);
	this.update();
	return this;
};

Danimator.Effector.prototype.disable = function() {
	this._active = false;
	paper.view.off('frame', this.apply);
	this.visualizer && this.visualizer.remove();
	return this;
};

Danimator.Effector.prototype.redraw = function() {
	var self = this;
	if(self.visualizer) {
		self.visualizer.on({
			mouseenter: function(event) {
							if(!event.event.buttons) {
								self.visualizer.opacity = 1;
							}
						},
			mouseleave: function(event) {
							if(event.event.buttons || _effectorDragging) {
								self.visualizer.opacity = 1;
							} else {
								self.visualizer.opacity = 0;
							}
						}
		}).bringToFront();
	}
	return self;
};

Danimator.Effector.prototype.update = function(event) {
	var effectorClass = Danimator.Effector[this.name];
	this.settings.visualize && effectorClass.visualize && effectorClass.visualize.call(this, event);		// if visualize is set to true, call the hook visualize(event);
	return this;
};

Danimator.Effector.prototype.remove = function() {
	this.visualizer && this.visualizer.remove();
};

Danimator.Effector.prototype.bake = function() {
	/*### TODO: bake new positions of segments */
	this.remove();
};

Danimator.Effector.elasticRestitution = _.throttle(function(factor) {
	return function(segment, origPos) {
		if(!segment.restituted) {
			segment.restitution = (segment.restitution || 0.1) * (factor || 1.1);
			segment.point = segment.point.add( origPos.subtract(segment.point).multiply( Ease.elasticOut(segment.restitution) ) );

			if(segment.restitution >= 1) {
				segment.restituted = true;
				segment.restitution = 0.1;
				segment.restore();
			}
		}
	}
}, 1/24, { trailing: true });



/**
 * Danimator.Effector.Magnet({ … })
 * 
 * @parameters: 
 * 	point 			paper.Position	position of magnet
 * 	radius 			Float 			radius of magnet's area of influence
 * 	[falloff] 		Float (0…1)		optional amount of falloff within radius
 * 	[segmentGroups]	Array 			associative array of { itemId: [Segment, Segment, …] } – segments (per object) to be affected
 * 									if not supplied ALL segments within radius will be transformed
 */
Danimator.Effector.Magnet = function danimatorMagnetEffector(config) {
	return new Danimator.Effector( _.extend({
		segmentGroups: 	[],
		falloff: 		0,
		position: 			new paper.Point(0,0),
		radius: 		10
	}, config, {
		name: 			'Magnet',
		className: 		'Danimator.Effector.Magnet',
		iconPath: 		'http://res.cloudinary.com/dantheman/image/upload/v1498383905/effectors/magnet.png'
	}) );
}

// is user manipulating the visualization of falloff?
var _falloffDragging = false;
// internal helper to create a segment overlay colorized by strength of the effect
var _visualizeSegment = function danimatorMagnetEffectorSegmentVis(segmentPosition, strength) {
	var segmentSize = 6/paper.project.view.zoom;
	var segmentViz = new paper.Shape.Rectangle(segmentPosition.subtract(segmentSize/2), new paper.Size(segmentSize, segmentSize));
	segmentViz.style = {
		strokeWidth: 1/paper.project.view.zoom,
		strokeColor: '#1193FF',
		fillColor: new paper.Color({
			hue: 		40 - 40 * strength,		// color from red to yellow
			saturation: 1,
			lightness: 	.5
		}),
	};
	segmentViz.data.class = 'segmentViz';
	this.visualizer && this.visualizer.addChild(segmentViz);
	segmentViz.sendToBack();
}

Danimator.Effector.Magnet.visualize = function danimatorMagnetEffectorVis(event) {
	var self = this;

	self.visualizer && self.visualizer.remove();

	// this represents the radius indicator of the effector's viz
	var radiusViz = new paper.Shape.Circle({
		blendMode:  'overlay',
		position: 	self.position, 
		radius: 	self.radius,
		style: 		self.styles.outline
	});

	// this represents the radius knob of the effector's viz
	var radiusCtrl = new paper.Shape.Circle({
		name: 		'radiusCtrl',
		position: 	(event && event.point) || self.position.subtract(new paper.Point(0, self.radius)),
		radius: 	5 / paper.project.view.zoom,
		style: 		self.styles.fill
	});
	radiusCtrl.onMouseDrag = function(event) {
		// wrapping in requestAnimationFrame() to enhance performance (see http://37signals.com/talks/soundslice at 35:40)
		requestAnimationFrame(function() {
			_effectorDragging = true;
			radiusCtrl.position = event.point;
			self.radius = event.point.getDistance(self.position);
			self.update(event);
		});
	}
	radiusCtrl.onMouseUp = function() {
		_effectorDragging = false;
	}
	Danimator.handlers.attach(radiusCtrl, 'hover');

	// this represents the position knob of the effector's viz
	var positionSize = 10/paper.project.view.zoom;
	var positionCtrl = new paper.Shape.Rectangle({
		name: 		'positionCtrl',
		opacity: 	0,
		position: 	self.position.subtract(positionSize/2), 
		size: 		new paper.Size(positionSize, positionSize),
		style: 		self.styles.outline
	});
	positionCtrl.onMouseDrag = function(event) {
		requestAnimationFrame(function() {
			_effectorDragging = true;
			ctrls.position = event.point;
			self.position = event.point;
			self.icon && (self.icon.position = event.point);
			self.update();
		});
	}
	positionCtrl.onMouseDown = function(event) {
		self.magnitude = 1;
	}
	positionCtrl.onMouseUp = function(event) {
		_effectorDragging = false;
		self.magnitude = 0;
	}
	Danimator.handlers.attach(positionCtrl, 'hover');

	// this represents the falloff knob of the effector's viz
	var fallfoffCtrl = new paper.Shape.Circle({
		name: 		'falloffCtrl',
		position: 	self.position.subtract(new paper.Point(0, -self.radius * self.falloff)),
		radius: 	5 / paper.project.view.zoom,
		style: 		self.styles.outline
	});
	fallfoffCtrl.onMouseDrag = function(event) {
		requestAnimationFrame(function() {
			fallfoffCtrl.position = paper.Point.max(event.point, self.position);
			self.falloff = event.point.getDistance(self.position) / self.radius;

			_falloffDragging = true;
			_effectorDragging = true;

			self.update();
		});
	}
	fallfoffCtrl.onMouseUp = function() {
		_falloffDragging = false;
		_effectorDragging = false;
		radiusViz.style = self.styles.outline;
	}
	Danimator.handlers.attach(fallfoffCtrl, 'hover');

	// create a gradient to visualize falloff while changing it interactively
	if(_falloffDragging) {
		var fill = new paper.Color(self.styles.fill.fillColor);

		radiusViz.fillColor = {
			origin: 		[0,0],
			destination: 	[self.radius,0],
			gradient: {
				stops: [[fill.fade(0.5), Danimator.limit(1-self.falloff, 0, 1)], [fill.fade(0), 1]],
				radial: true
			}
		};
	}

	var ctrls = new paper.Group([radiusViz, positionCtrl, fallfoffCtrl, radiusCtrl]);
	ctrls.bringToFront();

	self.visualizer = ctrls;
	self.redraw();
	return self;
}

Danimator.Effector.Magnet.apply = function danimatorMagnetEffectorApply() {
	var self = this;
	var affectedSegments = [];

	if(self.segmentGroups.length) {
		if(self.affectedSegments) {							// if affectedSegments have been cached
			affectedSegments = self.affectedSegments;		// take it from cache
		} else {
			_.each(self.segmentGroups, function(segments, itemId) {		// otherwise go thru groups
				// if segmentGroup is set too boolean
				if(typeof segments === 'boolean') {
					if(segments) {	// get all segments of the segmentGroup's item
						affectedSegments = affectedSegments.concat( paper.project.getItem({id: itemId}).segments );
					}
				} else {			// otherwise take the ones that have been passed thru
					affectedSegments = affectedSegments.concat( segments );
				}
			});
			self.affectedSegments = affectedSegments;		// store result in cache
		}
	} else {												// if no segmentGroups have been supplied
		/*###TODO: fix "all" */
		_.each(paper.project.hitTestAll(self.position, {
			segments: 	true, 								// find ALL segments 
			tolerance: 	self.radius, 						// within the radius
			fill: 		false, 
			stroke: 	false 
		}), function(hitResult) {
			if(hitResult.segment) {
				affectedSegments.push( hitResult.segment );	// and add them to the affectedSegments
			}
		});
	}

	_.each(affectedSegments, function(segment) {
		if(segment) {
			var item = segment.path;

			if(!item.data._segmentPositions) {					
				item.data._segmentPositions = [];
			}
			if(!item.data._segmentPositions[segment.index]) {						// if no previous positions have been stored for this segment …
				item.data._segmentPositions[segment.index] = segment.point.clone();	// … save the current position
				// attach handler for storing a segment's position
				segment.store = function() {
					this.path.data._segmentPositions[this.index] = this.point.clone();
				}
				// attach restore handler for restoring original position of paper.Segment instance
				segment.restore = function() {
					this.point = this.path.data._segmentPositions[this.index].clone();
				}
			}

			var _segmentPosition = item.data._segmentPositions[segment.index];
			var distance = _segmentPosition.getDistance(self.position);

			// only if segments are within radius
			if(distance < self.radius) {
				var falloffRadius = self.radius * (1-self.falloff);
				var power = self.falloff ? 1 - (distance - falloffRadius) / (self.radius - falloffRadius) : 1;
				var strength = Math.min(power, 1) * self.magnitude;
				var movement = _segmentPosition.subtract( self.position ).multiply( strength );

				// if segment isn't affected but not on it's original position either
				if(!strength && !segment.point.equals(_segmentPosition)) {
					// trigger restitution step and pass it our segment and its original position
					self.restitute && self.restitute(segment, _segmentPosition);
					self.update();
				} else {
					// otherwise reset restitution and affect!
					segment.restituted = false;
					segment.strength = strength;
					segment.point = _segmentPosition.subtract( movement );	// calc new position relative to last stored position
				}

				if(self.settings.visualize) {
					_visualizeSegment.call(self, segment.point, Math.min(power, 1));
				}
			} else if(!segment.point.equals(_segmentPosition)) {
				self.restitute && self.restitute(segment, _segmentPosition);
				self.update();
			}
		}
	});
	paper.project.view.requestUpdate();
}

/*
Danimator.Effector.Noise = function danimatorNoiseEffector(config) {
	var self = new Danimator.Effector( _.extend({
		position: 			new paper.Point(0,0),
		radius: 		10
	}, config, {
		name: 			'Noise',
		iconPath: 		''
	}));

	return self;
}
*/