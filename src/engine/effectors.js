/** 
 * UI helper for local effectors (similar to the ones in Cinema4D)
 */

Danimator.Effector = function danimatorEffector(config) {
	var self = this;

	self.name 		= 'core';
	self.magnitude 	= 0;
	self.settings 	= {};
	self.active 	= false;
	self.visualizer;

	self.update = function() {
		project.currentStyle = {
		    fillColor: 		null,
		    strokeColor: 	'orange',
		    strokeWidth: 	8 / project.view.zoom
		}
		return self.visualize && self.visualize();
	};

	self.apply = function() { /* … */ };
	self.remove = function() {
		self.visualizer && self.visualizer.remove();
	};
	self.bake  = function() { /* … */ 
		self.remove();
	};
}