## Create a map container element

Now that you have a React app scaffolded, let's update `App.js` to prepare for a map. Mapbox GL JS works by adding a map to an existing element, usually a div. This is referred to as the **map container** , and should be styled with CSS to position and size the map within the app.

In your code editor, replace the existing code in `src/App.jsx` with the snippet below. This adds an empty `div` with an `id` of `map-container`.

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
import './App.css'

function App() {
  return (
    <>
      <div id='map-container' />
    </>
  )
}

export default App
```

Next, add CSS to make the `root` div full screen, and the `map-container` full height and width. (Some additional CSS rules are included to style elements that are added in later steps.) Since the map container div has no content, it will be invisible on the page. You can temporarily add a `background-color` rule to help see where it is positioned.

Replace the contents of `src/App.css` with the following snippet:

Warning

A common pitfall when working with Mapbox GL JS is adding a map to a container that has no height. Make sure your map container is styled properly before creating a new map.

src/App.css

```css round-bold thin-scrollbar my0 px0 py0
#root {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

#map-container {
  height: 100%;
  width: 100%;
  /* temporarily set the background color so we can tell where the map container is positioned */
  background-color: lightgrey;
}

.sidebar {
  background-color: rgb(35 55 75 / 90%);
  color: #fff;
  padding: 6px 12px;
  font-family: monospace;
  z-index: 1;
  position: absolute;
  top: 0;
  left: 0;
  margin: 12px;
  border-radius: 4px;
}

.reset-button {
  position: absolute;
  top: 50px;
  z-index: 1;
  left: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  cursor: pointer;
}
```

Finally, delete the contents of `src/index.css` so it's styles do not interfere with the map container's positioning.

src/index.css

```css round-bold thin-scrollbar my0 px0 py0
/* index.css should be empty */
```

Save your changes across all files. The development server will hot reload with each saved change. If you see a light gray div filling the viewport, you have successfully positioned your map container for a full screen map.

circlecirclecircle

arrow-leftarrow-rightrotate

heartmapboxmenu

![Run the vite react app dev server](https://docs.mapbox.com/help/assets/ideal-img/tutorials--use-mapbox-gl-js-with-react--map-container.d6cc6ca.960.png)

With your map container created and rendering in the app, you are ready to instantiate a Mapbox GL JS map.

## Add a Mapbox GL JS Map

First, install the `mapbox-gl` package using `npm`. See the [installation guide](https://docs.mapbox.com/mapbox-gl-js/guides/install/) for more information about installation options.

```bash round-bold thin-scrollbar my0 px0 py0
npm install mapbox-gl
```

At the top of `App.jsx`, import `useRef` and `useEffect`, from `react`, we will need these when setting up the map. You must also import `mapbox-gl` along with its associated CSS.

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'
...
```

Next, add two refs using the `useRef` hook. The first ref will persist the map instance so you can control the map throughout the lifecycle of this component. The second ref exposes the map container's HTML element, and is used to tell Mapbox GL JS where to create the map.

Be sure to add the `ref` prop to your map container `div`.

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()

...

  return (
    <>
      <div id='map-container' ref={mapContainerRef}/>
    </>
  )
}
```

With the refs created, you are ready to instantiate the map. Follow these steps:

1. Copy the code below and paste it between the refs, but above the return of the div.

* This code adds a `useEffect` hook to `App.jsx` with an empty dependency array. This will run once when the component is first mounted and then calls `new mapboxgl.Map()` to add the map.

2. Make sure to assign `mapboxgl.accessToken` to an access token from the [Access Tokens page](https://console.mapbox.com/account/access-tokens/) of your Developer Console. The access token is used for billing, and associates this map with your Mapbox account.
3. Pass an [options](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) object into `new mapboxgl.Map()` to control the map. In this example, only the `container` option is specified as `mapContainerRef.current`. Mapbox GL JS will create the new map in your map container `div`.

`new mapboxgl.Map()` returns new instance of the [`Map`](https://docs.mapbox.com/mapbox-gl-js/api/map/) class, and is assigned to `mapRef.current` so we can use it later.

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
function App() {
...
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHVyb2RwIiwiYSI6ImNtaHplcW53cDA4dHQycnB6dnhqeGtveXgifQ.6GR-s3V7vfGRsoVlhSTFhg'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
    });

    return () => {
      mapRef.current.remove()
    }
  }, [])
...
}
```

Warning

