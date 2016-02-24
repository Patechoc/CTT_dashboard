var map = L.map('map').setView([63.430515, 10.395053], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.emerald',
    accessToken: 'pk.eyJ1IjoiZnJlZHJpa2FudGhvbmlzZW4iLCJhIjoiY2lrcXk1cTJzMDAxM3dsa3FmOWRiejJtNyJ9.HMZmGTfUijbKOxKt7P78rQ'
}).addTo(map);

L.control.fullscreen().addTo(map);

// var circle = L.circle([63.430656, 10.392196], 100, {
//     color: 'red',
//     fillColor: '#ec5840',
//     fillOpacity: 0.5
//     }).addTo(map);

// var circle = L.circle([63.428062, 10.388362], 100, {
//     color: 'green',
//     fillColor: '#3adb76',
//     fillOpacity: 0.5
//     }).addTo(map);
