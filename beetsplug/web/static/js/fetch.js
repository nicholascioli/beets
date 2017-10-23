const MEDIA_TRACK_ENDPOINT = "item";
const MEDIA_ALBUM_ENDPOINT = "album";
const MEDIA_ARTIST_ENDPOINT = "artist";

var fetch = async (endpoint) => {
    return $.getJSON(endpoint, (data) => {
        return data;
    });
}

var fetchMedia = async () => {
    return await fetch(MEDIA_TRACK_ENDPOINT);
};

var fetchAlbums = async () => {
    return await fetch(MEDIA_ALBUM_ENDPOINT);
};

var fetchArtists = async () => {
    return await fetch(MEDIA_ARTIST_ENDPOINT);
};