Mapbox GL JS usage is billed by [map loads](https://docs.mapbox.com/help/glossary/map-loads/). A map load is incurred each time this component mounts and the Map's [`load`](https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:load) event fires. Depending on your app architecture and UX, you may want to persist the map component to avoid multiple map loads for a single user.

After these steps, your `App.jsx` should look like this:

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';

import './App.css'

function App() {

  const mapRef = useRef()
  const mapContainerRef = useRef()

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHVyb2RwIiwiYSI6ImNtaHplcW53cDA4dHQycnB6dnhqeGtveXgifQ.6GR-s3V7vfGRsoVlhSTFhg'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
    });

    return () => {
      mapRef.current.remove()
    }
  }, [])

  return (
    <>
      <div id='map-container' ref={mapContainerRef}/>
    </>
  )
}

export default App
```

Save your changes, make sure your development server is running and check the browser.

You will see a globe on a background of space and stars, the Mapbox logo, and an attribution notice. **Hello, World!**

You can use your scroll wheel to zoom in and out, and drag the globe to rotate it.

circlecirclecircle

arrow-leftarrow-rightrotate

heartmapboxmenu

[© Mapbox](https://www.mapbox.com/about/maps "Mapbox") [© OpenStreetMap](https://www.openstreetmap.org/copyright/ "OpenStreetMap") [Improve this map](https://apps.mapbox.com/feedback/?access_token=pk.eyJ1IjoiZXhhbXBsZXMiLCJhIjoiY203eXd1a3ZzMGV1ejJrcHRvdnVoYng0NCJ9.NzlqpAcLHejzezQqazzI-w#/-171.5/-56.9/0 "Improve this map")

[](https://www.mapbox.com/)

You probably don't want to start your map zoomed all the way out like this, so you can add `center` and `zoom` options when calling `new mapboxgl.Map()`.

Specify `center` as longitude and latitude coordinates in an array (`[longitude, latitude]`). `zoom` ranges from `0`, zoomed all the way out to see the whole globe, to `22`, zoomed in to street level.

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
...
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [-74.0242, 40.6941],
      zoom: 10.12
    });
...
```

Here's what the map will look like zoomed into New York City:

circlecirclecircle

arrow-leftarrow-rightrotate

heartmapboxmenu

