import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3'; 
import ReactDOM from 'react-dom'; 
import versor from 'versor'; 
import _ from 'lodash'; 
import * as topojson from 'topojson-client';
import { addDays, daySpacedDateRange, multiSampleRandomUniform } from "./util.js"; 
import './App.css';

/*
"A temporal geo-spatial visualization of artists' touring schedules" 

User configurable parameters: 

  focus + context temporal zones 
  geo-mode: 
    search by location + radius 
  artist-mode: 
    search locations for a collection of artists (must add artists individually)

*/

// world = d3.json("https://cdn.jsdelivr.net/npm/world-atlas@1/world/110m.json")
// borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b)

const config = {
  width: 500, 
  height: 500, 
  DOT_ANIMATE_DURATION: 250, 
  PATH_ANIMATE_DURATION: 500, 
  ARC_FILL_WIDTH: 4, 
  ARC_BORDER_RATIO: 1.5, 
  ARC_CAP: 'butt', 
  dotMaxSize: 5,  
  dotMinSize:.5, 
  sphere: ({ type: "Sphere" })
}

export default function App() {

  const canvasRef = useRef(null); 

  const [tilt, setTilt] = useState(20); 

  let {
    width, 
    height, 
    DOT_ANIMATE_DURATION, 
    PATH_ANIMATE_DURATION, 
    ARC_FILL_WIDTH, 
    ARC_BORDER_RATIO, 
    ARC_CAP, 
    dotMaxSize,  
    dotMinSize, 
    sphere
  } = config; 

  const [countries, setCountries] = useState([]); 
  const [world, setWorld] = useState(null); 
  const [land, setLand] = useState(null); 
  const [borders, setBorders] = useState(null); 
  const [countryNames, setCountryNames] = useState(null); 
  const [setupDataLoaded, setSetupDataLoaded] = useState(false); 
  const [existingArrowFillPaths, setExistingArrowFillPaths] = useState([]); 
  const [existingDots, setExistingDots] = useState([]); 
  const [zoomFactor, setZoomFactor] = useState(Math.min(width, height) / 2.5); 
  const [zoomInitialized, setZoomInitialized] = useState(false); 
  const [zoom, setZoom] = useState(null); 
  const [rendererInitialized, setRendererInitialized] = useState(false); 
  const [renderer, setRenderer] = useState(null); 

  let dotScale = d3.scaleLinear().domain([0,1]).range([dotMinSize, dotMaxSize]); 
  let globeToWindowFactor = Math.min(width, height) / 2.5;  
  let projection = d3.geoOrthographic()
                      .scale(globeToWindowFactor)
                      .fitExtent([[0, 0], [width, height]], sphere);

  

  function Renderer({ context, geoPath }) {

    const renderer = {

      backdrop: () => {
        /*
        Fill the canvas rendering context for the globe with a solid black backdrop 
        */ 
        context.fillStyle = '#000'; 
        context.fillRect(0, 0, width, height); 
        context.fill();
      }, 

      sphere: () => {
        /*
        Render the 3D sphere as a path  
        */
        context.beginPath(); 
        geoPath(sphere);
        context.strokeStyle = "#000";
        context.fillStyle = '#86c6e0';
        context.lineWidth = 1.5;
        context.fill();
        context.stroke();
      }, 

      land: () => {
        /*
        Render land on the sphere  
        */
        context.beginPath();
        geoPath(land);
        context.fillStyle = "#c2e2aa"; 
        context.fill();
      }, 

      borders: () => {
        /*
        Render country borders on the sphere 
        */ 
        context.beginPath();
        geoPath(borders);
        context.strokeStyle = "#fff";
        context.lineWidth = 0.5;
        context.stroke();
      }, 

      arc: (arc, fillColor, borderColor) => {
        /*
        Render artist touring paths on the sphere 
        */

        // Render path border 
        context.beginPath(); 
        geoPath(arc);  
        context.lineWidth = ARC_FILL_WIDTH * ARC_BORDER_RATIO; 
        context.lineCap = ARC_CAP; 
        context.strokeStyle = borderColor;  
        context.stroke();
        
        // Render path fill (on top of border)
        context.beginPath(); 
        geoPath(arc); 
        context.lineWidth = ARC_FILL_WIDTH; 
        context.lineCap = ARC_CAP; 
        context.strokeStyle = fillColor; 
        context.stroke();
      }


    }

    return renderer; 

  }

  // load external data 
  useEffect(() => {

      if (!setupDataLoaded) {

        console.log('loading external data'); 

        // Set flag to signify that data loading request has been initiated 
        setSetupDataLoaded(true); 

        // Load the data 
        (async function loadData() {
          const countriesDataUnpack = ({iso_n3, name_long}) => ([iso_n3, name_long]); 

          let [countryNames, world] = await Promise.all([
            new Map(await d3.tsv("https://cdn.jsdelivr.net/npm/world-atlas@1/world/110m.tsv", countriesDataUnpack)), 
            d3.json("https://cdn.jsdelivr.net/npm/world-atlas@1/world/110m.json")
          ]);

          const land = topojson.feature(world, world.objects.land); 
          const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
          const countries = topojson.feature(world, world.objects.countries).features; 
      
          setCountries(countries); 
          setWorld(world); 
          setLand(land); 
          setBorders(borders); 
          setCountryNames(countryNames); 

        })(); 
      }

  }, [setupDataLoaded]); 

  // Create the renderer after external data is loaded 
  useEffect(() => {

      if (setupDataLoaded) {

        const context = canvasRef.current.getContext("2d"); 
        const geoPath = d3.geoPath(projection, context);
        const renderer = Renderer({ context, geoPath }); 
  
        setRenderer(renderer); 
        setRendererInitialized(true);

      }

  }, [setupDataLoaded, renderer]); 

  useEffect(() => {

    if (!zoomInitialized && rendererInitialized) {

      let zoomed = () => { 
        let zoomFactor = d3.event.transform.translate(projection).k * globeToWindowFactor;
        projection.scale(zoomFactor);
        setZoomFactor(zoomFactor); 
        console.log(zoomFactor);

        // canvasRef.current.getContext("2d").clearRect(0, 0, width, height);
        // renderLifecycle();  
      }
    
      let zoomBounds = [.01, 100]; 
      let zoom = d3.zoom()
                    .scaleExtent(zoomBounds) 
                    .on("zoom", zoomed);

      d3.select(canvasRef.current).call(zoom); 
              
      setZoomInitialized(true); 
      setZoom(() => zoom); 

    }

  }, [zoomInitialized, rendererInitialized]);


  // Adjust view when user changes zoom level 
  useEffect(() => {
    if (zoomInitialized && rendererInitialized) {
      renderLifecycle(); 
      d3.select(canvasRef.current).call(zoom); 
      console.log(zoomFactor);
    }
  }, [zoomFactor]); 

  // Render all objects to the canvas in an appropriate sequence 
  let renderLifecycle = () => {
    renderer.backdrop(); 
    renderer.sphere(); 
    renderer.land(); 
    renderer.borders();
  }

  // Perform initial render 
  useEffect(() => {
    if (rendererInitialized) {
      console.log('performing initial render'); 
      renderLifecycle(); 
    }
  }, [rendererInitialized]);

  return <canvas ref={canvasRef} height={height} width={width}/>;

}

