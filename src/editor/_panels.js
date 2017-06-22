/* interactive DOM panels */

var PANEL_TOLERANCE = 10;

/* DOM events */
jQuery(function($){
	$(document)
		/* general panel handling */
		.on('click', '.panel > label .toggle', function(event) {
			var $panel = $(this).closest('.panel');
			$panel.toggleClass('collapsed');
			/* save open state to localStorage */
			localStorage.setItem('editor-panels-' + $panel[0].id + '-collapsed', $panel.is('.collapsed'));
		})
		.on('dblclick', '.panel > label', function(event) {
			$(this).find('.toggle').click();
		})
		.on('click', '.panel li .toggleGroup', function(event) {
			$(this).closest('li').toggleClass('open');

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		})
		.on('change', '.flag_changer', function(event) {
			var $this = $(this);
			_.set(FLAGS, $this.data('flag'), $this.is(':checked'));
		});
});