/* interactive DOM panels */
jQuery(document)
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

/* initialize panels! */
jQuery('.panel').each(function() {
	var $panel = $(this);
	var collapsed = localStorage.getItem('editor-panels-' + this.id + '-collapsed');

	$panel
		.draggable({ 
			handle: 		'>label', 
			stack: 			'.panel',
			containment: 	[0, 0, $(window).width() - $panel.width(), $(window).height() - $panel.height()],
			stop: 			function() {
				localStorage.setItem('editor-panels-' + $panel[0].id + '-pos', JSON.stringify($panel.offset()));
			}
		})
		.toggleClass('collapsed', collapsed == 'true');

	var pos = localStorage.getItem('editor-panels-' + $panel[0].id + '-pos');
	if(pos = pos && JSON.parse(pos)) {
		$panel.css(pos);
	}
});