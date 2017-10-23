let app = angular
    .module("beets-web", ['ngMaterial', 'ngMessages', 'angular.filter', 'md.data.table'])
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
		queue: [],
		qIndex: 0
	};

	$scope.query = {
		order: "title",
		selected: []
	};

	// Overwritten by angular filter to include the list of tracks, ordered
	$scope.ordered = [];

	// Active window handler
	$(window).on("blur focus", function(e) {
		var prevType = $(this).data("prevType");
	
		if (prevType != e.type) {   //  reduce double fire issues
			switch (e.type) {
				case "blur": // Inactive
					$scope.audio.player.ontimeupdate = null;
					break;
				case "focus": // Active
					$scope.audio.player.ontimeupdate = () => {
						$scope.$apply(() => {
							$scope.audio.progress = 100 * $scope.audio.player.currentTime / $scope.audio.player.duration;
						});
					};
					break;
			}
		}
	
		$(this).data("prevType", e.type);
	})

	// Audio Callbacks
	$scope.audio.player.onended = () => {
		$scope.skip(1);
	}

	// Play audio
	$scope.playAudio = (track_id, index) => {
		$scope.audio.queue = $scope.ordered;
		
		if ($scope.audio.shuffle) {
			$scope.audio.queue = shuffle($scope.audio.queue);
			$scope.audio.qIndex = 0; // Shuffle assumes first play is the first element in the queue
		} else {
			$scope.audio.qIndex = index;
		}

		play_file(index);
	};

	let play_file = (qIndex) => {
		let track_id = $scope.audio.queue[qIndex].id;
		let album_id = $scope.audio.queue[qIndex].album_id;

		$scope.audio.player.pause();
		$scope.audio.player.setAttribute('src', "/item/" + track_id + "/file");

		// TODO
		// if (!$scope.audio.player.canPlayType()) {
		// 	alert("Unsupported file type :(");
		// 	return;
		// }

		$scope.audio.player.load();
		$scope.audio.player.play();
		$scope.audio.playingTrackId = track_id;
		$scope.audio.playingAlbumId = album_id;

		$scope.audio.isPlaying = true;
	};

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

	$scope.skip = (delta) => {
		// Rewind to beginning of track if past first 2% of the song
		if (delta == -1 && $scope.audio.progress > 2) {
			// nothing
		} else {
			$scope.audio.qIndex += delta;
		}

		// Wrap queue around if repeat is true
		if ($scope.audio.qIndex >= $scope.audio.queue.length && $scope.audio.repeat)
			$scope.audio.qIndex %= $scope.audio.queue.length;

		play_file($scope.audio.qIndex);
	}

	// Helper methods
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

		res.push(("0" + min).slice(-2));

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
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}

		return array;
	}
});
