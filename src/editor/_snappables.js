/** 
 * Class for easier handling of snapping to numeric values
 */

/* class to handle snapping points */
function Snappables(tolerance) {
	var self = this;
	
	self.list 		= [];
	self.tolerance 	= tolerance;
	
	return self;
}

Snappables.prototype.add = function(snap) {
	if(!_.isArray(snap)) snap = [snap];
	this.list = _.union(this.list, snap);
	return this;
};
Snappables.prototype.remove = function(snap) {
	this.list = _.pull(this.list, snap);
	return this;
};
Snappables.prototype.snap = function(value) {
	var self = this;
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