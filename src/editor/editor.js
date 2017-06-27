/* animation editor engine */
// TODOS:
// o check layers vs. groups (reimport from Illu)

var currentGame;
var tracks   		= {};
var events 			= {};

var TIME_FACTOR 	= 10;
var FLAGS 			= {					// see panels.js for usage example
	view: {
		selection: true
	}
};
var _PANELS 		= {
	layers: 	{}, 
	animations: {}, 
	audio: 		{},
	properties: {}
};

var _loadingStates 	= [];
var _snapKeyframes 	= new Snappables(.4);

/* create special set to store selections within our scene */
var selectedElements = sceneSelection();

/* Paper.js item & jQuery references */
var $time;
var $animationValue;
var $currentTrack;
var _anchorViz;

/* states */
var _playing 		= false;
var _frameDragging 	= false;
var _timeScrubbing  = false;

/* basic configs for creation of inputs in property panel */
var _ANIMATABLE_COLORS = {
	saturation: {
		range: [0,1],
		type: Number
	},
	brightness: {
		range: [0,1],
		type: Number
	},
	hue: {
		range: [0,360],
		type: Number
	},
	alpha: {
		range: [0,1],
		type: Number
	}
}
var _ANIMATABLE_GEOMETRY = {
	fillColor: 		_asGroup(_ANIMATABLE_COLORS),
	strokeColor: 	_asGroup(_ANIMATABLE_COLORS),
	strokeWidth: 	{	range: [0,100], type: Number  },
};
var _ANIMATABLE_PIVOT = {
	_x: 	{ type: Number },
	_y: 	{ type: Number },
};
var _ANIMATABLE_POS = {
	x: 	{ type: Number },
	y: 	{ type: Number },
};
var _ANIMATABLE_SIZE = {
	width: 	{ type: Number },
	height: { type: Number },
};
var _ANIMATABLE_RECT = _.extend({}, _ANIMATABLE_POS, _ANIMATABLE_SIZE, {
	left: 	{ type: Number },
	top: 	{ type: Number },
	right: 	{ type: Number },
	bottom: { type: Number },
	point: 	_asGroup(_ANIMATABLE_POS),
});
var _ANIMATABLE_GROUP = {
	frame: 		{
					range: [0,Math.Infinity],
					type: 	Number
				},
	offsetOnPath: {
					range: [0,1],
					type: 	Number
				},
	state: 		{
					allowedValues: 	[],
					type: 			String
				}
};
var _ANIMATABLE_DEFAULTS = {
	blendMode: {
					allowedValues: ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard- light', 'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'color', 'add', 'subtract', 'average', 'pin-light', 'negation', 'source- over', 'source-in', 'source-out', 'source-atop', 'destination-over', 'destination-in', 'destination-out', 'destination-atop', 'lighter', 'darker', 'copy', 'xor'],
					type: String
				},
	bounds: 	_asGroup(_ANIMATABLE_RECT),
	opacity: 	{
					range: [0,1],
					type: 	Number
				},
	pivot: 		_asGroup(_ANIMATABLE_POS),
	position: 	_asGroup(_ANIMATABLE_POS),
	rotation: 	{
					range: [-360,360],
					type: 	Number
				},
	visible: 	{
					type: 	Boolean
				}
}
var ANIMATABLE_PROPERTIES = {
	Path: 		_.extend({}, _ANIMATABLE_DEFAULTS, _ANIMATABLE_GEOMETRY, _ANIMATABLE_GROUP, {
					growth: {
						range: [0,1],
						type: Number
					},
					segments: {
						type: 	'elements'
					},

				}),
	Segment: 	_asGroup({
					point: 		_asGroup(_ANIMATABLE_PIVOT),
					handleIn: 	_asGroup(_ANIMATABLE_PIVOT),
					handleOut: 	_asGroup(_ANIMATABLE_PIVOT),
				}),
	SymbolItem: _ANIMATABLE_DEFAULTS,
	Group: 		_.extend({}, _ANIMATABLE_DEFAULTS, _ANIMATABLE_GROUP),
	PointText: 	_.extend({}, _ANIMATABLE_DEFAULTS, _ANIMATABLE_GEOMETRY)
}

/* styles for blueish highlighting of paths onHover */
var _HOVER_STYLES = {
	PATHS: {
		opacity: 	 1,
		strokeColor: '#009dec',
		strokeWidth: 1,
		fillColor: 	 null
	},
	TEXT: {
		opacity: 	 1,
		strokeWidth: 0,
		fillColor: 	 '#009dec'
	}
};

/* internal helper funcs */
var _isBoundsItem = function(item) {
	return ['PlacedSymbol', 'Group', 'SymbolItem', 'Raster'].indexOf(item.className) >= 0;
};
var _normalizeCaller = function(caller) {
	if(caller.match(/^danimator([A-Z].*)?$/g) || caller === 'onGameStart' || !caller.length) {
		return 'root';
	}
	return caller;
}

function _asGroup(config) {
	return { 
		content: config,
		type: 'group'
	};
}
/* transform linear scale to logarithmic scale (used in animation panel's zoom) */
function _linearTolog(factor, min, max) {
  min = Math.log(min);
  max = Math.log(max);
  return Math.exp(min + (max-min) * factor);
}
/* returns number of decimal places of a floating number */
function _decimalPlaces(num) {
  var match = (''+num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) { return 0; }
  return Math.max( 0, (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0));
}
/* same as http://php.net/manual/en/function.basename.php */
function _basename(str) {
   var base = new String(str).substring(_.lastIndexOf(str, '/') + 1); 
    if(_.lastIndexOf(base, '.') != -1)       
        base = base.substring(0, _.lastIndexOf(base, '.'));
   return base;
}
/* gets directory of given path */
function _basepath(str) {
	return str.substring(0, _.lastIndexOf(str, '/') + 1);
}
function _deepOmit(obj, keysToOmit) {
  var keysToOmitIndex =  _.keyBy(Array.isArray(keysToOmit) ? keysToOmit : [keysToOmit]); // create an index object of the keys that should be omitted

  function _omitFromObject(obj) { // the inner function which will be called recursivley
    return _.transform(obj, function(result, value, key) { // transform to a new object
      if (key in keysToOmitIndex) { // if the key is in the index skip it
        return;
      }
      result[key] = _.isObject(value) ? _omitFromObject(value) : value; // if the key is an object run it through the inner function - _omitFromObject
    })
  } 
  return _omitFromObject(obj); // return the inner function result
}
/* helper to retrieve first element of ES6 Sets */
function _firstFromSet(set) {
	return set.values().next().value;
}

