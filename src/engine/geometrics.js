// geometric helpers for paperJS items

paper.Path.inject({
	/* 	add growth property to paths so you can animate the "evolution" of a path 
		example: scene.getItem({ name:'spline' }).growth = 0.5;
	*/
	getGrowth: function() {
		var growth = this.data._growth;
		if(growth === undefined) {
			growth = 1;
			if(this.dashArray)
				if(this.dashArray.length == 2) 
					if(this.dashArray[1] == this.length)
						growth = this.dashArray[0] / this.length;
			this.data._growth = growth;
		}
		return growth;
	},
	setGrowth: function(growth) {
		this.data._growth = growth;
		var grownLength = growth * this.length;

		if(!_.has(this.data, '_oldVisible')) {
			this.data._oldVisible = !!this.visible;
		}

		if(growth <= 0) {
			this.visible = false;
		} else if(this.visible != this.data._oldVisible) {
			this.visible = _.get(this.data, '_oldVisible', 1);
		};
		this.dashArray = [grownLength, this.length];
	}
});

paper.Item.inject({
	/* 	normalizing rotation property of items
		so you can set an absolute rotation instead of just rotating incrementally
		e.g.: item.rotation = 180 && item.rotation = 180 // will only rotate it once
	*/
	getRotation: function() {
		return _.get(this.data, '_rotation', 0);
	},
	setRotation: function(angle, center) {
		this.rotate(angle-_.get(this.data, '_rotation', 0), center);
		this.data._rotation = angle;
	},

	/* 	attach element to motion path and move it along it by changing item.offsetOnPath (0…1)
	*/
	attachToPath: function(stroke, offset) {
		this.detachFromPath(stroke);

		this.data._master = stroke;
		if(!stroke.data._slaves) {
			stroke.data._slaves = [];
		}
		stroke.data._slaves.push(this);

		this.offsetOnPath = offset || 0;
	},
	detachFromPath: function(stroke) {
		if(this.data._master) {
			// remove from old master
			this.data._master.data._slaves = _.without(this.data._master.data._slaves, this);
		}
	},

	/* property to get/set an item's offset on its motion path */
	getOffsetOnPath: function() {
		return (this.data._offsetOnPath || 0);
	},
	setOffsetOnPath: function(offset) {
		if(!offset) offset = 0;

		var path = this.data._master;
		var len  = offset * path.length;

		this.position = path.getPointAt(len);
		this.rotation = path.getNormalAt(len).angle-90;
		this.data._offsetOnPath = offset;
	},

	/* mirror element horizontally */
	flip: function(pivot) {
		this.scale(-1, 1, pivot);
	},
	/* mirror element vertically */
	flop: function(pivot) {
		this.scale(1, -1, pivot);
	}
});