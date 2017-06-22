/* init values for Danimator props */
Danimator.sounds = {};

/* sound factory */
Danimator.sound = function danimatorSound(name, options) {
	var config 	= _.extend({ 
		name: 	name, 
		src: 	['audio/' + name] 
	}, options);
	var sound  	= _.get(Danimator.sounds, name);
	var fadeIn 	= 0;
	var fadeOut = 0;

	/* add default path (audio/) + file extension (m4a) if not supplied */
	config.src = _.map(config.src, function(src) {
		if(!src.match(/^\/?audio\/.+$/g)) {
			src = 'audio/' + src;
		}
		if(!src.match(/.*\.[^\.]+$/g)) {
			name += '.m4a';
			return src + '.m4a';
		}
		return src;
	});

	if(config.fadeIn) {
		fadeIn = config.fadeIn;
		delete config.fadeIn;
	}
	if(config.fadeOut) {
		fadeOut = config.fadeOut;
		delete config.fadeOut;
	}

	if(!sound) {
		/* generate new sound handler */
		sound = Danimator.sounds[name] = {
			source: new Howl(config),
			get: function(param) {
				return this.source['_' + param];
			},
			set: function(param, value) {
				this.source[param](value, this.instance);
			},
			play: function() {
				this.stopped = false;
				Danimator._activeSound = this;
				return this.instance = this.source.play();
			},
			stop: function() {
				this.source.stop(this.instance);
				this.stopped = true;
				/* global hook for stopping of sound */
				if(Danimator.onSoundStop) Danimator.onSoundStop(this);
			},
			fadeIn: function(duration) {
				var volume = this.source.volume(null, this.instance);
				this.source.fade(0, volume, duration, this.instance);
				return volume;
			},
			fadeOut: function(duration) {
				var volume = this.source.volume(null, this.instance);
				this.source.fade(volume, 0, duration, this.instance);
				return volume;
			}
		};
	}
	
	sound.options = options;
	// save who called this method
	sound.caller = danimatorSound.caller.name;

	/* account for delay param */
	setTimeout(function danimatorSound() {
		if(!Danimator.interactive) {
			sound.play();
			
			if(fadeIn) {
				sound.fadeIn(fadeIn);
			}
			if(fadeOut) {
				sound.fadeOut(fadeOut);
			}
		} else {
			Danimator._activeSound = sound;
		}

		if(Danimator.onSound) {
			/* global hook for starting of sound */
			Danimator.onSound(name, sound);
		}
	}, _.get(options, 'delay', 0));

	return sound;
};