/** 
 * Class for easier handling of snapping to numeric values
 */

/* class to handle snapping points */
function Snappables(tolerance) {
	var self = this;
	
	self.list 		= [];
	self.tolerance 	= tolerance;

	self.add = function(snap) {
		if(!_.isArray(snap)) snap = [snap];
		self.list = _.union(self.list, snap);
		return self;
	};
	self.remove = function(snap) {
		self.list = _.pull(self.list, snap);
		return self;
	};
	self.snap = function(value) {
		var result = value;
		self.list = self.list.sort();
		_.each(self.list, function(item) {
			if(Math.abs(item - value) < self.tolerance) {
				result = item;
				return false;
			}
		});
		return result;
	};
	return self;
}