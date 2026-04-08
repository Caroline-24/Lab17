// Set dimensions
const width = 700;
const height = 700;

// Load CSV
d3.csv("train.csv").then(data => {

  // Remove any empty track rows
  data = data.filter(d => d["track_name"]);

  // Build hierarchy: Genre -> Artist
  const hierarchyData = { name: "Spotify", children: [] };
  const genreMap = d3.group(data, d => d.track_genre);

  genreMap.forEach((genreTracks, genre) => {
    const genreNode = { name: genre, children: [] };

    const artistMap = d3.group(genreTracks, d => d.artists);

    // Compute average popularity for artists
let artistArray = Array.from(artistMap, ([artist, tracks]) => ({
  name: artist,
  value: d3.mean(tracks, d => +d.popularity)
}));

// Sort descending by popularity
artistArray.sort((a, b) => b.value - a.value);

// Initially, show top 10 only for the 'All Genres' view
genreNode.children = artistArray.slice(0, 10); 
hierarchyData.children.push(genreNode);
  });

  // Create initial circle packing layout
  let root = d3.pack()
    .size([width - 2, height - 2])
    .padding(3)(
      d3.hierarchy(hierarchyData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value)
    );

  // SVG
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Draw nodes function
  function drawNodes(rootData) {
    const nodes = svg.selectAll("g")
      .data(rootData.descendants(), d => d.data.name);

    nodes.exit().remove();

    const nodesEnter = nodes.enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodesEnter.append("circle")
      .attr("r", d => d.r)
      .attr("fill", d => {
        if (d.depth === 0) return "#ffffff";
        if (d.depth === 1) return color(d.data.name);
        if (d.depth === 2) return d3.color(color(d.parent.data.name)).brighter(0.8);
      })
      .attr("stroke", "#000");

    const merged = nodes.merge(nodesEnter);

    merged.transition()
      .duration(500)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    merged.select("circle")
      .transition()
      .duration(500)
      .attr("r", d => d.r);

    // Tooltip
    merged.on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.95);

      let genreName = d.depth === 0 ? "" : (d.depth === 1 ? d.data.name : d.parent.data.name);
      let artistName = d.depth === 2 ? d.data.name : "";
      let popularity = d.depth === 2 ? `Popularity: ${d.value.toFixed(1)}` : "";

      tooltip.html(`
        <div style="font-size:16px; font-weight:bold;">${genreName}</div>
        ${artistName ? `<div style="font-size:14px;">${artistName}</div>` : ""}
        ${popularity ? `<div style="font-size:12px; color:gray;">${popularity}</div>` : ""}
      `);

      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(300).style("opacity", 0);
    });
  }

  drawNodes(root);

  // Populate dropdown with genres
  const select = d3.select("#genre-select");
  const genres = Array.from(genreMap.keys());

  select.selectAll("option.genre-option")
    .data(genres)
    .join("option")
    .attr("value", d => d)
    .attr("class", "genre-option")
    .text(d => d);

select.on("change", () => {
  const selected = select.node().value;

  let filteredData;
  if (selected === "all") {
    // Show top 10 for each genre
    filteredData = {
      name: "Spotify",
      children: hierarchyData.children
    };
  } else {
    // Show ALL artists for the selected genre
    const fullGenreTracks = genreMap.get(selected);

    const artistMap = d3.group(fullGenreTracks, d => d.artists);

    const allArtists = Array.from(artistMap, ([artist, tracks]) => ({
      name: artist,
      value: d3.mean(tracks, d => +d.popularity)
    }));

    filteredData = {
      name: "Spotify",
      children: [
        { name: selected, children: allArtists.sort((a, b) => b.value - a.value) }
      ]
    };
  }

  const newRoot = d3.pack()
    .size([width - 2, height - 2])
    .padding(3)(
      d3.hierarchy(filteredData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value)
    );

  drawNodes(newRoot);
});

});