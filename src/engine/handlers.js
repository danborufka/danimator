/** 
 * Prebuilt handlers for event-driven effects 
 * (like slight scaling on hovering over items)
 */

var _cursor;
var $body = $('body');

Danimator.handlers = {
	attach: function(item, type, config) {
		if(!item.data._handlerConfigs) 
			item.data._handlerConfigs = {};

		item.data._applyMatrix = item.applyMatrix;
		item.data._handlerConfigs[type] = _.extend({}, this[type].config, config);

		item.applyMatrix = false;
		item.scaling = 1;
		item.on(this[type].events);
	},
	detach: function(item, type) {
		item.scaling = 1;
		item.applyMatrix = item.data._applyMatrix;
		item.off(this[type].events);
	},

	hover: {
		config: {
			cursor: 	'pointer',
			scaleBy:	.5,
			duration: 	.3
		},
		events: {
			mouseenter: function(event) { 
				if(!event.event.buttons) {
					_cursor = $body.css('cursor');
					$body.css('cursor', this.data._handlerConfigs.hover.cursor);
					this.scaling = 1 + this.data._handlerConfigs.hover.scaleBy;
				}
			},
			mouseleave: function(event) { 
				if(!event.event.buttons) {
					$body.css('cursor', 'auto');
					this.scaling = 1;
				}
			},
			mousedown: 	function(event) {
				this.scaling = 1/this.data._handlerConfigs.hover.scaleBy;
			},
			mouseup: 	function(event) {
				this.scaling = 1;
			},
		}
	}
};