// Set up SVG for D3.
var width = 600,
    height = 400,
    colors = d3.scale.category10();

var svg = d3.select(".main")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Set up initial nodes.
var numNodes = 2;
    lastNodeId = 0;

function initDegrees (numNodes) {
  var i, degrees = [];

  for (i = 0; i < numNodes; i++) {
    degrees[i] = Math.floor(Math.random() * (numNodes - 1)) + 1;
  }

  return degrees;
}

function havelHakimi (degrees) {
  var i, max, newDegrees = degrees.slice();

  var numBig = newDegrees.filter(function (d) {
    return d >= newDegrees.length;
  }).length;

  var numOdd = newDegrees.filter(function (d) {
    return d % 2 === 1;
  }).length;

  var numNeg = newDegrees.filter(function (d) {
    return d < 0;
  }).length;

  if ((numBig > 0) || (numOdd % 2 === 1) || (numNeg > 0)) {
    return false;
  }

  var numZero = newDegrees.filter(function (d) {
    d === 0;
  }).length;

  if (numZero === newDegrees.length) {
    return true;
  } else {
    newDegrees.sort().reverse();
    max = newDegrees.shift();
  
    for (i = 0; i < max; i++) {
      newDegrees[i]--;
    }
  
    return havelHakimi(newDegrees);
  }
}

function initNodes (numNodes) {
  var i, degrees, nodes = [];

  degrees = initDegrees(numNodes);
  while (!havelHakimi(degrees)) {
    degrees = initDegrees(numNodes);
  }

  for (i = 0; i < numNodes; i++) {
    nodes.push({
      id: lastNodeId++,
      targetDegree: degrees[i],
      currentDegree: 0
    });
  }

  return nodes;
}

function resetLinks () {
  return [];
}

var nodes = initNodes(numNodes);
    links = resetLinks();

// Init D3 force layout.
function initForce () {
  return d3.layout.force()
           .nodes(nodes)
           .links(links)
           .size([width, height])
           .linkDistance(150)
           .charge(-500)
           .on("tick", tick);
}

var force = initForce();

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

// Transforms a touch event into a corresponding mouse event.
// From: http://stackoverflow.com/a/1781750/374865
function touchHandler (event) {
  var touches = event.changedTouches,
      first = touches[0],
      type = "";

  switch (event.type) {
    case "touchstart":
      type = "mousedown";
      break;
    case "touchmove":
      type = "mousemove";
      break;
    case "touchend":
      type = "mouseup";
      break;
    default:
      return;
  }

  var simulatedEvent = document.createEvent("MouseEvent");
  simulatedEvent.initMouseEvent(type, true, true, window, 1,
                                first.screenX, first.screenY,
                                first.clientX, first.clientY, false,
                                false, false, false, 0, null);

  event.preventDefault();
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

      // Check win condition.
      var win;
      win = nodes.filter(function (n) {
        return (n.currentDegree !== n.targetDegree);
      }).length;

      if (win === 0) {
        if (numNodes == 10) {
          alert("Congratulations! You solved this puzzle. I'm looking for internships in 2014. Like what you see? Email me at jacopo.notarstefano [at] gmail.com");
        }

        nodes = initNodes(++numNodes);
        links = resetLinks();
        force = initForce();
      }

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
  .on("touchstart", touchHandler)
  .on("touchmove", touchHandler)
  .on("touchend", touchHandler);
d3.select(window)
  .on("keydown", keydown)
  .on("keyup", keyup);
restart();
