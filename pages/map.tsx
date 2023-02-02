import { useRef, useEffect, useState } from 'react'
import Head from 'next/head'
import styles from '../styles/Map.module.css'
import type { NextPage } from 'next';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { 
  boundingBox, 
  randomIntFromInterval, 
  generateRandomSessionToken, 
  jsonToGeoJson,
  geoJsonToPoints } from '../utils/utils.js'
import MapboxGeocoder from 'mapbox-gl-geocoder'
import * as turf from '@turf/turf';
import MarketData from '../utils/geoJSON_market_data.json'

const Map : NextPage = () => {
  const mapContainer = useRef<any>(null);
  const map = useRef<mapboxgl.Map | any>(null);
  let sessionToken = generateRandomSessionToken();
  const geoJsonStructure = {
    'type': 'FeatureCollection',
    "features": []
  }
  const [zoomed, setZoomed] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [businesses, setBusinesses] = useState(geoJsonStructure);
  const [businesses2, setBusinesses2] = useState(geoJsonStructure);
  const [businesses3, setBusinesses3] = useState(geoJsonStructure);
  const [businesses4, setBusinesses4] = useState(geoJsonStructure);
  const [center, setCenter] = useState([ -104.991531, 39.742043]);
  
  const getData = async() => {
    try {
      console.log(`%c Fetching data for center: ${center}... `, 'background: #111; color: #bada55')
      var searchParams = new URLSearchParams({
        query: 'query=',
        ll: center[1]+','+center[0],
        radius: 10000,
        min_price:1,
        max_price:1,
        session_token: sessionToken,
        limit: 50
      })
      var searchParams2 = {...searchParams, min_price:2, max_price:2}
      var searchParams3 = {...searchParams, min_price:3, max_price:3}
      var searchParams4 = {...searchParams, min_price:4, max_price:4}
      // Formatting
      searchParams = new URLSearchParams(searchParams).toString();
      searchParams2 = new URLSearchParams(searchParams2).toString();
      searchParams3 = new URLSearchParams(searchParams3).toString();
      searchParams4 = new URLSearchParams(searchParams4).toString();

      const headers = new Headers({
        Accept: 'application/json',
        Authorization: process.env.NEXT_PUBLIC_FOURSQUARE_API_KEY,
      })

      var tmpRes1, tmpRes2, tmpRes3, tmpRes4 = geoJsonStructure

      await Promise.all([
        fetch(`https://api.foursquare.com/v3/places/search?${searchParams}`, {
          method: 'get',
          headers
        }).then(async (response) => {
          const data = await response.json();
          const geoRes = jsonToGeoJson(data.results, 1);
          tmpRes1 = geoRes
          // setBusinesses(geoRes);
          
        }),
        fetch(`https://api.foursquare.com/v3/places/search?${searchParams2}`, {
          method: 'get',
          headers
        }).then(async (response) => {
          const data = await response.json();
          const geoRes = jsonToGeoJson(data.results, 2);
          tmpRes2 = geoRes
        }),
        fetch(`https://api.foursquare.com/v3/places/search?${searchParams3}`, {
          method: 'get',
          headers
        }).then(async (response) => {
          const data = await response.json();
          const geoRes = jsonToGeoJson(data.results, 3);
          tmpRes3 = geoRes
        }),
        fetch(`https://api.foursquare.com/v3/places/search?${searchParams4}`, {
          method: 'get',
          headers
        }).then(async (response) => {
          const data = await response.json();
          const geoRes = jsonToGeoJson(data.results, 4);
          tmpRes4 = geoRes
        })
      ])

      console.log('%c Finished fetching data! ', 'background: #111; color: #bada55')
      setBusinesses(tmpRes1)
      setBusinesses2(tmpRes2)
      setBusinesses3(tmpRes3)
      setBusinesses4(tmpRes4)
      return;
    } catch (error) {
      throw error;
    }
  }

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_TOKEN;

    getData();

    // Initialize Map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: center,
      zoom: 12,
      pitch: 45,
      bearing: 20,
      attributionControl: false
    })

    // Add zoom buttons & compass
    const nav = new mapboxgl.NavigationControl();
    map.current.addControl(nav, 'top-right');

    // Construct new geocoder
    var geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: "Search new city"
    });
    // Add the geocodder control to the map.
    map.current.addControl(
      geocoder,
      'top-left'
    );

    // Initialize hexGrid
    var bbox = boundingBox(center[0], center[1], 10);
    const cellSide = 0.33;
    const options = {};
    const hexGrid = turf.hexGrid(bbox, cellSide, options);
    console.log(hexGrid);

    // Keep track of max pointsWithinPolygon for density
    const turfPoints1 = geoJsonToPoints(businesses)
    const turfPoints2 = geoJsonToPoints(businesses2)
    const turfPoints3 = geoJsonToPoints(businesses3)
    const turfPoints4 = geoJsonToPoints(businesses4)
    const turfPoints = {
      "type": "FeatureCollection",
      "features": [
        ...turfPoints1.features,
        ...turfPoints2.features,
        ...turfPoints3.features,
        ...turfPoints4.features,
      ]
    }

    // console.log(turfPoints)
    var max_pts = 0;
    hexGrid.features.forEach((f, idx) => {

      var pointsWithin = turf.pointsWithinPolygon(turfPoints, f)
      var pointsWithin1 = turf.pointsWithinPolygon(turfPoints1, f)
      var pointsWithin2 = turf.pointsWithinPolygon(turfPoints2, f)
      var pointsWithin3 = turf.pointsWithinPolygon(turfPoints3, f)
      var pointsWithin4 = turf.pointsWithinPolygon(turfPoints4, f)

      const nPointsWithin = pointsWithin.features.length;
      const nPointsWithin1 = pointsWithin1.features.length;
      const nPointsWithin2 = pointsWithin2.features.length;
      const nPointsWithin3 = pointsWithin3.features.length;
      const nPointsWithin4 = pointsWithin4.features.length;

      // console.log('Point Counts: ', nPointsWithin, nPointsWithin1, nPointsWithin2, nPointsWithin3, nPointsWithin4)
      
      if(nPointsWithin > 0 && nPointsWithin > max_pts)
        max_pts = nPointsWithin;

      if(nPointsWithin){
        // console.log('N Points within Polyon:', nPointsWithin)
        const avgPriceWithinFeature = ((nPointsWithin1) + (2 * nPointsWithin2) + (3 * nPointsWithin3) + (4 * nPointsWithin4)) / nPointsWithin;
        // Get color based on rgb(238, 83, 83) main color
        const r = (238 * (avgPriceWithinFeature * 25)) / 100
        const g = (83 * (avgPriceWithinFeature * 25)) / 100
        const b = (83 * (avgPriceWithinFeature * 25)) / 100

        // console.log(f.geometry.coordinates[0][0])
        f.id = idx;
        const center_x = (f.geometry.coordinates[0][0][0] + f.geometry.coordinates[0][3][0]) / 2
        const center_y =(f.geometry.coordinates[0][0][1] + f.geometry.coordinates[0][3][1]) / 2

        f.properties = { 
          x: center_x,
          y: center_y,
          coordinates: f.geometry.coordinates,
          avgPriceWithinFeature: avgPriceWithinFeature, 
          height: avgPriceWithinFeature * 1000,
          color: `rgb(${r}, ${g}, ${b})`
        };        
      } else {
        f.properties = { 
          id: idx,
          height: 0,
          color: 'rgba(0,0,0,0)'
        };
      }
    });

    map.current.on('load', async () => {
      const selectedHexLayer = map.current.getLayer('selected-hexagon');
      const selectedAreaSrc = map.current.getSource('selected-area');
      if(selectedAreaSrc)
        map.current.removeSource('selected-area');
      if(selectedHexLayer)
        map.current.removeLayer('selected-hexagon');
      if(map.current.getLayer('grid-extrusion')){
        const visibility = map.current.getLayoutProperty('grid-extrusion', 'visibility');
        if (visibility === 'visible') {
          setZoomed(true)
        } else {
          setZoomed(false)
        }
      } else {
        setZoomed(false)
      }

      const { lng, lat } = map.current.getCenter();
      // console.log('On Load -- Center: ', map.current.getCenter());

      // Plot geoJSON points from market_data
      map.current.addLayer({
        'id': 'businesses-layer-1',
        'type': 'circle',
        'source': {
            'type': 'geojson',
            'data': businesses
        },
        'layout': {},
        'paint': {
          'circle-radius': 4,
          'circle-stroke-width': 2,
          'circle-color': 'red',
          'circle-stroke-color': 'white',
          'circle-stroke-opacity': {
            stops: [[12.5, 0], [15, 1]]
          },
          'circle-opacity': {
            stops: [[12.5, 0], [15, 1]]
          }
        }
      });
      map.current.addLayer({
        'id': 'businesses-layer-2',
        'type': 'circle',
        'source': {
            'type': 'geojson',
            'data': businesses2
        },
        'layout': {},
        'paint': {
          'circle-radius': 4,
          'circle-stroke-width': 2,
          'circle-color': 'blue',
          'circle-stroke-color': 'white',
          'circle-stroke-opacity': {
            stops: [[12.5, 0], [15, 1]]
          },
          'circle-opacity': {
            stops: [[12.5, 0], [15, 1]]
          }
        }
      });
      map.current.addLayer({
        'id': 'businesses-layer-3',
        'type': 'circle',
        'source': {
            'type': 'geojson',
            'data': businesses3
        },
        'layout': {},
        'paint': {
          'circle-radius': 4,
          'circle-stroke-width': 2,
          'circle-color': 'green',
          'circle-stroke-color': 'white',
          'circle-stroke-opacity': {
            stops: [[12.5, 0], [15, 1]]
          },
          'circle-opacity': {
            stops: [[12.5, 0], [15, 1]]
          }
        }
      });
    map.current.addLayer({
        'id': 'businesses-layer-4',
        'type': 'circle',
        'source': {
            'type': 'geojson',
            'data': businesses4
        },
        'layout': {},
        'paint': {
          'circle-radius': 4,
          'circle-stroke-width': 2,
          'circle-color': 'orange',
          'circle-stroke-color': 'white',
          'circle-stroke-opacity': {
            stops: [[12.5, 0], [15, 1]]
          },
          'circle-opacity': {
            stops: [[12.5, 0], [15, 1]]
          }
        }
      });
    // Give height to hex grid
    map.current.addLayer({
        'id': 'grid-extrusion',
        'type': 'fill-extrusion',
        'source': {
          'type': 'geojson',
          'data': hexGrid
        },
        'layout': {
          // Make the layer visible by default.
          'visibility': 'visible'
        },
        'paint' : {
          // Get the `fill-extrusion-color` from the source `color` property.
          // 'fill-extrusion-color': ["get", "color"],
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#66b2ff',
            ["get", "color"]
          ],
          // Get `fill-extrusion-height` from the source `height` property.
          'fill-extrusion-height': ["get", "height"],
          // Get `fill-extrusion-base` from the source `base_height` property.
          'fill-extrusion-base': 0,
          // Make extrusions slightly opaque to see through indoor walls.
          'fill-extrusion-opacity': 0.5
        }
      })
      // // Create a popup, but don't add it to the map yet.
      let hoveredStateId = null;
      const popup = new mapboxgl.Popup({
        className: styles["popup"],
        closeButton: false,
        closeOnClick: false
      });

      map.current.on('mousemove', ['businesses-layer-1', 'businesses-layer-2','businesses-layer-3','businesses-layer-4',], (e) => {
        console.log('MouseEnter Point: ', e.features[0])
        console.log('MouseEnter Point: ', e.features[0].geometry.coordinates)
        map.current.getCanvas().style.cursor = 'pointer';
        const name = e.features[0].properties.name
        const score = e.features[0].properties.score
        const address = e.features[0].properties.address
        const text = `<div><h4>${name}</h4><p>Price: $ ${score}/4 $</p><p>Address: ${address}</p></div>`
        popup.setLngLat(e.features[0].geometry.coordinates)
            .setHTML(text)
            .addTo(map.current);
      })
      
      map.current.on('mouseleave', ['businesses-layer-1', 'businesses-layer-2','businesses-layer-3','businesses-layer-4',], (e) => {
        map.current.getCanvas().style.cursor = '';
        popup.remove();
        hoveredStateId = null;
      })

      map.current.on('mouseleave', 'grid-extrusion', (e) => {
        console.log('leftefasdfv')
      })

      map.current.on('mousemove', 'grid-extrusion', (e) => {
        if(e.features.length > 0){
          if (hoveredStateId) {
            map.current.removeFeatureState({
              source: 'grid-extrusion',
              id: hoveredStateId
            });
          }
          if(e.features[0].properties.height > 0 && e.features[0].layer.id === 'grid-extrusion'){
            // const features = map.current.queryRenderedFeatures(e.point);
            console.log(e.features[0])
            map.current.getCanvas().style.cursor = 'pointer';
            const height = e.features[0].properties.height;
            const avgPriceWithinFeature = e.features[0].properties.avgPriceWithinFeature;
            const id = e.features[0].id;
            hoveredStateId = e.features[0].id;
            const text = `<div><p>Average Cost:</p><p>$ ${avgPriceWithinFeature}/4 $</p></div>`
            
            map.current.setFeatureState({
              source: 'grid-extrusion',
              id: hoveredStateId
            }, { hover: true })

            popup.setLngLat(e.lngLat)
            .setHTML(text)
            .addTo(map.current);
          } else {
            map.current.getCanvas().style.cursor = '';
            popup.remove();
            if (hoveredStateId) {
              map.current.removeFeatureState({
                source: 'grid-extrusion',
                id: hoveredStateId
              });
            }
            hoveredStateId = null;
          }
        } 
      }); 
    });

    map.current.on('click', 'grid-extrusion', (e) => {
      if(e.features.length > 0){
        if(e.features[0].properties.height > 0){
          setZoomed(true);
          console.log('Clicked on polygon:', e.features[0].id)
          console.log('Clicked on polygon:', e.features[0].geometry.coordinates)
          console.log('Clicked on polygon:', e.features[0])
          const target = {
            center: [e.features[0].properties.x, e.features[0].properties.y],
            zoom: 15,
            bearing: 45,
            pitch: 0
          };
          // Hide grid-extrusion layer
          if (map.current.getLayer('grid-extrusion')) {
            const visibility = map.current.getLayoutProperty('grid-extrusion', 'visibility');
            // console.log('Visibility: ',visibility )
            if (visibility === 'visible') {
              map.current.setLayoutProperty('grid-extrusion', 'visibility', 'none');
              e.features[0].className = '';
            } else {
              e.features[0].className = 'active';
              map.current.setLayoutProperty(
                'grid-extrusion',
                'visibility',
                'visible'
              );
            }
          }
          // Highlight the selected hexagon
          map.current.addSource('selected-area', {
            'type': 'geojson',
            'data' : {
              'type' : 'Feature',
              'geometry': {
                'type': 'Polygon',
                'coordinates': e.features[0].geometry.coordinates
              } 
            }
          })
          map.current.addLayer({
            'id': 'selected-hexagon',
            'type':'fill',
            'source' : 'selected-area',
            'layout': {},
            'paint': {
              'fill-color': '#0080ff', // blue color fill
              'fill-opacity': 0.2
            }
          })
          

          map.current.flyTo({
            ...target, // Fly to the selected target
            duration: 4000, // Animate over x seconds
            essential: true // This animation is considered essential with
                            //respect to prefers-reduced-motion
          });
        }
      }
    })

    // Listen for the `result` event from the Geocoder // `result` event is triggered when a user makes a selection
    //  Add a marker at the result's coordinates
    geocoder.on('result', ({ result }) => {
      // console.log(result);
      console.log('New Location! Setting center: ', result.center[0], result.center[1])
      setCenter([result.center[0], result.center[1]]);
    });

  }, [])

  useEffect(() => {
    console.log(`Center has been updated to: ${center} ! Time to fetch new data.`)

    const updateData = async() => {
      await getData();
      console.log('businesses: ', businesses)
      console.log('businesses2: ', businesses2)
      console.log('businesses3: ', businesses3)
      console.log('businesses4: ', businesses4)
    }
    // Fetch businesses & convert responses to geoJSON object
    // updateData();

  }, [center])

  // Zoom back out of overview to init
  const backToOverview = () => {
    const start = {
      center: center,
      zoom: 12,
      pitch: 45,
      bearing: 20,
    }
    map.current.flyTo({
      ...start, // Fly to the selected target
      duration: 4000, // Animate over x seconds
      essential: true // This animation is considered essential with
                      //respect to prefers-reduced-motion
    });
    setZoomed(false);
    const visibility = map.current.getLayoutProperty(
      'grid-extrusion',
      'visibility'
    );
    // console.log('Visibility: ',visibility )
    if (visibility === 'visible') {
      map.current.setLayoutProperty('grid-extrusion', 'visibility', 'none');
    } else {
      map.current.setLayoutProperty(
        'grid-extrusion',
        'visibility',
        'visible'
      );
    }
    map.current.removeLayer('selected-hexagon')
    map.current.removeSource('selected-area')
  }

  return (
    <main className={styles["container"]}>
      <div className={styles["menu-container"]}>
        <h1 className={styles["title"]}>Rent Prices in Denver</h1>
        <p className={styles["description"]}>
          {`What parts of Denver have the highest rent prices? Data source: `}
          <a href='https://www.zillow.com/research/data/' target='blank' rel='norefferer'>{`Zillow`}</a>
        </p>
      </div>
      <div className={styles["map-container"]} ref={mapContainer}/>
      <button onClick={backToOverview} className={styles["zoomOut"]} style={ 
        zoomed ? { visibility: 'visible'} : null
      }>Back to Overview</button>
      <div className={styles["help"]}>Right click and drag to rotate</div>
    </main>
  )
}

export default Map