/* file saving helpers*/
function _changesFile(filetype) {
	_.set(currentGame.files[filetype], 'saved', false);
}
function _changesProp(prop, value) {
	var $input = _PANELS.properties.$element.find('input[data-prop="' + prop + '"]');
	if(typeof value === 'boolean') {
		$input.prop('checked', value);
	} else {
		$input.val(value);
	}
}
/* helper to retrieve humanly readable name from a paperJS item */
function _getAnimationName(item, property, type) {

	var fx = type && type.match(/^danimator(.*)$/);
	fx = fx && _.lowerFirst(fx[1]);

	if(fx === 'then') fx = false;

	property = property && property.replace(/\./g, '_');
	fx = (fx || property) ? '_' + (fx || property) : '';

	return (item.name || ('layer' + item.id)) + fx;
}
/* internal helper to deselect all paperJS items and update panels accordingly */
function _resetSelection() {
	selectedElements.unselect(currentGame.project);
	_anchorViz.visible = false;

	_PANELS.layers.$element
		.find('.layer').removeClass('selected').end()
		.find('.type').text('').end()
		.find('ul.main').scrollTop(0).html(_PANELS.properties.emptyState.template({ checked: FLAGS.view.selection }));
}
/* mapping all alerts to the console */
function alert(message, mode) 	{
	alertify && alertify.notify(message, mode || 'success');
}
/* helper to turn a string into alphachars only */
function slug(name) 	{ return name.replace(/[^a-z0-9_\-]+/g, '_'); }
function noop(anything) { return anything; };

/* helpers for loading states */
function setLoading(label, element) {
	if(_loadingStates.indexOf(label) < 0) {
		_loadingStates.push(label);
	}
	if(_loadingStates.length) {
		$(element || 'body').addClass('loading');
	}
}
function resetLoading(label, element) {
	if(_loadingStates.indexOf(label) >= 0) {
		_.pull(_loadingStates, label);
	}
	if(!_loadingStates.length) {
		$(element || 'body').removeClass('loading');
	}
}

/* override animate method to add animations to animation stack for animations panel */
Danimator.animate = function danimatorAnimate(item, property, fr, to, duration, options) {

	/* experiment: get line number of Danimator invocation to replace inline
	var _scriptInfo = (function() { try { throw Error('') } catch(err) { return err; } })();
	console.log('stack', _scriptInfo.stack, _scriptInfo.stack.match(/^\s*at\s+([^\s]+)\:(\d+)\:(\d+)/m), _scriptInfo.stack.split("\n"));
	*/

	var ease 	  = (property === 'frame' ? null : 'cubicOut');				// set default easing
	var startTime = (options && options.delay) || 0;
	var caller 	  = _normalizeCaller(danimatorAnimate.caller.caller.name);	// who triggered this animation? 

	var track = tracks[item.id] || {
			item: 		item,
			properties: {},
			startTime: 	(new Date).getTime() - Danimator.startTime,
		};

	var propertyTrack 	= _.get(track.properties, property, []);			// retrieve existing track or create one
	var options 		= _.defaults(options, { delay: 0, easing: ease });	// overwrite defaults with passed options

	if(!item.data._animationsStart)
		item.data._animationsStart = _getStartTime({options: options, duration: duration});

	// if this is the earliest animation change item's initial property value to animatable's "from" value
	if(_getStartTime({options: options, duration: duration}) <= _.get(item.data, '_animationsStart', 10000)) {
		_.set(item, property, fr);
	}

	// create "keyframe"
	var key = {
		from: 		fr,
		to: 		to,
		initValue: 	_.get(item, property),
		duration: 	duration || 1,
		options: 	options,
		caller: 	caller,
		name: 		_getAnimationName(item, property, Danimator.caller && Danimator.caller.name),
		id: 		propertyTrack.length
	};

	// make sure start of ani isn't existing already
	var duplicate = _.find(propertyTrack, {options: { delay: options.delay }});
	if(duplicate) {
		_.pull(propertyTrack, duplicate);
	}

	propertyTrack.push(key);

	/* calc max duration on track-level */
	track.maxDuration   = Math.max(track.maxDuration || 0, options.delay + (duration || 1));
	/* calc max duration on global level */
	Danimator.maxDuration = Math.max((Danimator.maxDuration || 0), track.maxDuration);

	track.properties[property] = propertyTrack;
	tracks[item.id] = track;

	// ensure createTracks is only called a max of every second
	_.debounce(_createTracks, 1000)();

	/* return handles for easier chaining of animations */
	return {
		duration: duration,
		options: options,
		then: 	 Danimator.then,
		stop: 	 noop
	};
};

/* override load method to create tracks instead of animation calls */
Danimator.load = function danimatorLoad(aniName) {
	var filename = aniName + '.ani.json';

	$.getJSON(filename, null, function(json, status) {
		if(status === 'success') {
			_.each(json, function(track, id) {
				if(!isNaN(Number(id))) id = Number(id);
				track.item = paper.project.getItem({id: id});
			})
			tracks = _.extend(tracks, json);
			_createTracks();
			Danimator.time = Danimator.time;
		} else {
			console.warn('Animations "' + filename + '" couldn\'t be loaded :(');
		}
	}).fail(function(promise, type, error){ console.error(error); });
}

/* update properties panel on every step of the animation */
Danimator.onStep = function danimatorStep(animatable, value) {
	if(selectedElements.has(Danimator.sceneElement(animatable.item))) {
		_changesProp(animatable.property, value);
	}
}
/* update layers panel when morphing is triggered */
Danimator.onMorph = function() {
	_createLayers(Danimator.layers, _PANELS.layers.$element.find('ul').empty());
}

/* send unsaved data to node server (see /server/…) */
Danimator.save = function danimatorSave(data, filename) {
	return $.ajax({
		url: 	   		'http://localhost:8080/save',
		type: 		 	'POST',
		contentType: 	'application/json; charset=utf-8',
		dataType: 	 	'json',
		data: 			JSON.stringify({ file: filename, content: JSON.stringify(data) }),
		success: 		function(response) {
							console.log('we are back with', response);
						}
	});
}

/* we are in "interactive" mode when in editor */
Danimator.interactive = true;

