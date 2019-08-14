/* 
    
- globe 
  - rotate camera to center view on geographic coordinate 
  - sliders to control
    - axial tilt
    - axial rotation
    - distance from viewport entry to surface of globe 
  
*/ 






const canvas = (() => {
     
  
       
    
    
    
    function renderArcs(arcs, colors) {
      let i = 0; 
      for (let arc of arcs) { 
        let color = colors[i++]; 
        renderArcPath(arc, color); 
      }
    }
    
    function renderWorld(doClear, doReturnDomNode) {
      if (doClear) {
        context.clearRect(0, 0, width, height);
      }
      renderBackdrop();
      render3dGlobe();
      renderLand(); 
      renderBorders(); 
      if (doReturnDomNode) {
        return context.canvas; 
      }
    }
    
    function refreshArtistPaths() {
      renderWorld(true, false); 
      renderExistingPaths(); 
      renderExistingPathDots(); 
    }
    
    function animateDotIntoExistence(dot, dotcolor) {
      return d3.transition()
          .duration(DOT_ANIMATE_DURATION)
          .tween("render", () => t => {
        
            refreshArtistPaths();  
  
            context.beginPath(),
            context.strokeStyle = "#000",
            context.fillStyle = dotcolor,
            path.pointRadius(dotScale(t))({type:"Point", coordinates: dot}),
            context.stroke(),
            context.fill();
          })
          .on("end", () => {
            // Add dot to existing collection once it has finished animating into existence 
            existingDots.push(dot); 
            existingDotColors.push(dotcolor);
          })
          .end();
    }
   
    async function renderArtistPath(countries, dates) {
      /*
      Render a touring path covering cities over time
      This is animated 
      */
          
      for (let i = 1; i < countries.length; i++) { 
        
        // At each iteration, we contruct an arrow from previous to current stop 
        // which encodes the corresponding artist and the date 
        let preLoc = names.get(countries[i-1].id); 
        let curLoc = names.get(countries[i].id);
        let curDate = dates[i]; 
        let curColor = dateToColor(curDate);
        
        // Compute the geometric centroids of the countries / cities 
        // we are moving between 
        let p1 = d3.geoCentroid(countries[i-1]); 
        let p2 = d3.geoCentroid(countries[i]);  
        let geoterp = d3.geoInterpolate(p1, p2);
             
        // Animate the new dot into existence 
        await animateDotIntoExistence(p1, curColor)
        
        let lastp = p1; 
              
        // Animate the formation of this arrow link 
        await d3.transition()
          .duration(PATH_ANIMATE_DURATION)
          .tween("render", () => t => {
          
            // Render the globe 
            renderWorld(true, false);
            renderExistingPaths(); 
          
            // Render the in progress paths 
            renderArcPath({type: "LineString", coordinates: [p1, lastp]}, curColor);
          
            // Render the new path extensions 
            let nextp = geoterp(t); 
            renderArcPath({type: "LineString", coordinates: [lastp, nextp]}, curColor);
          
            // Dots should be over top of existing paths so render after 
            renderExistingPathDots();
          
            // The current points become the previous points for the next iteration 
            lastp = nextp; 
          
          })
          .on('end', async () => {
            // Add the built path fill to the existing collection
            existingArrowFillPaths.push({type: "LineString", coordinates: [p1, p2]});
            existingArrowFillPathColors.push(curColor); 
  
            // Add the final destination dot 
            if (i === countries.length - 1) {
              await animateDotIntoExistence(p2, curColor);
            }
          
          })
          .end(); 
        
        renderExistingPathDots(); 
        
      }
      
    }
    
    let pathCountries = [countries[47], 
                         countries[93], 
                         countries[162], 
                         countries[32], 
                         countries[0]];
    
    let pathDates = [new Date("06/22/1997"), 
                     new Date("06/28/1997"), 
                     new Date("06/30/1997"),
                     new Date("07/3/1997"),
                     new Date("07/18/1997")]; 
    
    // DRAGGING
    
    let v0 = 0; // Mouse position in Cartesian coordinates at start of drag gesture.
    let r0 = 0; // Projection rotation as Euler angles at start.
    let q0 = 0; // Projection rotation as versor at start.
  
    function dragstarted() {
      v0 = versor.cartesian(projection.invert(d3.mouse(this)));
      r0 = projection.rotate();
      q0 = versor(r0);
    }
  
    function dragged() {
      let v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(this))),
          q1 = versor.multiply(q0, versor.delta(v0, v1)),
          r1 = versor.rotation(q1);
      projection.rotate(r1);
      for (let i = 0; i < spaceLayerDepth; i++) spaceProjections[i].rotate(r1);
      refreshArtistPaths(); 
    }
    
    d3.select(context.canvas).call(d3.drag()
                        .on("start", dragstarted)
                        .on("drag", dragged));
    
    // ZOOMING
    
    function zoomed() { 
      zoomScale = d3.event.transform.translate(projection).k * globeToWindowFactor;
      projection.scale(zoomScale);
      for (let i = 0; i < spaceLayerDepth; i++) spaceProjections[i].scale(zoomScale);
      refreshArtistPaths(); 
    }
  
    let zoomBounds = [.01, 100]; 
    let zoom = d3.zoom()
      .scaleExtent(zoomBounds) 
      .on("zoom", zoomed);
    
    d3.select(context.canvas).call(zoom); 
    
    let discreteDayRange = daySpacedDateRange(pathDates[0], pathDates[pathDates.length-1]);
    dateToColor.domain(discreteDayRange);
    
    renderArtistPath(pathCountries, pathDates);
    
    return context.canvas;
  
})(); 