[© Mapbox](https://www.mapbox.com/about/maps "Mapbox") [© OpenStreetMap](https://www.openstreetmap.org/copyright/ "OpenStreetMap") [Improve this map](https://apps.mapbox.com/feedback/?access_token=pk.eyJ1IjoiZXhhbXBsZXMiLCJhIjoiY203eXd1a3ZzMGV1ejJrcHRvdnVoYng0NCJ9.NzlqpAcLHejzezQqazzI-w#/-74.0626/40.679/10.12 "Improve this map")

[](https://www.mapbox.com/)

[PLAYGROUND

Location Helper

For help finding coordinates for locations and appropriate zoom levels for the view you want, use our handy Location Helper tool.

](https://labs.mapbox.com/location-helper/#3/40.78/-73.97)With your new Mapbox GL JS map added, you are ready add code to integrate it into the rest of your app. We will cover integrations in both directions, updating app state in response to map events, and updating the map in response to events happening in the app.

## Respond to map events

There are several [events](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-events) generated by a Mapbox GL JS map which you can listen for to trigger functionality in your React app. In this step, we will listen for the events that occur when a user pans and zooms the map, and use them to update state in our React component.

For this example we will listen for the [`move`](https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:move) event, which fires continuously with each change to the map's view, such as when the user drags or zooms the map. We can then query the map for its current center point coordinates and zoom level, and display these values in the app's UI.

Update `App.jsx` with the code highlighted below.

First, move the starting center point coordinates and zoom level to constants so they can be used for both initializing the map and as the initial state values.

Add two `useState()` hooks to store `center`, and `zoom`, using the constants defined above as their default values.

Update `mapbox.Map()` to use the `center`, and `zoom` state variables.

Next, add an event listener for the map's `move` event in the `useEffect()` hook. When `move` is fired, the callback for this listener queries the map using [`getCenter()`](https://docs.mapbox.com/mapbox-gl-js/api/map/#map#getcenter) and [`getZoom()`](https://docs.mapbox.com/mapbox-gl-js/api/map/#map#getzoom) and updates both state variables.

Finally, add a display div before the map container, adding placeholders `lng`, `lat`, and `zoom`. (This div is already styled using the CSS added in step 2). Use `toFixed()` to limit the number of decimal places for a cleaner display.

src/App.jsx

```jsx round-bold thin-scrollbar my0 px0 py0
import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const INITIAL_CENTER = [
  -74.0242,
  40.6941
]
const INITIAL_ZOOM = 10.12

function App() {
  const mapRef = useRef()
  const mapContainerRef = useRef()

  const [center, setCenter] = useState(INITIAL_CENTER)
  const [zoom, setZoom] = useState(INITIAL_ZOOM)

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHVyb2RwIiwiYSI6ImNtaHplcW53cDA4dHQycnB6dnhqeGtveXgifQ.6GR-s3V7vfGRsoVlhSTFhg'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: center,
      zoom: zoom
    });

    mapRef.current.on('move', () => {
      // get the current center coordinates and zoom level from the map
      const mapCenter = mapRef.current.getCenter()
      const mapZoom = mapRef.current.getZoom()

      // update state
      setCenter([ mapCenter.lng, mapCenter.lat ])
      setZoom(mapZoom)
    })

    return () => {
      mapRef.current.remove()
    }
  }, [])

  return (
    <>
      <div className="sidebar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      <div id='map-container' ref={mapContainerRef} />
    </>
  )
}

export default App
```

As you drag and zoom the map, your new event listener fires, updating the state and triggering a component render. Try it out here:

circlecirclecircle

arrow-leftarrow-rightrotate

heartmapboxmenu

Longitude: -74.02429 | Latitude: 40.69413 | Zoom: 10.12

[© Mapbox](https://www.mapbox.com/about/maps "Mapbox") [© OpenStreetMap](https://www.openstreetmap.org/copyright/ "OpenStreetMap") [Improve this map](https://apps.mapbox.com/feedback/?access_token=pk.eyJ1IjoiZXhhbXBsZXMiLCJhIjoiY203eXd1a3ZzMGV1ejJrcHRvdnVoYng0NCJ9.NzlqpAcLHejzezQqazzI-w#/-74.0243/40.6941/10.12 "Improve this map")

[](https://www.mapbox.com/)

Now that you know how to respond to map events, you can move on to controlling the map using external events.



## Control the Map from external events

In this step, you'll add a button to your app's UI and trigger a response from the map when it is clicked. More specifically, you'll add a Reset button which will restore the map's view to its original location after the user moves and pans the map.

Add a `<button>` before the map container div and set its `onClick` prop to `handleButtonClick`. (This button is already styled using the CSS added in step 2)

Next, create a new function `handleButtonClick` and call the map's [`flyTo()`](https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto) method, specifying the `center` and `zoom` to animate the map's camera to using the constants defined in step 4.

Save your work and check your browser. Move the map by dragging and zooming, then click the Reset button. The map will smoothly transition back to the original center point and zoom.

Notice that the `move` event is fired continuously as `flyTo()` animates the map, so there is no need for additional code to update the `center`, and `zoom` UI after calling `flyTo()`

You can expand the hidden sections in this code snippet to see the final code for `App.jsx`.

src/App.jsx

```
const handleButtonClick = () => {
  mapRef.current.flyTo({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM
  })
}


return (
  <>
    <div className="sidebar">
      Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
    </div>
    <button className='reset-button' onClick={handleButtonClick}>
      Reset
    </button>
    <div id='map-container' ref={mapContainerRef} />
  </>
)
```

Move the map and click the Reset button. `handleButtonClick` fires and restores the original camera position.

circlecirclecircle

arrow-leftarrow-rightrotate

heartmapboxmenu

Longitude: -74.02429 | Latitude: 40.69413 | Zoom: 10.12

[© Mapbox](https://www.mapbox.com/about/maps "Mapbox") [© OpenStreetMap](https://www.openstreetmap.org/copyright/ "OpenStreetMap") [Improve this map](https://apps.mapbox.com/feedback/?access_token=pk.eyJ1IjoiZXhhbXBsZXMiLCJhIjoiY203eXd1a3ZzMGV1ejJrcHRvdnVoYng0NCJ9.NzlqpAcLHejzezQqazzI-w#/-74.0243/40.6941/10.12 "Improve this map")

[](https://www.mapbox.com/)

Congratulations on completing this Mapbox tutorial. You've learned the basics of setting up a Mapbox GL JS map in a React app:

* Instantiating a Mapbox GL JS Map in a `useEffect` hook
* Listening for map events and updating app state
* Listening for events in the app and controlling the map