/* events, events, events! */
jQuery(function($){

	var downPoint;
	var draggingVisibles;
	var draggingMaster;
	var playInterval;
	var lastOffset;
	var lastTime = 0;

		/* save all "reactive" DOM elements as local vars */
	_.each(_PANELS, function(store, panel) {
		// create templating function from template#*-panel-item
		var _tmpl = document.getElementById(panel + '-panel-item').content.children[0].outerHTML;

		store.template = _.template(_.unescape( _tmpl ));
		store.$element = $('#' + panel + '-panel');
		return store;
	});
	_PANELS.properties.emptyState = { 
		template: _.template(_.unescape(document.getElementById('properties-panel-empty-item').content.children[0].outerHTML)) 
	};
	
	$time 			 = _PANELS.animations.$element.find('.description time');
	$animationValue  = _PANELS.animations.$element.find('.description output');

	$(document)
		/* layer-specific events */
		.on('click', '.panel .layer', function(event) {
			$(this).trigger($.Event('selected', {
				handpicked: true,
				item: Danimator.sceneElement(this).item
			}));

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		})
		.on('selected', '.panel .layer', function(event) {
			var $layer 	 = $(this);
			var id 		 = $layer.data('id');
			var selected = !$layer.is('.selected');

			_resetSelection();

			if(FLAGS.view.selection) {
				event.item.fullySelected = selected;
			}

			/* change all parent layer's selected state */
			var $layers = _PANELS.layers.$element.find('ul.main');
			var $allParents = $layer.parentsUntil($layers).andSelf().filter('.layer').toggleClass('selected', selected);

			$layers.scrollTop( $layer[0].offsetTop - ($layers.height() - $layer.height()) / 2 );

			/* if human interaction triggered event open all parent layers */
			if(event.handpicked) {
				$allParents.toggleClass('open', selected);
			}

			_PANELS.animations.$element.toggleClass('hasSelection', selected);

			if(selected) {
				selectedElements.add( Danimator.sceneElement($layer) );

				/* update title of property panel and trigger refresh */
				_PANELS.properties.$element.find('.type').text(' OF ' + event.item.className + ' ' + (event.item.name || ''));
				_createProperties(ANIMATABLE_PROPERTIES[event.item.className], _PANELS.properties.$element.find('ul.main').empty(), event.item);

				/* move anchor helper into position and show */
				_anchorViz.position = event.item.pivot || event.item.bounds.center;
				_anchorViz.visible = true;
			}

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		})
		/* handle visibility of layers */
		.on('mousedown', '.panel .layer .visible', function(event) {
			draggingVisibles = $(this).closest('.layer').is('.hidden') + 0;
			draggingMaster   = this;
		})
		.on('mouseenter', '.panel .layer .visible:visible', function(event) {
			/* dragging across layers to hide all dragged over ones */
			if(draggingVisibles > -1) {
				var $layer = $(this).closest('.layer');
				var hidden = !$layer.is('.hidden');

				if(hidden != draggingVisibles) {
					$layer.find('.visible').click();
				}
			};
		})
		.on('mouseleave', '.panel .layer .visible', function(event) {
			if(draggingVisibles > -1) {
				if(draggingMaster === this) {
					$(this).closest('.layer').toggleClass('hidden', draggingVisibles);
				}
			};
		})
		/* toggle layer visibility */
		.on('click', '.panel .layer .visible', function(event) {
			var $layer 	= $(this).closest('.layer');
			var hidden 	= !$layer.is('.hidden');

			$layer.toggleClass('hidden');

			Danimator.sceneElement($layer).item.visible = !hidden;

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		})
		/* keyframes time input */
		.on('blur', 'time', function(event) {
			var $this = $(this);
			var value = Number($this.text().replace(/[^\d\.\,]*/g, ''));
			if(isNaN(value)) {
				value = Danimator.time;
			} else {
				Danimator.time = value;
			}
			$this.text(value + 's');
		})
		/* reset time on dblclick */
		.on('dblclick', 'time', function(event) {
			$(this).text(0).trigger('blur');
		})
		/* animations panel zoom slider */
		.on('input', '.zoom', function(event) {
			var zoom = Danimator.limit($(this).val(), 1, 100)/100;
			var minZoom = 5;
			var maxZoom = 60;

			TIME_FACTOR = _linearTolog(1-zoom, minZoom, maxZoom);
			$(this).attr('title', parseInt(10 + (TIME_FACTOR-minZoom) / (maxZoom-minZoom) * 190) + '%');
			_.each(Danimator.sounds, function(sound) {
				sound.wave.zoom(TIME_FACTOR);
			});

			_createTracks();
		})
		/* reset zoom on dblclick */
		.on('dblclick', '.zoom', function(event) {
			$(this).val(50).trigger('input');
		})
		/* timeline handling */
		.on('mousedown', '.timeline .track', function(event) {

			if($(event.target).is('.keyframe')) {
				_frameDragging = true;
			}

			if(!_frameDragging) {
				_timeScrubbing = true;
				event.type = 'mousemove';
				$(this).trigger(event).addClass('scrubbing');
				Danimator._activeSound && Danimator._activeSound.wave.play(Danimator.time, Danimator.time + .08);
				_PANELS.animations.$element.removeClass('hasSelection');
			}
		})
		/* time scrubbing */
		.on('mousemove', '.timeline .track', function(event) {
			// wrapping in requestAnimationFrame() to enhance performance (see http://37signals.com/talks/soundslice at 35:40)
			requestAnimationFrame(function() {
				if(!_frameDragging)
					if(_timeScrubbing) {
						var $this = $(event.currentTarget);
						var x = event.clientX - $this.offset().left - 1;
						var t = x / TIME_FACTOR;

						if(event.shiftKey) {
							t = _snapKeyframes.snap(t);
						}
						
						$currentTrack = $this;
						Danimator.time = t;
						
						// allow sound scrubbing by playing tiny chunks of it while dragging
						Danimator._activeSound && Danimator._activeSound.wave.play(Danimator.time, Danimator.time + .08);
					}
			});
		})
		.on('mouseup', '.timeline .track', function(event) {
			$(this).removeClass('scrubbing');
		})
		/* select item and property of doubleclicked keyframe */
		.on('dblclick', '#animations-panel .keyframe', function(event) {
			var $this 	= $(this);
			var prop 	= $this.closest('li.timeline').data('property');
			var element = Danimator.sceneElement($this.closest('li.item'));

			// trigger selection of corresponding layer
			element.data.$layer.not('.selected').trigger( $.Event('selected', {item: element.item}) );
			
			var $input = _PANELS.properties.$element.find('input[data-prop="' + prop + '"]');
			$input.parentsUntil('ul.main').filter('li').addClass('open');
			$input.focus();

			Danimator.time = $this.data('time');

			event.stopImmediatePropagation();
		})
		.on('dblclick', '#animations-panel .track', function(event) {
			var duration = parseInt(prompt('Please enter a duration (in seconds) for this animation!', '1s'));

			if(duration && !isNaN(duration)) {
				var $this 	= $(this);
				var item 	= $this.closest('li.item').data('track').item;
				var prop 	= $this.closest('li.timeline').data('property');
				var value 	= _.get(item, prop);

				Danimator(item, prop, value, value, duration, { delay: Danimator.time });
				_createTracks();
			} else {
				alert('You have to supply a floating number for duration!', 'error');
			}
		})
		/* interactivity of property inputs */
		.on('change', '#properties-panel :input', function() {
			if(selectedElements.size) {
				var $this 	 = $(this);
				var prop  	 = $this.data('prop');
				var data 	 = $this.closest('li').data();
				var oldValue = $this.data('oldValue') || this.defaultValue;
				var value 	 = $this.is(':checkbox') ? $this.is(':checked') : $this.val();
				var item  	 = selectedElements.single.item;
				var segmentProp = false;
				var props 	 = {};
				var converter;

				/* use lodash's _.toString, _.toNumber, etc. depending on type */
				if(converter = _['to' + _.capitalize(data.type)]) {
					value = _['to' + _.capitalize(data.type)](value);
				}

				/* coerce to number */
				if($this.prop('type') === 'number') {
					value = Number(value);
				}

				var isPivot = !!prop.match(/^pivot\.?/);
				var isPosition = !!prop.match(/^position\.?/);
				segmentProp = prop.match(/^segments\.(\d+)\.(.*)/);

				var label = segmentProp ? 
								'change segment of ' + _getAnimationName(item) : 
								'change property ' + prop + ' of ' + _getAnimationName(item, prop);

				_changesFile('ani.json');

				new Undoable(function() {
					// if property is part of segment
					if(segmentProp) {
						_.set( item.segments[parseInt(segmentProp[1])], segmentProp[2], value );
						_changesProp(segmentProp[2], value);
					} else {
						props[prop] = value;
						_.set(item, prop, value);
						_changesProp(prop, value);

						if(isPosition) {
							_changesProp('pivot.x', _.get(item.pivot, 'x', item.bounds.center.x));	// update property field "pivot.x"
							_changesProp('pivot.y', _.get(item.pivot, 'y', item.bounds.center.y));	// update property field "pivot.y"
						}
						if(isPivot || isPosition) _anchorViz.position = item.pivot || item.bounds.center;

						if(prop.match(/^state\.?/)) {
							// force updating of state
							item.state = item.state;
						}
					}
				}, function() {
					// if property is part of segment
					if(segmentProp) {
						_.set(item.segments[parseInt(segmentProp[1])], segmentProp[2], oldValue);
						_changesProp(segmentProp[2], oldValue);
					} else {
						_.set(item, prop, oldValue);
						_changesProp(prop, oldValue);

						if(isPosition) {
							_changesProp('pivot.x', _.get(item.pivot, 'x', item.bounds.center.x));
							_changesProp('pivot.y', _.get(item.pivot, 'y', item.bounds.center.y));
						}
						if(isPivot || isPosition) _anchorViz.position = item.pivot || item.bounds.center;
					}
				}, label);

				if(data.track) {
					var itemId = selectedElements.single.item.id;
					var currentTrack = tracks[itemId].properties[prop];

					_.each(currentTrack, function(track, id) {
						if(Danimator.time === _getStartTime(track)) {
							track.from = value;
							if(id === 0) {
								track.initValue = value;
							}
						} else if(Danimator.time === _getEndTime(track)) {
							track.to = value;
						}
					});

					_createTracks();
				}

				$this.data('oldValue', value);
			}
		})
		.on('keyup', '#properties-panel :input', function(event) {
			/* use shiftKey + arrow keys to jump in tens instead of ones */
			if(event.shiftKey) {
				var delta = 0;
				switch(event.key) {
					case 'ArrowDown':
						delta = -9;
						break;
					case 'ArrowUp':
						delta = 9;
						break;
					default: break;
				}
				if(delta !== 0) {
					var $this = $(this);
					var step  = parseFloat($this.attr('step'));
					var range = [parseFloat($this.attr('min')), parseFloat($this.attr('max'))];
					var value = parseFloat($this.val()) + step * delta;

					if(isNaN(range[0])) range[0] = -10000;
					if(isNaN(range[1])) range[1] = 10000;

					// we limit to min/max attrs and hack rounding errors by setting a limit on the decimals
					$this.val( _.round( Danimator.limit(value, range[0], range[1]), _decimalPlaces(step * 10)) ).trigger('change');
				}
			} else if(event.key === 'Escape') {
				var $this = $(this);
				$this.val($this.attr('value')).blur();
			}
		})
		/* allow number manipulation using the mousewheel (with a small lag) */
		.on('mousewheel', '#properties-panel :input', _.debounce(function(event) {
			$(this).trigger('change');
		}, 600))
		.on('dblclick', '.panel .audio', function() {
			$(this).data('wave').play();
		})
		.on('click', '.panel .audio label', function() {
			var $audio = $(this).parent().toggleClass('muted');
			$audio.data('wave').setVolume($audio.is('.muted') ? 0 : 100);
		})
		/* all resets onMouseUp */
		.on('mouseup', function() {
			if(_timeScrubbing) Danimator._activeSound && Danimator._activeSound.wave.pause();
			_timeScrubbing = false;
			_frameDragging = false;
			draggingVisibles = -1;
			delete draggingMaster;
			$animationValue.text('');
		})
		/* keydown for continuous hotkeys outside of alphanumeric range */
		.on('keydown', function(event) {
			if(!$(event.target).is(':input,[contenteditable]')) {

				var dirX = 0, dirY = 0;

				switch(event.key) {
					/* movement of elements */
					case 'ArrowLeft': 	dirX = -1; 	break;
					case 'ArrowRight': 	dirX = +1; 	break;
					case 'ArrowUp': 	dirY = -1; 	break;
					case 'ArrowDown': 	dirY = +1; 	break;
				}

				// if we have a direction given (thru arrowKeys)
				if((dirX + dirY) !== 0) {
					var element;

					// move the element according to dirX and dirY
					if(element = selectedElements.single) {
						// 10x movement with shift
						if(event.shiftKey) {
							dirX *= 10;
							dirY *= 10;
						}	
						element.item.position = element.item.position.add( new paper.Point(dirX, dirY) );
					}
				}
			}
		})
		/* keyup for "trigger" hotkeys, keypress for continuous hotkeys */
		.on('keyup', function(event) {
			if(!$(event.target).is(':input,[contenteditable]')) {
				switch(event.key) {
					/* play/pause on spacebar */
					case ' ':
						var _updateTime = function(event) {
							var now = (new Date).getTime() / 1000;
							if(_playing) {
								if(Danimator.time >= Danimator.maxDuration) {
									currentGame.scene.item.off('frame', _updateTime);
									Danimator._activeSound.wave.stop();
									Danimator.time = 0;
									_playing = false;
								} else {
									Danimator.time = now - lastTime;
								}
							} else {
								currentGame.scene.item.off('frame', _updateTime);
								Danimator._activeSound.wave.pause();
							}
						}

						if(!_playing) {
							lastTime = (new Date).getTime() / 1000 - Danimator.time;
							// attach frame handler _updateTime
							currentGame.scene.item.on('frame', _updateTime);
							Danimator._activeSound.wave.play();
						} else {
							// detach frame handler _updateTime
							currentGame.scene.item.off('frame', _updateTime);
						}

						_playing = !_playing;

						return false;
					/* zoomReset */
					case '0':
						if(event.ctrlKey || event.metaKey) {
							currentGame.project.view.zoom = 1.5;
							_anchorViz.scale(1);
							return false;
						}
						break;
					case 'o':
						if(selectedElements.size) {
							_PANELS.properties.$element.find('input[data-prop=opacity]').focus()[0].select();
						}
						break;
					case 'r':
						if(selectedElements.size) {
							_PANELS.properties.$element.find('input[data-prop=rotation]').focus()[0].select();
						}
						break;
					case 's':
						if(event.ctrlKey || event.metaKey) {
							currentGame.saveAll(event.shiftKey);
							event.preventDefault();
							event.stopImmediatePropagation();
						}
						break;
				}
			}
		})
		.on('keypress', function(event) {
			if(!$(event.target).is(':input,[contenteditable]')) {
				var cmdKey = event.ctrlKey || event.metaKey;

				switch(event.key) {
					/* prevFrame */
					case ',':
						Danimator.time = Danimator.limit(Danimator.time - 1/12, 0, Danimator.maxDuration);
						return false;
					/* nextFrame */
					case '.':
						Danimator.time = Danimator.limit(Danimator.time + 1/12, 0, Danimator.maxDuration);
						return false;
					/* prevFrame * 10 */
					case ';':
						Danimator.time = Danimator.limit(Danimator.time - 1/2, 0, Danimator.maxDuration);
						return false;
					/* nextFrame * 10 */
					case ':':
						Danimator.time = Danimator.limit(Danimator.time + 1/2, 0, Danimator.maxDuration);
						return false;	
					/* zoomIn */
					case '+':
						currentGame.project.view.zoom += .1;
						_anchorViz.scale(0.9);
						return false;
					/* zoomOut */
					case '-':
						currentGame.project.view.zoom -= .1;
						_anchorViz.scale(1.1);
						return false;
					/* undo */
					case 'z':
						if(cmdKey) history.back();
						return false;
					/* redo */
					case 'y':
						if(cmdKey) history.forward();
						return false;
				}
			} else {
				if(event.key === 'Enter') {
					/* loose focus of inputs when hitting the return key */
					$(event.target).trigger('blur');
				}
			}
		})
		/* time control with cmdKey + mousewheelX */
		.on('mousewheel', function(event) {
			// wrapping in requestAnimationFrame() to enhance performance (see http://37signals.com/talks/soundslice at 35:40)
			requestAnimationFrame(function() {
				if(event.metaKey) {
					var delta = { x: event.originalEvent.deltaX, y: event.originalEvent.deltaY };

					if(Math.abs(delta.x) > 0.1) {
						var time = Danimator.time + delta.x * 1/24;
						if(event.shiftKey) {
							time = _snapKeyframes.snap(time);
						}
						Danimator.time = time;
					}

					event.preventDefault();
					event.stopImmediatePropagation();
				}
			});
		})
		// file dropping 
		.on('dragover', 'body', function(event) { 
			event.preventDefault();
			event.stopImmediatePropagation();
			$('#dummy').addClass('dropping'); 
		})
		.on('drop', '#dummy', function(event) { 
			event.preventDefault();

			var data = new FormData();

			_.each(event.originalEvent.dataTransfer.items, function(item){
				console.log('item', item);
			});

	        _.each(event.originalEvent.dataTransfer.files, function(file, i) {
	        	var type 	  = file.type.split('/');
	        	var extension = _.last(file.name.split('.'));
	        	var reader 	  = new FileReader();

	        	reader.onload = function(event) {
	        		currentGame.load(event.target.result);

	        		switch(type[1]) {
		        		case 'javascript':
	        				console.log('script(s) on board.', extension, file);
		        			break;
		        		case 'svg+xml':
		        			console.log('vector on board.');
		        			break;
		        		default:
		        			console.error('not found!');
		        	}
	        		//currentGame.load({svg: event.target.result});
  				};

  				if(type[0] === 'text') {
  					reader.readAsText(file);
  				} else {
  					reader.readAsBinaryString(file);
  				}
	            data.append('file_' + i, file);
	        });
			$('#dummy').removeClass('dropping'); 
		})
		.on('dragleave', '#dummy', function(event) {
			event.preventDefault();
			event.stopImmediatePropagation();
			$('#dummy').removeClass('dropping'); 	
		});
});

