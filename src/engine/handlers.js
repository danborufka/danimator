/** 
 * Prebuilt handlers for event-driven effects 
 * (like slight scaling on hovering over items)
 */

var _cursor;

Danimator.handlers = {
	attach: function(item, type, config) {
		if(!item.data._handlerConfigs) 
			item.data._handlerConfigs = {};

		item.data._applyMatrix = item.applyMatrix;
		item.data._handlerConfigs[type] = _.extend({}, this[type].config, config);
		item.data._handlerType = type;

		_cursor = $(paper.project.view.element).css('cursor');

		item.applyMatrix = false;
		item.scaling = 1;
		item.on(this[type].events);
	},
	detach: function(item, type) {
		item.scaling = 1;
		item.applyMatrix = item.data._applyMatrix;
		item.off(this[type].events);
	},

	setCursor: function(cursor) {
		$(paper.project.view.element).css('cursor', cursor);
		_cursor = cursor;
	},

	clickable: {
		config: {
			cursor: 	'pointer',
			scaleTo:	.9,
			duration: 	.3,
			opacity: 	.8
		},
		events: {
			mouseenter: function hoverIn(event) { 
				if(!event.event.buttons) {
					var config = this.data._handlerConfigs[this.data._handlerType];
					Danimator.handlers.setCursor(config.cursor);
					this.opacity = config.opacity;
				}
			},
			mouseleave: function hoverOut(event) { 
				if(!event.event.buttons) {
					Danimator.handlers.setCursor('default');
					this.opacity = 1;
				}
			},
			mousedown: 	function press(event) {
				var config = this.data._handlerConfigs[this.data._handlerType];
				this.scaling = config.scaleTo;
			},
			mouseup: 	function release(event) {
				this.scaling = 1;
				this.emit('mousedrag', event);
			},
		}
	}
};

Danimator.handlers.draggable = _.merge({ 
	events: { 
		mousedrag: function(event) { 
			var pos = event.point;
			if(this.data.snappingGrid) {
				pos = pos.divide(this.data.snappingGrid).round().multiply(this.data.snappingGrid).add(this.bounds.size.multiply(.5));
			}
			this.position = pos;
		}
	}
}, Danimator.handlers.clickable);