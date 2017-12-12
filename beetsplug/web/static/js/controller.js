let app = angular
	.module("beets-web", ['dndLists', 'ngMaterial', 'ngMessages', 'angular.filter', 'md.data.table'])
	.config(($interpolateProvider, $mdThemingProvider) => {
		$mdThemingProvider.theme('default')
			.primaryPalette('red', {
				'default': '400'
			})
			.accentPalette('green', {
				'default': '200'
		});

		$interpolateProvider.startSymbol('[[').endSymbol(']]');
	})
	.directive('fallback', function() {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				if (attrs.ngSrc.length == 0) {
					element.attr('src', attrs.fallback);
				}

				element.bind('error', function() {
					element.attr('src', attrs.fallback);
				});
			}
		};
	}
);

app.controller("controller", ($scope, $mdDialog) => {
	$scope.data = {
		albums: [],
		tracks: [],
		artists: []
	};

	$scope.audio = {
		player: new Audio(),
		progress: 0,
		isPlaying: false,
		playingAlbumId: 0,
		playingTrackId: 0,

		// TODO: shuffle & repeat
		shuffle: false,
		repeat: false,
		queue: new LinkedList(),
		current: null
	};

	$scope.query = {
		order: "title",
		selected: []
	};

	// Overwritten by angular filter to include the list of tracks, ordered
	$scope.ordered = [];

	// Show volume controls on hover
	$scope.showVolumeSlider = false;

	let window_handler = () => {
		$scope.$apply(() => {
			$scope.audio.progress = 100 * $scope.audio.player.currentTime / $scope.audio.player.duration;
		});
	};
	$scope.audio.player.ontimeupdate = window_handler;

	// Active window handler
	$(window).on("blur focus", function(e) {
		var prevType = $(this).data("prevType");

		if (prevType != e.type) {   //  reduce double fire issues
			switch (e.type) {
				case "blur": // Inactive
					$scope.audio.player.ontimeupdate = null;
					break;
				case "focus": // Active
					$scope.audio.player.ontimeupdate = window_handler;
					break;
			}
		}

		$(this).data("prevType", e.type);
	})

	// Audio Callbacks
	$scope.audio.player.onended = () => {
		$scope.skip(true);
	}

	// Play audio
	$scope.playAudio = (index) => {
		let list = $scope.ordered.slice(0);
		$scope.audio.queue.clear();
		$scope.audio.current = null;
		
		if ($scope.audio.shuffle) {
			let first = list.splice(index, 1)[0];
			$scope.audio.queue = shuffle(list);
			$scope.audio.queue.prepend(first);
			$scope.audio.current = $scope.audio.queue.head; // Shuffle assumes first play is the first element in the queue
		} else {
			for (let item of list) {
				$scope.audio.queue.append(item);
			}

			$scope.audio.current = $scope.audio.queue.get(index);
		}

		play_file($scope.audio.current);
	};

	$scope.playQueueItem = (qIndex) => {
		if (qIndex < 0 || qIndex > $scope.audio.queue._length - 1)
			return;
		
		let item = $scope.audio.queue.get(qIndex);
		play_file(item);
	}

	let play_file = (track_container) => {
		if ($scope.audio.current) $scope.audio.current.data._isCurrent = false;

		$scope.audio.current = track_container;
		track_container.data._isCurrent = true;

		let track = track_container.data;
		$scope.audio.player.pause();
		$scope.audio.player.setAttribute('src', "/item/" + track.id + "/file");

		// TODO
		// if (!$scope.audio.player.canPlayType()) {
		//  alert("Unsupported file type :(");
		//  return;
		// }

		$scope.audio.player.load();
		$scope.audio.player.play();

		$scope.audio.isPlaying = true;
	};

	$scope.removeItem = (index) => {
		$scope.audio.queue.remove(index);
	}

	$scope.moveItem = (index, item) => {
		let ins = $scope.audio.queue.insert(index, item);

		if (ins.data._isCurrent) $scope.audio.current = ins;
	}

	// Media Controls
	// FIXME: Gets weird when rewinding
	$scope.scroll = (e) => {
		let percent = e.offsetX / e.currentTarget.offsetWidth;
		$scope.audio.player.currentTime = percent * $scope.audio.player.duration;
	};

	$scope.playPause = () => {
		if ($scope.audio.isPlaying) {
			$scope.audio.player.pause();
		} else {
			$scope.audio.player.play();
		}

		$scope.audio.isPlaying = !$scope.audio.isPlaying;
	};

	$scope.skip = (forward) => {
		let node = $scope.audio.current;

		// Rewind to beginning of track if past first 2% of the song
		if (!forward) {
			if ($scope.audio.progress > 2) 
				node = node;
			else
				node = node.prev;
		} else {
			node = node.next;
		}

		// Wrap queue around if repeat is true
		if (node === null && $scope.audio.repeat)
			node = $scope.audio.queue.head;

		play_file(node);
	}

	// Helper methods
	$scope.openMenu = ($mdOpenMenu, event) => {
		$mdOpenMenu(event);
		event.stopPropagation();
	}

	$scope.formatTime = (long_time) => {
		let hor = Math.floor(long_time / 60 / 60);
		let min = Math.floor(long_time / 60);
		let sec = Math.floor(long_time - min);

		let res = [];
		if (hor > 0) {
			res.push("" + hor);
			res.push(("0" + min).slice(-2));
		} else {
			res.push(min);
		}

		res.push(("0" + sec).slice(-2));

		return res.join(":");
	}

	$scope.showLyrics = (e) => {
		$mdDialog.show({
			contentElement: '#lyrics',
			parent: angular.element(document.body),
			targetEvent: e,
			clickOutsideToClose: true
		});
	};

	$scope.showVolume = (show) => {
		$scope.showVolumeSlider = show;
	};

	// Get the data
	fetchAlbums().then((data) => {
		$scope.data.albums = data.albums;
		$scope.$apply();
	});

	fetchMedia().then((data) => {
		$scope.data.tracks = data.items;
		$scope.$apply();
	});

	fetchArtists().then((data) => {
		$scope.data.artists = data.artist_names;
		$scope.$apply();
	});

	// Helper methods
	function attemptLowerCase (obj) {
		try {
			return obj.toLowerCase();
		} catch (e) {
			return obj;
		}
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	function shuffle(array) {
		let result = new LinkedList();
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			result.prepend(array.splice(j, 1)[0]);
		}

		return result;
	}
});