/* create layers (UI) for layer panel */
function _createLayers(layers, $layers) {
	_.each(layers, function(layer, index) {
		if(layer) {
			var sceneElement = Danimator.sceneElement(layer);
			var $layer = $(_PANELS.layers.template({
							name: 			layer.name || ('[Layer ' + layer.id + ']'),
							hasChildren: 	!!(layer.children && layer.children.length),
							hidden: 		!layer.visible,
							id: 			layer.id
						})).data('sceneElement', sceneElement);

			sceneElement.data.$layer = $layer;

			layer.data.onStateChanged = layer.data.onFrameChanged = function() {
				_createLayers(layers, $layers.empty());
			}

			/* sublayer support */
			if(layer.children && layer.children.length) {
				var $sublayers = $('<ul>').appendTo($layer);
				_createLayers(layer.children, $sublayers);
			}
			$layers.append($layer);
		}
	});
}

/* UI helpers for animations panel */
function _getStartTime(track) 	{ return _.get(track ,'options.delay', 0);		}
function _getEndTime(track) 	{ return _getStartTime(track) + _.get(track, 'duration', 0); }

/* colorisation & gradient styles for timeline tracks in animations panel */
function _getStartStyle(property, tracks, key, type) {
	var propertyConfig = _.get(ANIMATABLE_PROPERTIES[type], property.replace(/(\.\d+)?\.([^\.]+)$/, '.content.$2'));

	if(propertyConfig) {
		var currentTrack = tracks[key];
		var value;

		if(_.isEqual(propertyConfig.range, [0,1])) {					// if min/max of prop between 0 and 1
			if(key === 0) {
			 	value = currentTrack.initValue;
			} else {
				value = _.get(currentTrack, 'from', tracks[key-1].to);
			}
			var color = _.repeat(parseInt(value * 15).toString(16), 3);	// show property as black/white gradient
		} else if(_.last(property.split('.')) === 'hue') {				// show hue as colored gradient
			value = _.get(currentTrack, 'from');
			color = new paper.Color({hue: value, saturation: 1, lightness: .5}).toCSS(true).slice(1);
		}

		return 'background:#' + color;
	}
}
function _getRangeStyle(property, tracks, key, type) {
	var propertyConfig = _.get(ANIMATABLE_PROPERTIES[type], property.replace(/(\.\d+)?\.([^\.]+)$/, '.content.$2'));

	if(propertyConfig) {

		var currentKey 	= tracks[key];
		var lastKey 	= tracks[key-1];
		var to 			= currentKey.to;
		var begin;
		var end;

		if(key === 0) {
			currentKey.from = currentKey.initValue;
		} else {
			currentKey.from = _.isNil(currentKey.from) ? lastKey.to : currentKey.from;
		}

		if(propertyConfig.range && _.isEqual(propertyConfig.range, [0,1])) {
			begin = _.repeat(parseInt(currentKey.from * 15).toString(16), 3);
			end   = _.repeat(parseInt(to * 15).toString(16), 3);
		} else if(_.last(property.split('.')) === 'hue') {
			begin = new paper.Color({hue: currentKey.from, saturation: 1, lightness: .5}).toCSS(true).slice(1);
			end   = new paper.Color({hue: to, 			   saturation: 1, lightness: .5}).toCSS(true).slice(1);
		}

		if(begin && end) {
			return 'background:linear-gradient(90deg,#' + begin + ',#' + end + ')';
		}
	}
}
function _getEndStyle(property, track, type) {
	var propertyConfig = _.get(ANIMATABLE_PROPERTIES[type], property.replace(/(\.\d+)?\.([^\.]+)$/, '.content.$2'));

	if(propertyConfig) {
		if(propertyConfig.range && _.isEqual(propertyConfig.range, [0,1])) {
			var color = _.repeat(parseInt(track.to * 15).toString(16), 3);
		} else if(_.last(property.split('.')) === 'hue') {
			var color = new paper.Color({hue: track.to, saturation: 1, lightness: .5}).toCSS(true).slice(1);
		}
		return 'background:#' + color;
	}
}

