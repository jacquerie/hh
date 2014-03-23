// Set up SVG for D3.
var width = 1140,
    height = 712.5,
    colors = d3.scale.category10();

var svg = d3.select(".main")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Set up initial nodes.
var nodes = [
      { id: 0, targetDegree: 3, currentDegree: 0 },
      { id: 1, targetDegree: 3, currentDegree: 0 },
      { id: 2, targetDegree: 3, currentDegree: 0 },
      { id: 3, targetDegree: 3, currentDegree: 0 },
      { id: 4, targetDegree: 3, currentDegree: 0 },
      { id: 5, targetDegree: 3, currentDegree: 0 },
      { id: 6, targetDegree: 3, currentDegree: 0 },
      { id: 7, targetDegree: 3, currentDegree: 0 },
      { id: 8, targetDegree: 3, currentDegree: 0 },
      { id: 9, targetDegree: 3, currentDegree: 0 }
    ],
    links = [];

// Init D3 force layout.
var force = d3.layout.force()
  .nodes(nodes)
  .links(links)
  .size([width, height])
  .linkDistance(150)
  .charge(-500)
  .on("tick", tick)

// Line displayed when dragging the pointer.
var drag_line = svg.append("svg:path")
  .attr("class", "link dragline hidden")
  .attr("d", "M0,0L0,0");

// Handles to link and node element groups.
var path = svg.append("svg:g").selectAll("path"),
    circle = svg.append("svg:g").selectAll("g");

// Mouse event vars.
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars () {
  mousedown_link = null;
  mousedown_node = null;
  mouseup_node = null;
}

// Update force layout (called automatically every iteration).
function tick () {
  path.attr("d", function (d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / distance,
        normY = deltaY / distance,
        padding = 12,
        sourceX = d.source.x + (padding * normX),
        sourceY = d.source.y + (padding * normY),
        targetX = d.target.x - (padding * normX),
        targetY = d.target.y - (padding * normY);
    return "M" + sourceX + "," + sourceY + "L" + targetX + "," + targetY;
  });

  circle.attr("transform", function (d) {
    return "translate(" + d.x + "," + d.y + ")";
  });
}

function restart () {
  // Path (link) group.
  path = path.data(links);

  // Update existing links.
  path.classed("selected", function (d) { return d === selected_link; });

  // Add new links.
  path.enter().append("svg:path")
    .attr("class", "link")
    .classed("selected", function (d) { return d === selected_link; })
    .on("mousedown", function (d) {
      mousedown_link = d;
      selected_node = null;

      // Toggle selection of this link.
      if (mousedown_link === selected_link) {
        selected_link = null;
      } else {
        selected_link = mousedown_link;
      }

      restart();
    })

  // Remove old links.
  path.exit().remove();


  // Circle (node) group.
  circle = circle.data(nodes, function (d) { return d.id; });

  // Update existing nodes.
  circle.selectAll("circle")
    .attr("r", function (d) { return 12 * Math.sqrt(d.targetDegree - d.currentDegree + 1); })
    .style("fill", function (d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); });

  // Update existing labels.
  circle.selectAll("text")
    .text(function (d) { return d.targetDegree - d.currentDegree; });

  // Add new nodes.
  var g = circle.enter().append("svg:g");

  g.append("svg:circle")
    .attr("class", "node")
    .attr("r", function (d) { return 12 * Math.sqrt(d.targetDegree - d.currentDegree + 1); })
    .style("fill", function (d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style("stroke", function (d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .on("mouseover", function (d) {
      if (!mousedown_node || d === mousedown_node) return;
      
      // Enlarge target node.
      d3.select(this).attr("transform", "scale(1.1)");
    })
    .on("mouseout", function (d) {
      if (!mousedown_node || d === mousedown_node) return;
      
      // Unenlarge target node.
      d3.select(this).attr("transform", "");
    })
    .on("mousedown", function (d) {
      mousedown_node = d;
      selected_link = null;
      
      // Toggle selection of this node.
      if (mousedown_node === selected_node) {
        selected_node = null;
      } else {
        selected_node = mousedown_node;
      }
      
      // Reposition drag line.
      drag_line
        .classed("hidden", false)
        .attr("d", "M" + mousedown_node.x + "," + mousedown_node.y + "L" + mousedown_node.x + "," + mousedown_node.y);
        
      restart();
    })
    .on("mouseup", function (d) {
      if (!mousedown_node) return;

      // Check for drag-to-self.
      mouseup_node = d;
      if (mouseup_node === mousedown_node) {
        resetMouseVars();
        return;
      }
      
      // Unenlarge target node.
      d3.select(this).attr("transform", "");

      // Add link to graph. Ensure that source is always less than target so
      // that we add each link only once.
      var source, target;
      if (mousedown_node.id < mouseup_node.id) {
        source = mousedown_node;
        target = mouseup_node;
      } else {
        source = mouseup_node;
        target = mousedown_node;
      }
      
      var link;
      link = links.filter(function (l) {
        return (l.source === source && l.target === target);
      })[0];

      if (!link) {
        if ((source.currentDegree < source.targetDegree) &&
            (target.currentDegree < target.targetDegree)) {
          source.currentDegree++; target.currentDegree++;
          link = { source: source, target: target };
          links.push(link);
        }
      }
      
      // Select new link.
      selected_link = link;
      selected_node = null;
      
      restart();
    });

  // Add degree labels.
  g.append("svg:text")
    .attr("x", 0)
    .attr("y", 6)
    .attr("class", "degree")
    .text(function (d) { return d.targetDegree - d.currentDegree; });

  // Remove old nodes.
  circle.exit().remove();

  // Set the graph in motion.
  force.start();
}

function mousemove () {
  if (!mousedown_node) return;
  
  // Update drag line.
  drag_line.attr("d", "M" + mousedown_node.x + "," + mousedown_node.y + "L" + d3.mouse(this)[0] + "," + d3.mouse(this)[1]);
  restart();
}

function mouseup () {
  if (mousedown_node) {
    // Hide drag line.
    drag_line
      .classed("hidden", true)
  }

  resetMouseVars();
}

// Acts as a lock to respond once per keydown.
var lastKeyDown = -1;

function keydown () {
  d3.event.preventDefault();

  if (lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  if (!selected_link) return;
  switch (lastKeyDown) {
    case 8:  // backspace
    case 46: // delete
      var link = links.splice(links.indexOf(selected_link), 1)[0];
      link.source.currentDegree--; link.target.currentDegree--;

      selected_link = null;
      restart();
      break;
  }
}

// Releases the lock.
function keyup () {
  lastKeyDown = -1;
}

// App starts here.
svg.on("mousemove", mousemove)
  .on("mouseup", mouseup)
d3.select(window)
  .on("keydown", keydown)
  .on("keyup", keyup)
restart();