/* create timeline tracks (UI) for animations panel */
function _createTracks() {
	var $tracks = _PANELS.animations.$element.find('ul.main').empty();

	_.each(tracks, function(track) {
		if(track) {
			var properties = _.mapValues(track.properties, _.partial(_.sortBy, _, 'options.delay'));
			var sceneElement = Danimator.sceneElement(track.item);

			var $keys = $(_PANELS.animations.template({
					Danimator: 		Danimator,
					maxDuration: 	_.round(track.maxDuration, 2),
					name: 			track.item.name,
					type: 			track.item.className,
					properties: 	properties,
					TIME_FACTOR: 	TIME_FACTOR,
					getTrigger: 	function(range) { 
						switch(range.caller) {
							case '':
							case 'root':
								return '';
						}
						return ' triggered';
					}
				})).data({ track: track, sceneElement: sceneElement, element: $keys });

			sceneElement.data.$keys = $keys;
			
			var $frames = $tracks.append($keys).find('.keyframe');

			// add all full seconds to the snapping steps of keyframes
			_snapKeyframes.list = _.range(Danimator.maxDuration);

			$frames.each(function() {
				var $this = $(this);
				var _y = $this.top() - 7;
				
				var newTime;
				var currentTrack;

				var keyTime    = $this.data('time');
				var $lastRange = $this.prev('.range');
				var $nextRange = $this.next('.range');

				// add keyframe's time to snapping steps 
				_snapKeyframes.add( keyTime );

				$this.draggable({ 
					containment: [ $lastRange.left() + 1, _y, $nextRange.right() - 1, _y],
					cursor: 'pointer',
					start: 	function() { _frameDragging = true; },
					stop: 	function(event, ui) { 

						_.each(currentTrack, function(track, index) {
							// if startTime corresponds original time of currently dragged key
							if(_getStartTime(track) === keyTime) {
								// adapt startTime
								track.options.delay = newTime;
								track.duration = _getEndTime(track) - newTime;

							} else if(_getEndTime(track) === keyTime) {
								// adapt endTime
								track.duration = newTime - _getStartTime(track);
							}
						});

						_frameDragging = false; 
						_createTracks();
					},
					drag: 	function(event, ui) { 
						// wrapping in requestAnimationFrame() to enhance performance (see http://37signals.com/talks/soundslice at 35:40)
						requestAnimationFrame(function() {
							_frameDragging = true;

							var x 			= ui.position.left - 1;
							var index 	 	= $this.closest('.track').find('.keyframe').index($this);
							var property 	= $this.closest('li.timeline').data('property');

							currentTrack 	= $this.closest('li.item').data('track').properties[property];
							newTime 		= x / TIME_FACTOR;

							/* snap to snapping points onShiftHold */
							if(event.shiftKey) {
								newTime = _snapKeyframes.snap(newTime);
								x = newTime * TIME_FACTOR;
								ui.position.left = x + 1;
							}

							Danimator.time = newTime;

							var $nextRange 		= $this.next('.range');
							var $prevRange 		= $this.prev('.range');
							var $nextKeyframe	= $this.next().next('.keyframe');

							var nextRangeDimensions = { left: x };

							if($nextKeyframe.length) {
								nextRangeDimensions.width = ($nextKeyframe.data('time') - newTime) * TIME_FACTOR;
							}

							$prevRange.width( x - $prevRange.position().left );
							$nextRange.css(nextRangeDimensions);					// position "range" right after keyframe
						});
					}
				});
			});
		}
	});
}

/* create properties (UI) for properties panel */
function _createProperties(properties, $props, item, subitem, path) {
	// make sure path ends in dot
	path = path ? _.trim(path, '.') + '.' : '';

	_.each(properties, function(prop, name) {
		if(name !== 'type') {
			var step 	  = 1;
			var keyed  	  = [];

			/* calc step for numeric inputs */
			switch(name) {
				default:
					if(prop.range) {
						step = (prop.range[1] - prop.range[0]) / 100;
					}
					break;
				case 'frame':
				case 'rotation':
					step = 1;
					break;
			}

			/* highlighting of animated/triggered properties (in red and violet) */
			var property 	  = path + name;
			var propertyTrack = tracks[item.id] && _.get(tracks[item.id].properties, property);

			if(propertyTrack) {
				keyed.push('animated');

				var isKey = _.find(propertyTrack, {options: { delay: Danimator.time }});

				if(!isKey) {
					isKey = _.some(propertyTrack, function(track) {
						return _getEndTime(track) === Danimator.time;
					});
				}
				
				/* add "keyed" class if currentTime corresponds to the current keyframe's time */
				if(isKey) keyed.push('keyed');

				if(_.reject(propertyTrack, { caller: 'root' }).length) {
					keyed.push('triggered');
				}
			}

			/* actual creation of property visualization */
			var config = _.extend({}, { 
							name: 		name + '',
							item: 		item,
							path: 		path,
							keyed:  	keyed,
							range: 		['', ''],
							step: 		step,
							type: 		prop.type,
							value: 		_.get(subitem || item, name)
						}, prop);

			/* special case for Segments and other "subelements" of items */
			if(config.type === 'elements') {
				var elements = {};

				_.each(_.get(subitem || item, name), function(element, key) {
					elements[key] = ANIMATABLE_PROPERTIES[element.className];
				});

				config.content = elements;
				config.type = 'group';
			}

			if(prop.allowedValues && !prop.allowedValues.length) {
				if(typeof config.value === 'object') {
					config.content = _.mapValues(config.value, function(value, key) {
						return ANIMATABLE_PROPERTIES[item.className][name];
					});
					config.type = 'group';
				} else {
					if(path === 'state.') {
						var states = Danimator.sceneElement(item).find(name)[0].item.states;
						config.allowedValues = Object.keys(states);
					}
				}
			}

			// render template!
			var $prop = $(_PANELS.properties.template(config)).data('track', _.first(propertyTrack));

			/* same routine for subelements ("property groups") like e.g. x and y keys of position property */
			if(config.type === 'group') {
				var $subprops = $('<ul>').appendTo($prop);
				_createProperties(config.content, $subprops, item, _.get(item, name), property);
			}
			$props.append($prop);
		}
	});
}

/* create waves (UI) for audio panel */
function _createAudio() { 
	var $sounds 	= _PANELS.audio.$element.find('ul.main').empty();
	var wave 		= false;

	_.each(Danimator.sounds, function(sound, name) {
		var config = {
			container: 		'#audio_' + slug(name),
			cursorColor: 	'crimson',
			fillParent: 	false,
			loop: 			sound.get('loop'),
			height: 		40,
			width: 			200,
			minPxPerSec: 	TIME_FACTOR,
			normalize: 		true,
			progressColor: 	'crimson',
			waveColor: 		'white'
		};
		var $sound = $(_PANELS.audio.template({
			name: name,
			id: 'audio_' + slug(name)
		}));

		$sounds.append($sound);
		wave = WaveSurfer.create(config);
		var currentWave = wave;

		wave.on('ready', function(event) {
			sound.duration = wave.getDuration();
		});

		wave.on('finish', function(event) { 
			currentWave.seekTo(0); 
			if(config.loop) {
				if(!Danimator.sounds[name].stopped) {
					currentWave.play();
				}
			}
		});

		wave.on('seek', function onWaveSeek(progress, stuff) {
			if(!_timeScrubbing) {
				Danimator.time = currentWave.getCurrentTime();
			}
		});

		sound.duration = 0;
		sound.wave = wave;

		wave.load('audio/' + name);
		$sound.data('wave', wave);
	});
}

var _throttledCreateAudio = _.debounce(_createAudio, 100);

Danimator.onSound = function danimatorOnSound(name, sound) {
	_throttledCreateAudio.apply(this, arguments);
}

/* game engine for loading SVG skeletons, extended to editing capabilities */
Game.onLoad = function(project, name, options) {

	var self = currentGame = this;

	self.time = 0;
	self.saveAll = function(saveAs) {
		setLoading('saveAll');
		_.each(currentGame.files, function(file, type) {
			//if(!file.saved) {
				switch(type) {
					case 'ani.json':
						// clone tracks, but loose all direct refs to the paperJS item
						var export_tracks = _deepOmit(tracks, 'item');
						var path = _basepath(currentGame.files.svg.path);
						var name = _basename(currentGame.files.svg.path) + '.ani.json';

						if(saveAs) {
							var export_JSON = JSON.stringify(export_tracks);
							saveAs(new Blob([export_JSON], {type: 'application/json;charset=utf-8'}), filename);
						} else {
							Danimator.save(export_tracks, path + name);
						}

						file.saved = true;

						// garbageCollect
						delete export_tracks;
						delete export_JSON;
						break;
					case 'svg':
						console.log('what about the SVG?');
						break;
				}
			//}
		});
		alert('All saved!');
		resetLoading('saveAll');
	}	

	Danimator.onTimeChanged = function danimatorTimeChanged(time) {
		var $inputs = _PANELS.properties.$element.find('li').removeClass('keyed');

		/* update all scrubbes */
		$('.timeline .scrubber').each(function(){
			var $scrubber 	 = $(this);
			var sceneElement = Danimator.sceneElement($scrubber.closest('li.item'));
			var property 	 = $scrubber.closest('li.timeline').data('property');
			var itemId 		 = sceneElement.item.id;
			var currentTrack;

			$time.text(_.round(time, 2) + 's');
			$scrubber.css('left', time * TIME_FACTOR);

			var allTracks = tracks[itemId].properties[property];

			/* retrieve all tracks before current time and sort them chronologically */
			currentTracks = _.sortBy(_.filter(allTracks, function(track) {
				return track.options.delay <= time + _.get(track.options, 'frameDuration', 1/24);
			}), 'options.delay');

			/* find track that encompasses current time */
			_.each(currentTracks, function(track, id) {
				if(_.inRange(time, _getStartTime(track), _getEndTime(track) + _.get(track.options, 'frameDuration', 1/24))) {
					currentTrack = track;
					currentTrack.id = id;
					return false;
				}
			});

			var $track  	= $scrubber.closest('.track');
			var hasActives 	= false;
			$track.find('.keyframe').removeClass('active');

			/* highlight the keyframe that corresponds to the current time */
			if(currentTrack) {
				var isFirstFrame = (time - _getStartTime(currentTrack)) <= 0.05;
				var isLastFrame  = (_getEndTime(currentTrack) - time)   <= 0;

				if(isFirstFrame) {
					$track.find('.keyframe').eq( currentTrack.id * 2 ).addClass('active');
				} else if(isLastFrame) {
					$track.find('.keyframe').eq( currentTrack.id * 2 + 1).addClass('active');
				}

				hasActives = isFirstFrame || isLastFrame;
			} else {
				currentTrack = _.maxBy(allTracks, 'options.delay');
			}

			/* update current track in animation panel and property in properties panel */
			if(currentTrack) {
				var startTime 	= _getStartTime(currentTrack);
				var endTime 	= _getEndTime(currentTrack);
				var t 			= Math.max((time - startTime) / (endTime - startTime), 0);

				currentTrack.item 		= tracks[itemId].item;
				currentTrack.property 	= property;

				if(hasActives) {
					if(selectedElements.has(sceneElement)) {
						$inputs.find('input[data-prop="' + property + '"]').parent().addClass('keyed');
					}
				}

				var ani = Danimator.step(currentTrack, t);
				var value;

				// round all numbers to 2 decimals
				if(_.isNumber(ani.value)) {
					value = _.round(ani.value,2);
				} else {
					value = '"' + ani.value + '"';
				}

				if($currentTrack && $currentTrack.length)
					if($.contains($currentTrack[0], $scrubber[0])) {
						$animationValue.text(property + ' = ' + value);
					}
			}
		});

		// get name of function that triggered Danimator.setTime which triggered Danimator.onTimeChanged (parent of parent func)
		var _calledBy = danimatorTimeChanged.caller.caller.name;

		// only if onTime hasn't been triggered by scrubbing thru waveform
		if(_calledBy !== 'onWaveSeek') {
			var _revert = !!_timeScrubbing;
			_timeScrubbing = true;
			/* update all waveforms */
			_.each(Danimator.sounds, function(sound) {
				var _soundDuration = _getEndTime(sound) - _getStartTime(sound);
				sound.wave.seekTo(time / _soundDuration);
			});
			_timeScrubbing = _revert;
		}

		self.time = time;
	}

	var layers = Danimator.layers = self.scene.item.children.slice(0).reverse();
	var $borderDummy = $('#border-dummy');
	var _hoverClone;
	var _hoverItem;

	var _clearHover = function() {
		if(_hoverClone !== undefined) {
			_hoverClone.remove();
			_hoverClone = undefined;
		}
		paper.view.update();
	}

	/* hover effect for paper elements */
	project.view.onMouseMove = function(event) {
		var hover = project.hitTest(event.point, {
			segments: true,
			stroke: true,
			curves: true,
			fill: true,
			guide: false,
			tolerance: 8 / project.view.zoom
		});

		if(hover) {
			if(hover.item !== _hoverItem) _clearHover();
			if(_hoverClone === undefined && hover.item.selected === false) {

				if(_isBoundsItem(hover.item)) {
					_hoverClone = new paper.Shape.Rectangle(hover.item.bounds);
				} else {
					_hoverClone = hover.item.clone();
				}

				if(hover.item.className === 'PointText') {
					_hoverClone.set(_HOVER_STYLES.TEXT);
				} else {
					_hoverClone.set(_HOVER_STYLES.PATHS);
				}

				if(_hoverClone.strokeWidth) {
					_hoverClone.strokeWidth /= project.view.zoom;
				}
				_hoverClone.guide = true;

				self.container.appendTop( _hoverClone );
				_hoverItem = hover.item;
			}
		} else _clearHover();
	}

	/* selection of elements (by clicking them) */
	paper.view.onMouseDown = function onCanvasMouseDown(event) {
		if(!(event.event.altKey || event.event.metaKey)) {
			var sceneElement = Danimator.sceneElement(event.target);

			if(sceneElement) {
				sceneElement.data.$layer.trigger($.Event('selected', { item: event.target, handpicked: true }));
			}
			else _resetSelection();
		} else _clearHover();
	};

	// allow moving of objects/canvas when commandKey is held
	paper.view.onMouseDrag = function onCanvasMouseDrag(event) {
		if(event.event.button === 0)
			if(event.event.metaKey) {
				if(selectedElements.size) {
					var selectedItem = selectedElements.single.item;
					selectedItem.position = selectedItem.position.add(event.delta);

					_changesFile('ani.json');

					if(selectedItem.pivot) {
						_changesProp('pivot.x', selectedItem.pivot.x);
						_changesProp('pivot.y', selectedItem.pivot.y);
						_anchorViz.position = selectedItem.pivot;
					} else {
						_anchorViz.position = selectedItem.bounds.center;
					}

					_changesProp('pivot.x', _anchorViz.position.x);
					_changesProp('pivot.y', _anchorViz.position.y);

					_changesProp('position.x', selectedItem.position.x);
					_changesProp('position.y', selectedItem.position.y);
				} else {
					//paper.view.scrollBy(event.delta.multiply(-1));
					self.container.position = self.container.position.add(event.delta);
				}
			}
		event.event.preventDefault();
		event.event.stopImmediatePropagation();			
	};

	/* setup and event handlers for visualization of anchor (pivot) point */
	_anchorViz = new paper.Group([
		new paper.Path.Circle({
			center: 		project.view.center,
			radius: 		2,
			strokeWidth: 	2.5,
			strokeColor: 	'rgba(127,127,127,.4)',
			fillColor: 		'rgba(255,255,255,.4)',
		}),
		new paper.Path.Circle({
			center: 		project.view.center,
			radius: 		2,
			strokeColor: 	'cyan'
		}),
		new paper.Path.Line({
			from: 	project.view.center.subtract(new paper.Point(0, 2)), 
			to: 	project.view.center.subtract(new paper.Point(0, 4)),
			strokeColor: 	'cyan'
		}),
		new paper.Path.Line({
			from: 	project.view.center.add(new paper.Point(0, 2)), 
			to: 	project.view.center.add(new paper.Point(0, 4)),
			strokeColor: 	'cyan'
		}),
		new paper.Path.Line({
			from: 	project.view.center.subtract(new paper.Point(2, 0)), 
			to: 	project.view.center.subtract(new paper.Point(4, 0)),
			strokeColor: 	'cyan'
		}),
		new paper.Path.Line({
			from: 	project.view.center.add(new paper.Point(2, 0)), 
			to: 	project.view.center.add(new paper.Point(4, 0)),
			strokeColor: 	'cyan'
		})
	]);

	_anchorViz.visible = false;

	_anchorViz.onMouseDown = function(event) {
		if(event.event.altKey) {
			this.data.oldPosition = event.point; 
		}
	};

	_anchorViz.onMouseDrag = function(event) {
		/* move anchor point onAltKey */
		if(event.event.altKey) {
			this.position = event.point;
			selectedElements.single.item.pivot = this.position;
			_changesProp('pivot.x', this.position.x);
			_changesProp('pivot.y', this.position.y);
		}
	};

	_anchorViz.onMouseUp = function(event) {
		var item = this;
		var selectedItem = selectedElements.single.item;

		if(event.event.altKey)
			new Undoable(function(){ 
				item.position = event.point;
				selectedItem.pivot = item.position;
			}, function(){ 
				if(item.data.oldPosition) {
					item.position = item.data.oldPosition;
					selectedItem.pivot = item.position;
				}
			}, 'setting pivot of ' + _getAnimationName(selectedItem), true);
	};

	self.container.appendTop(_anchorViz);

	_createLayers(layers, _PANELS.layers.$element.find('ul').empty());

	if(!Danimator.sound) _PANELS.audio.$element.hide();

	$('body').addClass('ready');

	return this;
}